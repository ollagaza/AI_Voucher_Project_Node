import MySQLModel from '../../mysql-model'
import Util from '../../../utils/Util'
import log from '../../../libs/logger'

export default class ContentCountsModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'content_counts'
    this.selectable_fields = ['*']
    this.log_prefix = '[ContentCountsModel]'
    this.field_name_map = {
      video_cnt: true,
      community_cnt: true,
      mentoring_cnt: true
    }
  }

  createContentCount = async (category_code, group_seq) => {
    const sql = 'INSERT IGNORE INTO content_counts(`category_code`, `group_seq`) VALUES (?, ?)'
    try {
      await this.database.raw(sql, [category_code, group_seq])
      return true
    } catch (e) {
      log.error(this.log_prefix, '[createContentCount]', e)
      return false
    }
  }

  addContentCount = async (category_code, group_seq, update_field) => {
    const params = this.getAddCountQueryParams(update_field, this.field_name_map)
    if (!params) {
      return false
    }
    const filters = { category_code, group_seq }
    return await this.update(filters, params)
  }

  minusContentCount = async (category_code, group_seq, update_field) => {
    const params = this.getMinusCountQueryParams(update_field, this.field_name_map)
    if (!params) {
      return false
    }
    const filters = { category_code, group_seq }
    return await this.update(filters, params)
  }

  getGroupTotalCount = async (group_seq) => {
    const query = this.database.select([
      this.database.raw('sum(video_cnt) as total_video_count'),
      this.database.raw('sum(community_cnt) as total_community_count'),
      this.database.raw('sum(mentoring_cnt) as total_mentoring_count')
    ])
      .from(this.table_name)
      .where({ group_seq })
      .whereNot('category_code', 'all')
      .first()
    const query_result = await query
    const result = {
      video_cnt: 0,
      community_cnt: 0,
      mentoring_cnt: 0,
    }
    if (query_result) {
      result.video_cnt = Util.parseInt(query_result.total_video_count, 0)
      result.community_cnt = Util.parseInt(query_result.total_community_count, 0)
      result.mentoring_cnt = Util.parseInt(query_result.total_mentoring_count, 0)
    }
    return result
  }

  setContentCount = async (category_code, group_seq, update_field) => {
    const filters = { category_code, group_seq }
    return await this.update(filters, update_field)
  }

  getContentCountsCategorys = async (group_seq) => {
    const in_group_seq_category = this.database.select('category_code as code')
      .sum('mentoring_cnt as ranking')
      .from(this.table_name)
      .where('category_code', '!=', 'all')
      .andWhere('group_seq', group_seq)
      .groupBy('category_code')
      .orderBy('ranking', 'desc')
      .limit(6)
    const in_group_seq_result = await in_group_seq_category

    const notin_group_seq_category = this.database.select('category_code as code')
      .sum('mentoring_cnt as ranking')
      .from(this.table_name)
      .where('category_code', '!=', 'all')
      .groupBy('category_code')
      .orderBy('ranking', 'desc')
      .limit(6)
    const notin_group_seq_result = await notin_group_seq_category

    return { in_group_seq_result, notin_group_seq_result }
  }
}
