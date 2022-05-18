import MySQLModel from '../../mysql-model'

export default class ProfileHistoryModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'profile_history'
    this.selectable_fields = ['*']
    this.log_prefix = '[ProfileHistoryModel]'
  }

  getProFileHistoryLists = async group_seq => {
    return this.find({ seq: group_seq }, this.selectable_fields)
  }

  createProfileHistory = async (params) => {
    return this.create(params, 'seq')
  }
}
