import ServiceConfig from '../../../service/service-config'
import MySQLModel from '../../mysql-model'
import Util from '../../../utils/Util'
import MemberInfo from '../../../wrapper/member/MemberInfo'
import MongoDataService from '../../../service/common/MongoDataService'

export default class MemberSubModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'member_sub'
    this.selectable_fields = ['*']
    this.private_fields = [
      'regist_date', 'modify_date', 'user_id', 'password',
      'user_nickname', 'user_name', 'gender', 'email_address',
      'mail_acceptance', 'birth_day', 'cellphone', 'tel',
      'user_media_path', 'profile_image_path', 'certkey', 'used',
      'hospcode', 'hospname', 'treatcode', 'treatname',
      'etc1', 'etc2', 'etc3', 'etc4', 'etc5', 'seq'
    ]
    this.log_prefix = '[MemberSubModel]'
  }

  getMemberSubInfo = async (member_seq, lang) => {
    const query_result = await this.findOne({ member_seq: member_seq })
    const member_info = new MemberInfo(query_result)
    member_info.addKey('medical')
    member_info.addKey('interrest')
    member_info.medical = MongoDataService.getMedicalInfo(lang)
    member_info.interrest = MongoDataService.getInterestInfo(lang)
    if (!member_info.isEmpty() && !Util.isEmpty(member_info.license_image_path)) {
      member_info.addKey('license_image_url')
      member_info.license_image_url = Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), member_info.license_image_path)
    }
    return member_info
  }

  modifyMember = async (member_seq, member_info) => {
    const query_result = await this.findOne({ member_seq: member_seq })

    member_info.setIgnoreEmpty(true)
    member_info.setAutoTrim(true)

    if (query_result !== undefined) {
      const member = member_info.toJSON()
      return await this.update({ member_seq: member_seq }, member)
    } else {
      const member = member_info.toJSON()
      member.member_seq = member_seq
      return await this.create(member, 'seq')
    }
  }

  updateProfileImage = async (member_seq, profile_image_path) => {
    return await this.update({ member_seq: member_seq }, { profile_image_path: profile_image_path })
  }

  findMembers = async (searchText) => {
    const find_user_results = await this.find(searchText)

    return find_user_results
  }

  isDuplicateLicense_no = async (license_no) => {
    const where = { 'license_no': license_no }
    const total_count = await this.getTotalCount(where)

    return total_count > 0
  }
}
