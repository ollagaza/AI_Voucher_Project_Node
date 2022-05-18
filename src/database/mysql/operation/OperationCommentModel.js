import MySQLModel from '../../mysql-model'
import striptags from 'striptags'
import log from '../../../libs/logger'

export default class OperationCommentModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'operation_comment'
    this.selectable_fields = ['*']
    this.log_prefix = '[OperationCommentModel]'
    this.list_select_fileds = [
      'operation_comment.seq', 'operation_comment.member_seq',
      'operation_comment.is_reply', 'operation_comment.writer_info', 'operation_comment.reply_user_info', 'operation_comment.member_seq',
      'operation_comment.user_name', 'operation_comment.user_nickname', 'operation_comment.comment_html',
      'operation_comment.reply_count', 'operation_comment.clip_id', 'operation_comment.clip_info', 'operation_comment.is_clip_deleted',
      'operation_comment.like_user_map', 'operation_comment.like_count', 'operation_comment.reg_date', 'operation_comment.modify_date',
      // 'group_info.group_name', 'group_info.profile_image_path as group_profile_image',
      'member.profile_image_path as member_profile_image', 'member.user_name as member_name', 'member.user_name as member_nickname'
    ]
  }

  createComment = async (operation_data_seq, create_params) => {
    return this.create(create_params, 'seq')
  }

  changeComment = async (operation_data_seq, comment_seq, comment) => {
    const update_params = {
      comment_html: comment,
      comment_text: striptags(comment),
      modify_date: this.database.raw('NOW()')
    }
    return await this.update({ seq: comment_seq, operation_data_seq }, update_params)
  }

  deleteComment = async (operation_data_seq, comment_seq) => {
    return await this.delete({ seq: comment_seq, operation_data_seq })
  }

  changeClipInfo = async (clip_id, clip_info) => {
    const update_params = {
      clip_info: JSON.stringify(clip_info),
      modify_date: this.database.raw('NOW()')
    }
    return await this.update({ clip_id }, update_params)
  }

  setDeleteClip = async (clip_id) => {
    const update_params = {
      is_clip_deleted: 1,
      modify_date: this.database.raw('NOW()')
    }
    return await this.update({ clip_id }, update_params)
  }

  addClipInfo = async (operation_data_seq, comment_seq, clip_id, clip_info) => {
    const update_params = {
      clip_id,
      clip_info,
      modify_date: this.database.raw('NOW()')
    }
    return await this.update({ seq: comment_seq, operation_data_seq }, update_params)
  }

  removeClipInfo = async (operation_data_seq, comment_seq) => {
    const update_params = {
      clip_id: null,
      clip_info: null,
      modify_date: this.database.raw('NOW()')
    }
    return await this.update({ seq: comment_seq, operation_data_seq }, update_params)
  }

  getCommentList = async (operation_data_seq, parent_seq = null, start = 0, limit = 20, column = 'operation_comment.reg_date', order = 'desc', by_index = false) => {
    const query = this.database.select(this.list_select_fileds)
      .from(this.table_name)
      .leftOuterJoin('member', 'member.seq', 'operation_comment.member_seq')
      .where('operation_comment.operation_data_seq', operation_data_seq)
    if (by_index) {
      if (order === 'asc') {
        query.andWhere('operation_comment.seq', '>', start)
      } else if (start > 0) {
        query.andWhere('operation_comment.seq', '<', start)
      }
    }
    if (parent_seq) {
      query.andWhere('operation_comment.parent_seq', parent_seq)
      query.andWhere('operation_comment.is_reply', 1)
    } else {
      query.andWhere('operation_comment.is_reply', 0)
    }

    query.orderBy(column, order)
      .limit(limit)
    if (!by_index) {
      query.offset(start)
    }

    return query
  }

  getOriginCommentList = async (origin_data_seq) => {
    return this.find({ operation_data_seq: origin_data_seq }, this.selectable_fields, { name: 'is_reply', direction: 'asc' })
  }

  copyParentComment = async (comment_info, operation_data_seq, group_seq, change_seq_map) => {
    const origin_seq = comment_info.seq
    delete comment_info.seq
    comment_info.operation_data_seq = operation_data_seq
    comment_info.group_seq = group_seq
    const copy_seq = await this.createComment(operation_data_seq, comment_info)
    change_seq_map[origin_seq] = copy_seq
  }

  copyReplyComment = async (comment_info, operation_data_seq, group_seq, change_seq_map) => {
    const origin_parent_seq = comment_info.parent_seq
    delete comment_info.seq
    comment_info.operation_data_seq = operation_data_seq
    comment_info.group_seq = group_seq
    comment_info.parent_seq = change_seq_map[origin_parent_seq]
    await this.createComment(operation_data_seq, comment_info)
  }

  getComment = async (operation_data_seq, comment_seq) => {
    return this.database.select(this.list_select_fileds)
      .from(this.table_name)
      .leftOuterJoin('member', 'member.seq', 'operation_comment.member_seq')
      .where('operation_comment.seq', comment_seq)
      .andWhere('operation_comment.operation_data_seq', operation_data_seq)
      .first()
  }

  getCommentCount = async (operation_data_seq, parent_seq = null) => {
    const query = this.database.select([this.database.raw('COUNT(*) AS total_count')])
      .from(this.table_name)
      .where('operation_comment.operation_data_seq', operation_data_seq)
    if (parent_seq) {
      query.andWhere('operation_comment.parent_seq', parent_seq)
    }
    query.first()
    return query
  }

  updateReplyCount = async (operation_data_seq, comment_seq) => {
    const sql = `
      update operation_comment,
        (select count(*) as cnt from operation_comment where operation_data_seq = ? and parent_seq = ?) as reply_count
      set operation_comment.reply_count = reply_count.cnt
      where operation_comment.seq = ?
    `
    const query_result = (await this.database.raw(sql, [operation_data_seq, comment_seq, comment_seq]))[0]
    return !(!query_result || !query_result.length || !query_result[0]);
  }

  setCommentLike = async (comment_seq, member_seq, like_info) => {
    let like_count = 1
    if (!like_info.is_like) like_count = -1
    const sql = `
      update operation_comment
      set
        like_count = operation_comment.like_count + ?,
        like_user_map = JSON_SET(like_user_map, '$."?"', JSON_OBJECT('is_like', ?, 'user_name', ?, 'user_nickname', ?))
      where seq = ?
    `
    const params = [like_count, member_seq, like_info.is_like, like_info.user_name, like_info.user_nickname, comment_seq]
    const query_result = (await this.database.raw(sql, params))[0]
    return !(!query_result || !query_result.length || !query_result[0]);
  }

  getCommentLikeCount = async (comment_seq) => {
    return this.database.select('like_count')
      .from(this.table_name)
      .where({ seq: comment_seq })
      .first()
  }

  getClipCommentCount = async (operation_data_seq, clip_id) => {
    const sql = `
      SELECT COUNT(*) AS cnt
      FROM (
          SELECT C.seq
          FROM (
            SELECT seq
            FROM operation_comment
            WHERE
              operation_data_seq = :operation_data_seq
              AND clip_id = :clip_id
          ) AS CLIP
          INNER JOIN operation_comment AS C
            ON C.seq = CLIP.seq
        UNION
          SELECT C.seq
          FROM (
            SELECT seq
            FROM operation_comment
            WHERE
              operation_data_seq = :operation_data_seq
              AND clip_id = :clip_id
          ) AS CLIP
          INNER JOIN operation_comment AS C
            ON C.parent_seq = CLIP.seq
      ) AS C
    `
    const query_result = (await this.database.raw(sql, {operation_data_seq, clip_id}))[0]
    log.debug(this.log_prefix, '[getClipCommentCount]', JSON.parse(JSON.stringify(query_result)))
    if (!query_result || !query_result[0] || !query_result[0].cnt) {
      return 0
    }
    return query_result[0].cnt
  }

  getCommentListByGroupSeqMemberSeq = async (group_seq, member_seq) => {
    if (!group_seq || !member_seq) {
      return null;
    }
    return this.database.select('*')
      .from(this.table_name)
      .where({ group_seq: group_seq, member_seq: member_seq })
  }

  deleteAllCommentGroupSeqMemberSeq = async (group_seq, member_seq) => {
    return this.delete({ group_seq: group_seq, member_seq: member_seq })
  }

  getChildCommentCountGroupByMemberSeq = async (comment_seq) => {
    return this.database
      .select(['member_seq', this.database.raw('COUNT(*) AS comment_count')])
      .from(this.table_name)
      .where('parent_seq', comment_seq)
      .groupBy('member_seq')
  }

  getOperationCommentCounts = async () => {
    return this.database
      .select(['operation_data_seq', this.database.raw('COUNT(*) AS count')])
      .from(this.table_name)
      .groupBy('operation_data_seq')
  }
}
