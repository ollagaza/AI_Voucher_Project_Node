import DBMySQL from '../../database/knex-mysql'
import OperationCommentModel from '../../database/mysql/operation/OperationCommentModel'
import Util from '../../utils/Util'
import StdObject from '../../wrapper/std-object'
import ServiceConfig from '../../service/service-config'
import striptags from 'striptags'
import log from '../../libs/logger'
import { OperationClipModel } from '../../database/mongodb/OperationClip'
import GroupAlarmService from '../group/GroupAlarmService'
// import GroupService from '../group/GroupService'
import Constants from '../../constants/constants'
import OperationDataService from "./OperationDataService";

const OperationCommentServiceClass = class {
  constructor () {
    this.log_prefix = '[OperationCommentService]'
  }

  getOperationCommentModel = (database = null) => {
    if (database) {
      return new OperationCommentModel(database)
    }
    return new OperationCommentModel(DBMySQL)
  }

  createComment = async (database, member_info, operation_info, operation_data_seq, request_body) => {
    if (!member_info || !request_body || !operation_info || !operation_data_seq || !request_body.comment) {
      throw new StdObject(-1, '잘못된 요청입니다', 400)
    }
    const comment_model = this.getOperationCommentModel(database)

    const writer_info = {
      user_name: member_info.user_name,
      user_nickname: member_info.user_nickname,
      hospname: member_info.hospname,
    }
    const parent_seq = request_body.parent_seq ? request_body.parent_seq : null
    const is_reply = request_body.is_reply === true ? 1 : 0
    const reply_user_info = is_reply ? JSON.stringify(request_body.reply_user_info) : null
    const comment = request_body.comment
    const clip_id = request_body.clip_id ? request_body.clip_id : null
    const clip_info = clip_id ? JSON.stringify(request_body.clip_info) : null

    const create_params = {
      operation_data_seq,
      parent_seq,
      is_reply,
      writer_info: JSON.stringify(writer_info),
      reply_user_info,
      member_seq: member_info.seq,
      user_name: member_info.user_name,
      user_nickname: member_info.user_nickname,
      comment_html: comment,
      comment_text: striptags(comment),
      clip_id,
      clip_info,
      like_user_map: JSON.stringify({})
    }

    const comment_seq = await comment_model.createComment(operation_data_seq, create_params)

    await OperationDataService.increaseOperationCommentCount(database, operation_info)
    // GroupService.onChangeGroupMemberContentCount(group_member_info.group_seq, member_info.seq, 'vid_comment', Constants.UP);

    if (is_reply && parent_seq) {
      await comment_model.updateReplyCount(operation_data_seq, parent_seq)
    }

    const comment_clip_id = request_body.comment_clip_id ? request_body.comment_clip_id : null
    const clip_comment_count = await this.updateClipCommentCount(database, operation_data_seq, comment_clip_id)

    const alarm_data = {
      operation_seq: operation_info.seq,
      comment_seq,
      member_seq: member_info.seq,
    }
    const name = member_info.user_name
    const alarm_message = `'${name}'님이 '${operation_info.operation_name}'수술에 댓글을 작성하였습니다.`
    const socket_message = {
      title: `'${operation_info.operation_name}' 수술에 댓글을 추가되었습니다.`,
      message: `${name}님이 '${operation_info.operation_name}' 수술에 댓글을 작성하였습니다.<br/>확인하려면 클릭하세요.`
    }
    const socket_data = {
      comment_seq,
      parent_seq,
      comment_clip_id,
      clip_comment_count,
      member_seq: member_info.seq,
      message: `${name}님이 댓글을 작성하였습니다.`
    }
    GroupAlarmService.createOperationGroupAlarm(member_info.seq, GroupAlarmService.ALARM_TYPE_COMMENT, alarm_message, operation_info, member_info, alarm_data, socket_message, socket_data)

    return {
      comment_seq,
      comment_clip_id,
      clip_comment_count
    }
  }

  changeComment = async (database, operation_data_seq, comment_seq, request_body) => {
    if (!comment_seq || !operation_data_seq || !request_body || !request_body.comment) {
      throw new StdObject(-1, '잘못된 요청입니다', 400)
    }
    const comment = request_body.comment

    const comment_model = this.getOperationCommentModel(database)
    return await comment_model.changeComment(operation_data_seq, comment_seq, comment)
  }

  deleteComment = async (operation_seq, operation_data_seq, comment_seq, request_body) => {
    if (!operation_data_seq || !comment_seq) {
      throw new StdObject(-1, '잘못된 요청입니다', 400)
    }
    const comment_model = this.getOperationCommentModel(DBMySQL)
    const comment_info = await comment_model.getComment(operation_data_seq, comment_seq)
    if (!comment_info) {
      throw new StdObject(-2, '이미 삭제된 댓글입니다.', 400)
    }
    const group_seq = comment_info.group_seq
    const comment_count_map = {}
    comment_count_map[comment_info.member_seq] = 1

    const parent_seq = request_body ? request_body.parent_seq : null
    const is_reply = request_body ? request_body.is_reply === true : false
    if (!is_reply) {
      const child_comment_count = await comment_model.getChildCommentCountGroupByMemberSeq(comment_seq)
      if (child_comment_count) {
        for (let i = 0; i < child_comment_count.length; i++) {
          const member_seq = child_comment_count[i].member_seq
          const comment_count = child_comment_count[i].comment_count
          if (comment_count_map[member_seq]) {
            comment_count_map[member_seq] += comment_count
          } else {
            comment_count_map[member_seq] = comment_count
          }
        }
      }
    }

    let delete_result = null
    let clip_comment_count = null;
    await DBMySQL.transaction(async (transaction) => {
      const comment_model = this.getOperationCommentModel(transaction)
      delete_result = await comment_model.deleteComment(operation_data_seq, comment_seq)
      if (is_reply && parent_seq) {
        await comment_model.updateReplyCount(operation_data_seq, parent_seq)
      }
    })

    const comment_clip_id = request_body.comment_clip_id ? request_body.comment_clip_id : null
    if (comment_clip_id) {
      clip_comment_count = await this.updateClipCommentCount(DBMySQL, operation_data_seq, comment_clip_id)
    }

    Object.keys(comment_count_map).forEach((member_seq) => {
      if (comment_count_map[member_seq] > 0) {
        // GroupService.onChangeGroupMemberContentCount(group_seq, member_seq, 'vid_comment', Constants.DOWN, comment_count_map[member_seq])
        OperationDataService.decreaseOperationCommentCount(DBMySQL, { group_seq, seq: operation_seq })
      }
    })

    return {
      delete_result,
      comment_clip_id,
      clip_comment_count
    }
  }

  changeClipInfo = async (clip_id, clip_info) => {
    const comment_model = this.getOperationCommentModel()
    return await comment_model.changeClipInfo(clip_id, clip_info)
  }

  deleteClipInfo = async (clip_id) => {
    const comment_model = this.getOperationCommentModel()
    return await comment_model.setDeleteClip(clip_id)
  }

  getCommentList = async (database, operation_data_seq, request_params) => {
    if (!operation_data_seq) {
      throw new StdObject(-1, '잘못된 요청입니다', 400)
    }
    const parent_seq = request_params ? Util.parseInt(request_params.parent_seq, null) : null
    const start = request_params ? Util.parseInt(request_params.start, 0) : 0
    const limit = request_params ? Util.parseInt(request_params.limit, 20) : 20
    const column = request_params ? request_params.column : 'operation_comment.reg_date'
    const order = (request_params && request_params.order ? request_params.order : 'desc').toLowerCase()
    const by_index = request_params ? Util.isTrue(request_params.by_index) : false
    const comment_model = this.getOperationCommentModel(database)
    const result_list = await comment_model.getCommentList(operation_data_seq, parent_seq, start, limit, column, order, by_index)
    const comment_list = []
    if (result_list) {
      for (let i = 0; i < result_list.length; i++) {
        comment_list.push(this.getCommentInfo(result_list[i]))
      }
    }
    return comment_list
  }

  copyComment = async (operation_data_seq, origin_data_seq, group_seq) => {
    const comment_model = this.getOperationCommentModel()
    const origin_list = await comment_model.getOriginCommentList(origin_data_seq)
    if (origin_list && origin_list.length) {
      const change_seq_map = {}
      const member_seq_map = {}
      for (let i = 0; i < origin_list.length; i++) {
        const comment_info = origin_list[i]
        const member_seq = comment_info.member_seq
        if (comment_info.is_reply === 0) {
          await comment_model.copyParentComment(comment_info, operation_data_seq, group_seq, change_seq_map)
        } else {
          await comment_model.copyReplyComment(comment_info, operation_data_seq, group_seq, change_seq_map)
        }
        if (!member_seq_map[member_seq]) {
          member_seq_map[member_seq] = 0
        }
        member_seq_map[member_seq]++
      }
      const member_seq_list = Object.keys(member_seq_map)
      for (let i = 0; i < member_seq_list.length; i++) {
        const member_seq = member_seq_list[i]
        // GroupService.onChangeGroupMemberContentCount(group_seq, member_seq, 'vid_comment', Constants.UP, member_seq_map[member_seq])
      }
    }
  }

  getComment = async (database, operation_data_seq, comment_seq) => {
    if (!operation_data_seq || !comment_seq) {
      throw new StdObject(-1, '잘못된 요청입니다', 400)
    }
    const comment_model = this.getOperationCommentModel(database)
    return this.getCommentInfo(await comment_model.getComment(operation_data_seq, comment_seq))
  }

  getCommentInfo = (comment_info) => {
    if (comment_info.group_profile_image) {
      comment_info.group_profile_image = ServiceConfig.get('static_storage_prefix') + comment_info.group_profile_image
    }
    if (comment_info.member_profile_image) {
      comment_info.member_profile_image = ServiceConfig.get('static_storage_prefix') + comment_info.member_profile_image
    }
    if (comment_info.writer_info) {
      comment_info.writer_info = JSON.parse(comment_info.writer_info)
    }
    if (comment_info.reply_user_info) {
      comment_info.reply_user_info = JSON.parse(comment_info.reply_user_info)
    }
    if (comment_info.clip_info) {
      comment_info.clip_info = JSON.parse(comment_info.clip_info)
    }
    if (comment_info.like_user_map) {
      comment_info.like_user_map = JSON.parse(comment_info.like_user_map)
    }
    comment_info.is_clip_deleted = comment_info.is_clip_deleted === 1
    comment_info.is_reply = comment_info.is_reply === 1

    return comment_info
  }

  getCommentCount = async (database, operation_data_seq, parent_seq = null) => {
    if (!operation_data_seq) {
      throw new StdObject(-1, '잘못된 요청입니다', 400)
    }
    const comment_model = this.getOperationCommentModel(database)
    const comment_count = await comment_model.getCommentCount(operation_data_seq, parent_seq)
    return comment_count ? Util.parseInt(comment_count.total_count, 0) : 0
  }

  setCommentLike = async (database, comment_seq, is_like, member_info) => {
    const comment_model = this.getOperationCommentModel(database)
    const like_info = {
      is_like,
      user_name: member_info.user_name,
      user_nickname: member_info.user_nickname,
    }
    await comment_model.setCommentLike(comment_seq, member_info.seq, like_info)
    const count_result = await comment_model.getCommentLikeCount(comment_seq);
    return {
      like_count: count_result.like_count,
      like_info
    }
  }

  updateClipCommentCount = async (database, operation_data_seq, clip_id) => {
    if (!clip_id) return 0
    const comment_model = this.getOperationCommentModel(database)
    const comment_count = await comment_model.getClipCommentCount(operation_data_seq, clip_id)
    await OperationClipModel.updateCommentCount(clip_id, comment_count)
    return comment_count
  }

  deleteAllComment = async (databases, group_seq, member_seq) => {
    if (!group_seq || !member_seq) {
      throw new StdObject(-1, '잘못된 요청입니다', 400)
    }
    const comment_model = this.getOperationCommentModel(databases)
    const comment_list = await comment_model.getCommentListByGroupSeqMemberSeq(group_seq, member_seq);
    let res_data = 0;
    for (let i = 0; i < comment_list.length; i++) {
      const operation_data_seq = comment_list[i].operation_data_seq;
      const comment_seq = comment_list[i].seq;

      const delete_result = await comment_model.deleteComment(operation_data_seq, comment_seq)
      if (delete_result) {
        res_data++;
      }
      if (comment_list[i].parent_seq && comment_list[i].is_reply) {
        await comment_model.updateReplyCount(operation_data_seq, comment_list[i].parent_seq)
      }
      if (comment_list[i].clip_id) {
        await this.updateClipCommentCount(databases, operation_data_seq, comment_list[i].clip_id)
      }
    }
    return res_data;
  }

  getOperationCommentCounts = async () => {
    const operation_comment_model = this.getOperationCommentModel(DBMySQL)
    return operation_comment_model.getOperationCommentCounts()
  }
}

const operation_comment_service = new OperationCommentServiceClass()
export default operation_comment_service
