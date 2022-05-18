import MySQLModel from "../../mysql-model";

export default class InstantMessageModel extends MySQLModel {
  constructor(database) {
    super(database)

    this.table_name = 'instant_message'
    this.selectable_fields = ['*']
    this.log_prefix = '[InstantMessageModel]'
  }

  createInstantMessage = async (message_info) => {
    return this.create(message_info);
  }

  deleteInstantMessageListBySeq = async (message_list) => {
    return this.database.from(this.table_name)
      .whereIn('seq', message_list)
      .del()
  }

  getInstantMessage = async (member_seq, group_seq) => {
    const filters = {
      is_new: true,
      query: [
        { member_seq: member_seq },
        { group_seq: group_seq },
      ]
    }
    return await this.find(filters, this.selectable_fields);
  }

}
