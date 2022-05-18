import MySQLModel from '../../../mysql-model'
import OpenChannelVideoInfo from '../../../../wrapper/open/channel/OpenChannelVideoInfo'
import _ from 'lodash'
import Util from '../../../../utils/Util'
import logger from '../../../../libs/logger'


const default_field_list = [
  'open_channel_video.seq AS video_seq', 'open_channel_video.category_seq', 'open_channel_video.view_count', 'open_channel_video.video_order', 'open_channel_video.reg_date AS open_date',
  'operation_data.seq AS data_seq', 'operation_data.group_seq', 'operation_data.operation_seq', 'operation_data.thumbnail', 'operation_data.total_time', 'operation_data.is_play_limit', 'operation_data.play_limit_time',
  'operation.reg_date', 'operation.operation_date', 'operation.mode',
  'IF(open_channel_video.video_title IS NOT NULL, open_channel_video.video_title, operation_data.title) AS title',
  'IF(open_channel_video.video_doc_html IS NOT NULL, open_channel_video.video_doc_html, operation_data.doc_html) AS html',
  'IF(open_channel_video.video_doc_text IS NOT NULL, open_channel_video.video_doc_text, operation_data.doc_text) AS text'
]
const media_field_list = _.concat(default_field_list,
  [
    'operation_media.video_file_name', 'operation_media.proxy_file_name', 'operation_media.stream_url', 'operation_media.width', 'operation_media.height',
    'operation.media_path', 'operation.origin_media_path', 'operation.origin_seq'
  ]
)
const library_field_list = _.concat(default_field_list,
  [
    'group_info.group_name', 'group_info.profile_image_path', 'group_info.domain'
  ]
)

