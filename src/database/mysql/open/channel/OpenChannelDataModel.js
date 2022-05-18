import MySQLModel from '../../../mysql-model'
import Util from '../../../../utils/Util'
import OpenChannelInfo from '../../../../wrapper/open/channel/OpenChannelInfo'

export default class OpenChannelDataModel extends MySQLModel {
  constructor(database) {
    super(database)

    this.table_name = 'open_channel_data'
    this.selectable_fields = ['*']
    this.log_prefix = '[OpenChannelDataModel]'
    this.FIELD_COUNT_VIDEO = 'video_count'
    this.FIELD_COUNT_VIEW = 'view_count'
    this.FIELD_COUNT_COMMENT = 'comment_count'
    this.FIELD_COUNT_RECOMMEND = 'recommend_count'
    this.FIELD_LIST_RECENT = 'recent_list'
    this.FIELD_DATE_RECENT_OPEN_VIDEO = 'recent_open_video_date'
    this.FIELD_DATE_CHANNEL_OPEN = 'channel_open_date'
    this.FIELD_LIST_MOST_VIEW = 'most_view_list'
    this.FIELD_LIST_MOST_RECOMMEND = 'most_recommend_list'
    this.FIELD_LIST_MOST_COMMENT = 'most_comment_list'
    this.field_map = {
      video_count: true,
      view_count: true,
      comment_count: true,
      recommend_count: true,
      recent_list: true,
      most_view_list: true,
      most_recommend_list: true,
      most_comment_list: true,
      recent_open_video_date: true,
      channel_open_date: true
    }
  }

  updateData = async (group_seq, data_map) => {
    if (!data_map || typeof data_map !== 'object') return 0
    const key_list = Object.keys(data_map)
    if (!key_list || !key_list.length) return 0
    const data_key_list = []
    const value_list = [group_seq]
    for (let i = 0; i < key_list.length; i++) {
      const key = key_list[i]
      if (this.field_map[key] === true) {
        data_key_list.push(key)
      }
    }
    if (data_key_list.length <= 0) return 0

    let field = '`group_seq`'
    let value = '?'
    for (let i = 0; i < data_key_list.length; i++) {
      field += `, \`${data_key_list[i]}\``
      value += ', ?'
      let data = data_map[data_key_list[i]]
      if (data !== null) {
        if (data instanceof Date) data = this.database.raw(`FROM_UNIXTIME('${Math.floor(data.getTime() / 1000)}')`)
        else if (typeof data === 'object') data = JSON.stringify(data)
      }
      value_list.push(data)
    }

    let sql = ''
    sql += `
      INSERT INTO ${this.table_name} ( ${field} )
      VALUES ( ${value} )
      ON DUPLICATE KEY UPDATE`
    for (let i = 0; i < data_key_list.length; i++) {
      sql += `
        \`${data_key_list[i]}\` = VALUES(\`${data_key_list[i]}\`),`
    }
    sql += `
        \`modify_date\` = current_timestamp()`
    const query_result = await this.database.raw(sql, value_list)
    if (!query_result || !query_result.length || !query_result[0]) {
      return false
    }
    return query_result[0].affectedRows > 0
  }

  increaseCount = async (group_seq, field_name, count = 1) => {
    if (!this.field_map[field_name]) return 0
    count = Util.parseInt(count, 0)
    if (count <= 0) return 0
    const params = {
      'modify_date': this.database.raw('NOW()')
    }
    params[field_name] = this.database.raw(`${field_name} + ?`, [count])
    return this.update({ group_seq }, params)
  }

  decreaseCount = async (group_seq, field_name, count = 1) => {
    if (!this.field_map[field_name]) return 0
    count = Util.parseInt(count, 0)
    if (count <= 0) return 0
    const params = {
      'modify_date': this.database.raw('NOW()')
    }
    params[field_name] = this.database.raw(`IF(${field_name} > ?, ${field_name} - ?, 0)`, [count, count])
    return this.update({ group_seq }, params)
  }

  getOpenChannelList = async (page_params = {}, filter_params = {}, order_params = {}) => {
    const group_query = this.database
      .select(['seq', 'group_name', 'domain', 'group_explain', 'member_count', 'profile', 'profile_image_path', 'channel_top_img_path', 'search_keyword'])
      .from('group_info')
      .whereIn('status', ['Y', 'F'])
      .where('group_open', '1')
      .whereNotNull('domain')
      .whereNot('domain', '')
    if (filter_params.search_keyword) {
      group_query.where((builder) => {
        const search = `%${filter_params.search_keyword}%`
        builder.where('group_name', 'like', search)
        builder.orWhere(this.database.raw('JSON_SEARCH(`search_keyword`, \'all\', \'?\', null, \'$.*\') IS NOT NULL', [search]))
      })
    }

    const query = this.database.select(['*'])
      .from({ group: group_query })
      .leftOuterJoin('open_channel_data', { 'group.seq': 'open_channel_data.group_seq' })

    if (order_params && order_params.random === true) {
      query.orderByRaw('RAND()')
    } else {
      query.orderBy([{ column: 'order', order: 'DESC' }, { column: 'recent_open_video_date', order: 'DESC' }, { column: 'channel_open_date', order: 'DESC' }])
    }

    return this.getPagingResult(query, page_params)
  }

  getPagingResult = async (query, page_params) => {
    const page = page_params.page ? page_params.page : 1
    const list_count = page_params.list_count ? page_params.list_count : 20
    const page_count = page_params.page_count ? page_params.page_count : 10
    const offset = page_params.offset
    const paging_result = await this.queryPaginated(query, list_count, page, page_count, 'n', 0, offset)

    if (paging_result && paging_result.data) {
      for (const key in paging_result.data) {
        paging_result.data[key] = new OpenChannelInfo(paging_result.data[key]).getOpenChannelInfo()
      }
    }

    return paging_result
  }

  setChannelOpenDate = async (group_seq, is_open) => {
    const params = {}
    params[this.FIELD_DATE_CHANNEL_OPEN] = null
    if (is_open) {
      params[this.FIELD_DATE_CHANNEL_OPEN] = this.database.raw(`IF(\`${this.FIELD_DATE_CHANNEL_OPEN}\` IS NULL, NOW(), \`${this.FIELD_DATE_CHANNEL_OPEN}\`)`)
    }
    return this.update({ group_seq }, params)
  }

  setRecentOpenVideoDate = async (group_seq, timestamp = null, is_none = false) => {
    const params = {}
    if (!timestamp) {
      params[this.FIELD_DATE_RECENT_OPEN_VIDEO] = this.database.raw(`FROM_UNIXTIME('${timestamp}')`)
    } else if (!is_none) {
      params[this.FIELD_DATE_RECENT_OPEN_VIDEO] = this.database.raw(`IF(\`${this.FIELD_DATE_RECENT_OPEN_VIDEO}\` IS NULL, NOW(), \`${this.FIELD_DATE_RECENT_OPEN_VIDEO}\`)`)
    } else {
      params[this.FIELD_DATE_RECENT_OPEN_VIDEO] = null
    }
    return this.update({ group_seq }, params)
  }
}
