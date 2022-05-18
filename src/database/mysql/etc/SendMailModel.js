import MySQLModel from '../../mysql-model'

export default class SendMailModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'sendmail'
    this.selectable_fields = ['*']
    this.log_prefix = '[SendMailModel]'
  }

  createSendMail = async (sendmail_data) => {
    return await this.create(sendmail_data, 'seq')
  }

  updateSendFlag = async (seq) => {
    return await this.update({ seq }, { send_flag: 'Y' })
  }

  updateError = async (seq, error) => {
    return await this.update({ seq }, { send_error: error })
  }

  deleteMail = async (seq) => {
    return await this.delete({ seq })
  }

  fileUpdateSendMail = async (seq, params) => {
    return await this.update({ seq }, params)
  }

  getSendMailList = async (group_seq) => {
    return await this.find({ group_seq })
  }

  getSendMailPagingList = async (group_seq, paging = {}, order = null) => {
    return await this.findPaginated({ group_seq }, null, order, null, paging)
  }

  getSendMailFindOne = async (seq) => {
    return await this.findOne({ seq })
  }

  getSendMailThreeMonths  = async () => {
    const oKnex = this.database.select('*')
    oKnex.from(this.table_name)
    oKnex.where(this.database.raw('date_format(regist_date, \'%Y%m%d\') <= date_format(date_sub(current_timestamp(), interval 3 month), \'%Y%m%d\')'))
    return oKnex
  }

  getReservationEmailList = async () => {
    const oKnex = this.database.select('*')
    oKnex.from(this.table_name)
    oKnex.whereNotNull('reservation_datetime')
    oKnex.andWhere(this.database.raw('reservation_datetime <= current_timestamp()'))
    oKnex.andWhere('send_flag', 'N')
    return oKnex
  }
}
