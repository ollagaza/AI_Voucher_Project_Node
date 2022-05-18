import MySQLModel from '../../mysql-model'
import DBMySQL from "../../mysql-model";
import Util from "../../../utils/Util";

export default class GroupCountModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'group_counts'
    this.selectable_fields = ['*']
    this.log_prefix = '[GroupCountsModel]'
    this.field_name_map = {
      community: true,
      mentoring: true,
      follower: true,
      following: true,
      video_count: true,
      open_count: true,
      file_count: true,
      project_count: true,
      anno_count: true,
      note_count: true,
      video_comment: true,
      board_comment: true,
    }
  }

  getCounts = async group_seq => {
    return this.findOne({ group_seq })
  }

  createCounts = async group_seq => {
    return this.create({ group_seq }, 'seq')
  }

  updateGroupCounts = async (group_counts) => {
    const result_map = []
    for (let cnt = 0; cnt < group_counts.length; cnt++) {
      const filter = { group_seq: group_counts[cnt].group_seq }
      const params = group_counts[cnt];
      delete params.group_seq
      const result = await this.database.update(params).from('group_counts').where(filter)
      if (result === 1) {
        result_map.push(group_counts[cnt])
      }
    }
    return result_map;
  }

  AddCount = async (seq, update_field, is_group_seq = false) => {
    const params = this.getAddCountQueryParams(update_field, this.field_name_map)
    if (!params) {
      return false
    }
    if (is_group_seq) {
      return await this.update({ group_seq: seq }, params)
    } else {
      return await this.update({ seq }, params)
    }
  }

  MinusCount = async (seq, update_field, is_group_seq = false) => {
    const params = this.getMinusCountQueryParams(update_field, this.field_name_map)
    if (!params) {
      return false
    }

    if (is_group_seq) {
      return await this.update({ group_seq: seq }, params)
    } else {
      return await this.update({ seq }, params)
    }
  }

  getGroupInfoList = async (paging, search_option = null, search_keyword = null, order_field = null, order_type = null) => {
    const select_fields = ['group_info.seq', 'group_info.group_name', 'mem.user_name as group_admin_name', 'mem.user_id as group_admin_id',
      'group_info.reg_date', 'group_info.member_count', 'group_info.status as group_status',
      `${this.table_name}.video_count`, `${this.table_name}.file_count`, `${this.table_name}.project_count`, `${this.table_name}.note_count`]

    const query = this.database.select(select_fields)
    query.from(this.table_name)
    query.innerJoin('group_info', 'group_info.seq', `${this.table_name}.group_seq`)
    if (search_keyword) {
      switch (search_option) {
        case 'group_name':
          query.innerJoin('member as mem', (builder) => {
            builder.on('group_info.member_seq', 'mem.seq')
          })
          query.where('group_info.group_name', 'like', `%${search_keyword}%`)
          break;
        case 'group_admin':
          query.innerJoin('member as mem', (builder) => {
            builder.on('group_info.member_seq', 'mem.seq')
            builder.andOnVal('mem.user_name', 'like', `%${search_keyword}%`)
          })
          break;
        case 'group_member':
          query.innerJoin('group_member as g_mem', (builder) => {
            builder.andOn('group_info.seq', 'g_mem.group_seq')
          })
          query.innerJoin('member as mem', (builder) => {
            builder.on(`g_mem.member_seq`, 'mem.seq')
            builder.andOnVal('mem.user_name', 'like', `%${search_keyword}%`)
          })
          break;
        default:
          break;
      }
    } else {
      query.innerJoin('member as mem', (builder) => {
        builder.on('group_info.member_seq', 'mem.seq')
      })
    }
    if (order_field && order_type) {
      query.orderBy(order_field, order_type)
    } else {
      query.orderBy('group_info.seq', 'asc')
    }

    return this.queryPaginated(query, paging.list_count, paging.cur_page, paging.page_count, 'n', paging.start_count)
  }
}
