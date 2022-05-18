import MySQLModel from '../../mysql-model'
import StdObject from '../../../wrapper/std-object'

export default class MessageModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'message'
    this.selectable_fields = ['*']
    this.log_prefix = '[MessageModel]'
  }

  getReceiveCount = async (group_seq) => {
    return await this.getTotalCount({ receive_seq: group_seq, is_view: 0 })
  }

  getReceiveList = async (filters, page_navigation) => {
    const select_fields = [
      `${this.table_name}.*`,
      'group_info.group_name',
      'member.user_name',
      'member.user_nickname',
      'member.user_id',
      'member.hospname',
      'member.used',
    ]
    const oKnex = this.database.select(select_fields)
    oKnex.from(this.table_name)
    oKnex.leftOuterJoin('group_info', `${this.table_name}.group_seq`, 'group_info.seq')
    oKnex.leftOuterJoin('member', `${this.table_name}.send_seq`, 'member.seq')
    if (filters.query !== undefined) {
      await this.queryWhere(oKnex, filters.query)
    }
    if (filters.order !== undefined) {
      oKnex.orderBy(`${this.table_name}.${filters.order.name}`, filters.order.direction)
    } else {
      oKnex.orderBy(`${this.table_name}.regist_date`, 'desc')
    }

    const results = await this.queryPaginated(oKnex, page_navigation.list_count, page_navigation.cur_page, page_navigation.page_count, page_navigation.no_paging)

    return results
  }

  getSendList = async (filters, page_navigation) => {
    const select_fields = [
      `${this.table_name}.*`,
      'member.user_name',
      'member.user_nickname',
      'member.user_id',
      'member.hospname',
    ]
    const oKnex = this.database.select(select_fields)
    oKnex.from(this.table_name)
    oKnex.innerJoin('member', `${this.table_name}.receive_seq`, 'member.seq')
    if (filters.query !== undefined) {
      await this.queryWhere(oKnex, filters.query)
    }
    oKnex.whereNull('group_seq')
    if (filters.order !== undefined) {
      oKnex.orderBy(`${this.table_name}.${filters.order.name}`, filters.order.direction)
    } else {
      oKnex.orderBy(`${this.table_name}.regist_date`, 'desc')
    }

    const results = await this.queryPaginated(oKnex, page_navigation.list_count, page_navigation.cur_page, page_navigation.page_count, page_navigation.no_paging)

    return results
  }

  setViewMessage = async (seq) => {
    const param = { seq: seq }
    const updateData = { is_view: 1 }
    return this.update(param, updateData)
  }

  sendMessage = async (message_info) => {
    return this.create(message_info, 'seq')
  }

  deleteMessage = async (seq, flag) => {
    const param = {
      is_new: true,
      query: [
        { seq: ['in'].concat(seq) },
      ],
    }

    if (flag === 'receive') {
      const updateData = { is_view: 1, is_receive_del: 1 }
      return this.update(param, updateData)
    } else {
      const updateData = { is_send_del: 1 }
      return this.update(param, updateData)
    }
  }

  getReceiveAllCountWithMemberSeq = async (member_seq) => {
    return await this.getTotalCount({ receive_seq: member_seq, is_view: 0 })
  }
}
