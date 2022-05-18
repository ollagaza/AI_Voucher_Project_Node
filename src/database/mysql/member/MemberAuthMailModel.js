import MySQLModel from '../../mysql-model'
import Util from '../../../utils/Util'

export default class MemberAuthMailModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'member_auth_mail'
    this.selectable_fields = ['*']
    this.log_prefix = '[MemberAuthMailModel]'
  }

  getMailAuthKey = async (member_seq, member_email) => {
    const random_val = 10000000 + Math.floor(Math.random() * 90000000)
    const auth_key = Util.md5(random_val)

    const params = {
      'auth_key': auth_key,
      'is_register': 'Y',
      'user_id': member_email,
      'member_seq': member_seq,
      'new_password': '',
      'regdate': Util.currentFormattedDate('yyyymmddHHMMss')
    }

    await super.create(params)
    return auth_key
  }

  hasAuthMail = async (member_seq, auth_key = null) => {
    const params = { 'member_seq': member_seq, 'is_register': 'Y' }
    if (auth_key != null) {
      params.auth_key = auth_key
    }
    const total_count = await this.getTotalCount(params)
    return total_count > 0
  }

  deleteAuthMail = async (member_seq) => {
    return await this.delete({ 'member_seq': member_seq, 'is_register': 'Y' })
  }
}
