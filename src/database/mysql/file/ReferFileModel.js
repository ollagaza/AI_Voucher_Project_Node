import MySQLModel from '../../mysql-model'

export default class ReferFileModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'refer_file'
    this.selectable_fields = ['*']
    this.log_prefix = '[ReferFileModel]'
  }

  createReferFile = async (file_info) => {
    return await this.create(file_info, 'seq')
  }

  createReferData = async (refer_data) => {
    return await this.create(refer_data, 'seq')
  }

  referFileSummary = async (storage_seq) => {
    const select = ['COUNT(*) AS total_count', 'SUM(file_size) AS total_size']
    return await this.findOne({ storage_seq: storage_seq, status: 'Y' }, select)
  }

  getReferFileList = async (storage_seq) => {
    return await this.find({ storage_seq: storage_seq, status: 'Y' })
  }

  deleteAll = async (storage_seq) => {
    await this.delete({ storage_seq: storage_seq })
  }

  deleteSelectedFiles = async (file_seq_list) => {
    const query = this.database
      .select(this.selectable_fields)
      .from(this.table_name)
      .whereIn('seq', file_seq_list)
    const result_list = await query
    if (!result_list || result_list.length <= 0) {
      return null
    }

    await this.database
      .from(this.table_name)
      .whereIn('seq', file_seq_list)
      .del()

    return result_list
  }
}
