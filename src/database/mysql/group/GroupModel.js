import MySQLModel from '../../mysql-model'
import Util from '../../../utils/Util'
import GroupInfo from '../../../wrapper/member/GroupInfo'
import log from '../../../libs/logger'
import Constants from '../../../constants/constants'

export default class GroupModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'group_info'
    this.selectable_fields = ['*']
    this.log_prefix = '[GroupModel]'
    this.group_private_fields = ['member_seq', 'content_id', 'media_path', 'start_date', 'reg_date', 'modify_date']
    this.group_with_product_select = [
      'group_info.seq AS group_seq', 'group_info.group_type', 'group_info.status AS group_status', 'group_info.status AS domain',
      'group_info.profile', 'group_info.profile_image_path', 'group_info.search_keyword', 'group_info.group_explain',
      'group_info.group_name', 'group_info.expire_date AS group_expire_date', 'group_info.is_set_group_name',
      'group_info.storage_size AS group_max_storage_size', 'group_info.used_storage_size AS group_used_storage_size',
      'payment_list.name AS plan_name', 'payment_list.desc AS plan_desc', 'group_info.group_question', 'group_info.group_message', 'group_info.group_join_way',
      'group_info.member_count', 'group_info.channel_top_img_path',
      'group_counts.video_count', 'group_counts.file_count', 'group_counts.project_count', 'group_counts.anno_count', 'group_counts.note_count', 'group_counts.video_comment', 'group_counts.board_comment'
    ]
    this.group_user_list = [
      'group_info.seq AS group_seq', 'group_info.group_type', 'group_info.status AS group_status',
      'group_info.group_name', 'group_info.storage_size AS group_max_storage_size', 'group_info.used_storage_size AS group_used_storage_size',
      'member.seq AS member_seq', 'member.user_id', 'member.user_name', 'member.treatcode'
    ]
  }

  getParams = (group_info, is_set_modify_date = true, ignore_empty = true) => {
    log.debug(this.log_prefix, '[getParams]', group_info instanceof GroupInfo)
    if (!(group_info instanceof GroupInfo)) {
      group_info = new GroupInfo(group_info)
    }
    group_info.setIgnoreEmpty(ignore_empty)
    const params = group_info.toJSON()
    if (Util.isNumber(params.start_date)) {
      params.start_date = this.database.raw(`FROM_UNIXTIME(${params.start_date})`)
    }
    if (Util.isNumber(params.expire_date)) {
      params.expire_date = this.database.raw(`FROM_UNIXTIME(${params.expire_date})`)
    }
    if (is_set_modify_date) {
      params.modify_date = this.database.raw('NOW()')
    }
    return params
  }

  createGroup = async (group_info) => {
    const create_params = this.getParams(group_info)
    group_info.seq = await this.create(create_params, 'seq')
    if (!(group_info instanceof GroupInfo)) {
      return new GroupInfo(group_info)
    }
    group_info.addKey('seq')
    return group_info
  }

  updateGroup = async (group_info, seq) => {
    const filter = {
      seq: seq
    }
    const update_params = this.getParams(group_info)
    return await this.update(filter, update_params)
  }

  getGroupInfoAllByGroup = async () => {
    const filter = {
      group_type: 'G',
    }
    return await this.find(filter)
  }

  getAllGroupInfo = async () => {
    return this.database
      .select(this.selectable_fields)
      .from(this.table_name)
      .where('status', 'Y')
      .orWhere('status', 'F')
  }

  getGroupInfo = async (group_seq, private_keys = null) => {
    const filter = {
      seq: group_seq
    }
    const query_result = await this.findOne(filter)
    const group_info = new GroupInfo(query_result, private_keys ? private_keys : this.group_private_fields);
    group_info.addKey('channel_top_img_url')
    group_info.addKey('profile_image_url')
    group_info.addKey('group_image_url')
    return group_info;
  }
  getGroupSeqByDomain = async (domain) => {
    return this.findOne({ domain }, ['seq'])
  }

  getMemberSeqbyPersonalGroupInfo = async (member_seq, private_keys = null) => {
    const filter = {
      member_seq: member_seq,
      group_type: 'P',
    }
    const query_result = await this.findOne(filter)
    return new GroupInfo(query_result, private_keys ? private_keys : this.group_private_fields)
  }

  getMemberGroupInfoAll = async (member_seq, private_keys = null) => {
    const filter = {
      member_seq: member_seq
    }
    const query_result = await this.find(filter)
    return new GroupInfo(query_result, private_keys ? private_keys : this.group_private_fields)
  }

  getAllPersonalGroupUserList = async (is_box = false) => {
    const query = this.database
      .select(this.group_user_list)
      .from('group_info')
      .innerJoin('member', { 'member.seq': 'group_info.member_seq' })
      .where('group_info.group_type', 'P')
      .whereIn('group_info.status', ['Y', 'F'])
    if (is_box) {
      query.where('group_info.disable_box', 0)
    }
    query.orderBy('member.user_name', 'ASC')

    const query_result = await query
    return query_result
  }

  getGroupListForBox = async (group_seq_list = null) => {
    const query = this.database
      .select(this.group_user_list)
      .from('group_info')
      .innerJoin('member', { 'member.seq': 'group_info.member_seq' })
      .whereIn('group_info.status', ['Y', 'F'])

    if (group_seq_list) {
      query.whereIn('group_info.seq', group_seq_list)
    } else {
      query.where('group_info.disable_box', 0)
    }
    query.orderBy('member.user_name', 'ASC')

    return query
  }

  getGroupSeqByMemberInfo = async (group_seq) => {
    const query = this.database
      .select('member.*')
      .from('group_info')
      .innerJoin('member', { 'member.seq': 'group_info.member_seq' })
      .where('group_info.seq', group_seq)
      .first()

    return query
  }

  getGroupInfoByMemberSeqAndGroupType = async (member_seq, group_type) => {
    const filter = {
      member_seq,
      group_type
    }
    const query_result = await this.findOne(filter)
    return new GroupInfo(query_result, this.group_private_fields)
  }

  getGroupInfoWithProduct = async (group_seq, private_keys = null) => {
    const filter = {
      'group_info.seq': group_seq
    }
    const query = this.database.select(this.group_with_product_select)
    query.from(this.table_name)
    query.innerJoin('group_counts', 'group_counts.group_seq', `${this.table_name}.seq`)
    query.leftOuterJoin('payment_list', { 'payment_list.code': 'group_info.pay_code' })
    query.where(filter)
    query.first()
    const query_result = await query
    return new GroupInfo(query_result, private_keys)
  }

  updateStorageUsedSize = async (group_seq, used_storage_size) => {
    const filter = {
      seq: group_seq
    }
    const update_params = {
      used_storage_size,
      modify_date: this.database.raw('NOW()')
    }
    return await this.update(filter, update_params)
  }

  changePlan = async (group_info, payment_info) => {
    const update_params = this.getParams(payment_info, true, false)
    return await this.update({ seq: group_info.seq }, update_params)
  }

  changeGroupName = async (group_seq, group_name) => {
    const update_params = {
      group_name,
      is_set_group_name: 1,
      modify_date: this.database.raw('NOW()')
    }
    return await this.update({ seq: group_seq }, update_params)
  }

  UpdateFollowingCnt = async (member_seq, update_cnt) => {
    if (update_cnt > 0) {
      const update_params = {
        following_count: this.database.raw('following_count + 1')
      }
      return await this.update({ seq: member_seq, group_type: 'P' }, update_params)
    } else {
      const update_params = {
        following_count: this.database.raw('case when following_count != 0 then following_count - 1 else 0 end')
      }
      return await this.update({ seq: member_seq, group_type: 'P' }, update_params)
    }
  }

  UpdateFollowerCnt = async (member_seq, update_cnt) => {
    if (update_cnt > 0) {
      const update_params = {
        follower_count: this.database.raw('follower_count + 1')
      }
      return await this.update({ seq: member_seq, group_type: 'P' }, update_params)
    } else {
      const update_params = {
        follower_count: this.database.raw('case when follower_count != 0 then follower_count - 1 else 0 end')
      }
      return await this.update({ seq: member_seq, group_type: 'P' }, update_params)
    }
  }

  updateProfileImage = async (group_seq, profile_image_path) => {
    return await this.update({ seq: group_seq }, { profile_image_path: profile_image_path })
  }

  getGroupInfoWithGroupCounts = async (group_seq) => {
    const query = this.database.select('*')
      .from(this.table_name)
      .innerJoin('group_counts', 'group_counts.group_seq', 'group_info.seq')
      .where('group_info.seq', group_seq)
      .first()
    return query
  }

  getGroupInfoHashtag = async (group_seq) => {
    return await this.findOne({ seq: group_seq }, ['hashtag'])
  }

  updateGroupInfoHashTag = async (group_seq, hashtag_json) => {
    return await this.update({ seq: group_seq }, { hashtag: JSON.stringify(hashtag_json) })
  }

  isDuplicateGroupName = async (group_name) => {
    const where = { 'group_name': group_name }
    const total_count = await this.getTotalCount(where)

    return total_count > 0
  }
  updateJoinManage = async (filter, params) => {
    return await this.update(filter, params)
  }

  getOpenGroupList = async (member_seq, search) => {
    const open_group_list_select = [
      'group_info.seq AS group_seq', 'group_info.group_name', 'group_info.profile', 'group_info.group_explain', 'group_info.profile_image_path', 'group_info.reg_date'
      , 'member.user_name', 'member.user_nickname', 'group_counts.video_count', 'group_member.status', 'group_member.grade'
    ]
    const query = this.database
      .select(open_group_list_select)
      .from('group_info')
      .innerJoin('member', { 'member.seq': 'group_info.member_seq' })
      .innerJoin('group_counts', { 'group_counts.group_seq': 'group_info.seq' })
      .leftOuterJoin('group_member', { 'group_member.member_seq': member_seq, 'group_member.group_seq': 'group_info.seq' })
      .where('group_info.group_type', 'G')
      .whereIn('group_info.status', ['Y', 'F'])
      .where('group_info.group_open', 1)
      // .where((builder) => {
      //   builder.whereNull('group_member.grade')
      //     .orWhereNot('group_member.grade', 'O')
      // })
    if (search) {
      query.where((builder) => {
        builder.where('group_info.group_name', 'like', `%${search}%`)
          .orWhere('member.user_name', 'like', `%${search}%`)
          // .orWhere('member_info.user_name', 'like', `%${search}%`)
      })
    }
    query.orderBy('group_info.group_name', 'asc')
    return query
  }

  getGroupJoinInfo = async (member_seq, query_params) => {
    const open_group_list_select = [
      'group_info.seq AS group_seq', 'group_info.group_name', 'group_info.profile', 'group_info.group_explain', 'group_info.profile_image_path', 'group_info.channel_top_img_path',
      'group_info.group_join_way', 'group_info.group_question', 'group_info.group_message', 'group_info.member_count', 'group_info.search_keyword', 'group_info.reg_date',
      'group_counts.video_count', 'group_counts.file_count', 'group_counts.project_count', 'group_counts.note_count',
      'group_member.status as group_member_status', 'group_member.grade', 'member.user_name', 'member.user_nickname'
    ]
    const query = this.database
      .select(open_group_list_select)
      .from('group_info')
      .innerJoin('member', { 'member.seq': 'group_info.member_seq' })
      .innerJoin('group_counts', { 'group_counts.group_seq': 'group_info.seq' })
      .leftOuterJoin('group_member', { 'group_member.member_seq': member_seq, 'group_member.group_seq': 'group_info.seq' })

    if (query_params.channel) {
      query.where('group_info.seq', query_params.channel)
    } else if (query_params.domain) {
      query.where('group_info.domain', query_params.domain)
    } else {
      return null
    }

    query.whereIn('group_info.status', ['Y', 'F'])
    query.first()

    return query
  }

  GroupMemberCountSync = async () => {
    const oKnex = this.database.raw('update group_info, (select group_seq, count(*) member_cnt from group_member where status in (\'Y\', \'P\') group by group_seq) group_mem set member_count = group_mem.member_cnt where group_info.seq = group_mem.group_seq')
    return oKnex
  }

  GroupSummaryCommentListByGroupSeqMemberSeq = async (group_seq, member_seq, paging) => {
    const query = this.database.select('*')
      .from(
        this.database.raw(`
        (
          SELECT board_comment.seq, board_comment.board_seq as content_seq, board_comment.board_data_seq AS content_data_seq, board_comment.content, board_comment.regist_date, 'board' AS type, board_data.status
          FROM board_comment
            INNER JOIN board_data ON (board_comment.board_data_seq = board_data.seq and board_data.status = 'Y')
          WHERE board_comment.group_seq = :group_seq AND board_comment.member_seq = :member_seq and board_comment.status = 'Y'

          union

          SELECT operation_comment.seq, operation_data.operation_seq as content_seq, operation_comment.operation_data_seq AS content_data_seq, operation_comment.comment_text, operation_comment.reg_date, 'operation' AS type, operation_data.status
          FROM (
            SELECT seq, operation_data_seq, comment_text, reg_date
            FROM operation_comment
            WHERE operation_comment.group_seq = :group_seq AND operation_comment.member_seq = :member_seq
          ) AS operation_comment
          inner join operation_data
            ON operation_data.seq = operation_comment.operation_data_seq and operation_data.status = 'Y'
        ) as L
        `, { group_seq, member_seq })
      )
      .orderBy('regist_date', 'desc')

    return this.queryPaginated(query, paging.list_count, paging.cur_page, paging.page_count, 'n', paging.start_count)
  }

  group_member_count = async (group_seq, type, count = 1) => {
    const filter = {
      seq: group_seq,
    }
    const params = {
      member_count: count,
    }
    if (type === Constants.UP) {
      await this.increment(filter, params);
    } else if (type === Constants.DOWN) {
      await this.decrement(filter, params);
    }
  }

  set_group_closure = async (group_seq) => {
    const filter = {
      seq: group_seq,
    }
    const update_params = {
      status: 'X',
    }
    return await this.update(filter, update_params);
  }

  set_group_change_owner = async (group_seq, member_seq) => {
    const filter = {
      seq: group_seq,
    }
    const update_params = {
      member_seq
    }
    return await this.update(filter, update_params);
  }

  verifyChannelDomain = async (group_seq, domain) => {
    const query = this.database
      .select(['seq'])
      .from(this.table_name)
    if (group_seq) {
      query.whereNot('seq', group_seq)
    }
    query.where('domain', domain)
      .first()
    const query_result = await query
    return !(query_result && query_result.seq)
  }
}