export default class OpenChannelVideoModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'open_channel_video'
    this.selectable_fields = ['*']
    this.log_prefix = '[OpenChannelVideoModel]'
  }

  getOpenChannelVideoList = async (group_seq, is_all, category_seq, page_params = {}, filter_params = {}, order_params = {}, is_library = false) => {
    const sub_query = this.database
      .select(this.arrayToSafeQuery(is_library ? library_field_list : default_field_list))
    if (is_all) {
      sub_query.from('operation_data')
        .innerJoin('operation', (builder) => {
          this.setOperationJoinOption(builder, 'operation_data.operation_seq')
        })
      if (group_seq) {
        sub_query.leftOuterJoin(
          this.database.raw(`
            (
              SELECT *
              FROM open_channel_video
              WHERE group_seq = ?
              GROUP BY operation_seq
            ) AS open_channel_video
              ON open_channel_video.operation_seq = operation_data.operation_seq
          `, group_seq))
      } else {
        sub_query.leftOuterJoin(
          this.database.raw(`
            (
              SELECT *
              FROM open_channel_video
              GROUP BY operation_seq
            ) AS open_channel_video
              ON open_channel_video.operation_seq = operation_data.operation_seq
          `))
      }

    } else {
      sub_query.from('open_channel_video')
        .innerJoin('operation', (builder) => {
          this.setOperationJoinOption(builder, 'open_channel_video.operation_seq')
        })
        .innerJoin('operation_data', { 'operation_data.operation_seq': 'open_channel_video.operation_seq' })
    }
    if (is_library) {
      sub_query.innerJoin('group_info', (builder) => {
        builder.andOn('group_info.seq', 'operation_data.group_seq')
        builder.andOn(this.database.raw("group_info.status IN ('Y', 'F')"))
        builder.andOn(this.database.raw("group_info.group_open = 1"))
        builder.andOn(this.database.raw("group_info.domain IS NOT NULL"))
      })
    }
    sub_query.leftOuterJoin('operation_folder', 'operation_folder.seq', 'operation.folder_seq')
    if (group_seq) {
      sub_query.where('operation_data.group_seq', group_seq)
    }
    sub_query.where((builder) => {
      builder.whereNull('operation.folder_seq')
      builder.orWhere('operation_folder.status', 'Y')
    })

    if (is_all) {
      sub_query.where(builder => {
        builder.where('operation_data.is_open_video', 1)
        builder.orWhereNotNull('open_channel_video.seq')
      })
    } else {
      sub_query.where('open_channel_video.category_seq', category_seq)
    }

    const query = this.database
      .select('*')
      .from({ data: sub_query })

    if (filter_params.search_keyword) {
      query.where((builder) => {
        builder.where('title', 'like', `%${filter_params.search_keyword}%`)
        builder.orWhere('text', 'like', `%${filter_params.search_keyword}%`)
      })
    }

    const order_by = is_all ? { name: 'operation_seq', direction: 'DESC' } : { name: 'video_order', direction: 'ASC' }
    if (order_params.field) {
      order_by.name = order_params.field
    }
    if (order_params.type) {
      order_by.direction = order_params.type
    }
    query.orderBy(order_by.name, order_by.direction)

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
        paging_result.data[key] = new OpenChannelVideoInfo(paging_result.data[key]).getOpenVideoInfo()
      }
    }

    return paging_result
  }

  setOperationJoinOption = (builder, operation_seq_column) => {
    builder.andOn('operation.seq', operation_seq_column)
    builder.andOn(this.database.raw("operation.mode = 'operation'"))
    builder.andOn(this.database.raw("operation.status = 'Y'"))
    builder.andOn(this.database.raw("operation.analysis_status = 'Y'"))
  }

  getOpenChannelVideoInfo = async (operation_seq, join_media, is_join_channel) => {
    const query = this.database
      .select(this.arrayToSafeQuery(join_media ? media_field_list : default_field_list))
      .from('operation')
      .innerJoin('operation_data', { 'operation_data.operation_seq': operation_seq })
      .leftOuterJoin('open_channel_video', { 'open_channel_video.operation_seq': operation_seq })
    if (join_media) {
      query.innerJoin('operation_media', { 'operation_media.operation_seq': operation_seq })
    }
    query.where('operation.seq', operation_seq)
      .first()
    const video_info = await query
    return new OpenChannelVideoInfo(video_info).getOpenVideoInfo(is_join_channel)
  }

  deleteOpenChannelVideoInfo = async (operation_seq, video_seq) => {
    const filter = {
      operation_seq
    }
    if (video_seq) {
      filter.seq = video_seq;
    }
    return this.delete(filter)
  }

  getCategoryVideoList = async (group_seq, category_seq, folder_seq, page_params = {}, filter_params = {}) => {
    // logger.debug(this.log_prefix, '[getCategoryVideoList]', filter_params)
    folder_seq = Util.parseInt(folder_seq, 0)
    const query = this.database
      .select(this.arrayToSafeQuery(default_field_list))
      .from('operation')
      .innerJoin('operation_data', 'operation_data.operation_seq', 'operation.seq')
      .leftOuterJoin('operation_folder', 'operation_folder.seq', 'operation.folder_seq')
      .leftOuterJoin('open_channel_video',
        { 'open_channel_video.operation_seq': 'operation_data.operation_seq', 'open_channel_video.category_seq': this.database.raw(category_seq) }
      )
      .where('operation.group_seq', group_seq)
      .where('operation.status', 'Y')
      .where('operation.analysis_status', 'Y')
      .where('operation.mode', 'operation')

    if (filter_params.search_keyword) {
      query
        .where((builder) => {
          builder.whereNull('operation.folder_seq')
          builder.orWhere('operation_folder.status', 'Y')
        })
        .where((builder) => {
          builder.where('operation.operation_name', 'like', `%${filter_params.search_keyword}%`)
        })
    } else if (Util.parseInt(folder_seq, 0) > 0) {
      query.where('operation.folder_seq', folder_seq)
    } else {
      query.whereNull('operation.folder_seq')
    }
    query.orderBy('operation.operation_name', 'ASC')

    return this.getPagingResult(query, page_params)
  }

  getMaxOrder = async (group_seq, category_seq) => {
    const query = this.database
      .select(this.database.raw('MAX(video_order) AS MAX_ORDER'))
      .from(this.table_name)
      .where('group_seq', group_seq)
      .where('category_seq', category_seq)
      .first()
    const result = await query
    if (!result || !result.MAX_ORDER) return 1
    return Util.parseInt(result.MAX_ORDER, 0) + 1
  };

  addOpenVideo = async (group_seq, category_seq, video_info_list) => {
    const values = []
    let sql = `
      INSERT INTO ${this.table_name} (\`group_seq\`, \`category_seq\`, \`operation_seq\`, \`video_order\`)
      VALUES `
    for (let i = 0; i < video_info_list.length; i++) {
      if (i !== 0) {
        sql += ', '
      }
      sql += '(?, ?, ?, ?)'
      values.push(group_seq)
      values.push(category_seq)
      values.push(video_info_list[i].operation_seq)
      values.push(video_info_list[i].order)
    }
    sql += `
      ON DUPLICATE KEY UPDATE
        \`modify_date\` = current_timestamp()
    `
    const query_result = await this.database.raw(sql, values)
    if (!query_result || !query_result.length || !query_result[0]) {
      return false
    }
    return query_result[0].affectedRows > 0
  }

  changeOpenVideo = async (group_seq, category_seq, video_seq, video_info) => {
    const update_params = {
      operation_seq: video_info.operation_seq
    }
    const filter_params = {
      seq: video_seq,
      group_seq,
      category_seq
    };
    return this.update(filter_params, update_params)
  }
}
