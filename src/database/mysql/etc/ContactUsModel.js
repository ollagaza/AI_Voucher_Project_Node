import MySQLModel from '../../mysql-model'

export default class ContactUsModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'contact_us'
    this.selectable_fields = ['*']
    this.log_prefix = '[ContactUsModel]'
  }

  createContactUs = async (contact_us_info) => {
    return await this.create(contact_us_info, 'seq')
  }
}
