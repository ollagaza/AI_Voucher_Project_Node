import MySQLModel from '../../mysql-model'
import StdObject from '../../../wrapper/std-object'
import group from "../../../routes/admin/group";

export default class GroupMessageModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'group_message'
    this.selectable_fields = ['*']
    this.log_prefix = '[GroupMessageModel]'
  }

  getGroupMessageOne = async (send_seq, seq) => {
    return await this.findOne({ send_seq, seq })
  }

  getGroupMessageList = async (send_seq, paging = {}, order = null) => {
    return await this.findPaginated({ send_seq, is_del: 0 }, null, order, null, paging)
  }

  sendMessage = async (message_info) => {
    return this.create(message_info, 'seq')
  }

  delMessage = async (message_seq) => {
    return this.update({ seq: message_seq }, { is_del: 1 })
  }

  updateGroupViewCount = async (group_msg_seq, member_seq) => {
    const oQuery = this.database.raw('update group_message set view_seq = json_array_append(view_seq, \'$\', ?) where seq = ? and JSON_CONTAINS(view_seq, \'?\', \'$\') = 0', [member_seq, group_msg_seq, member_seq])
    return oQuery
  }
}
