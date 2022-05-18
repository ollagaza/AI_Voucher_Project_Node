import MySQLModel from '../../mysql-model'
import StdObject from '../../../wrapper/std-object'
import log from '../../../libs/logger'

export default class MemberModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'member'
    this.selectable_fields = ['*']
    this.log_prefix = '[AdminMemberModel]'
  }

  findMembers = async (filter) => {
    const find_user_results = await this.find(filter)
    if (!find_user_results || find_user_results.length === 0) {
      return new StdObject(-1, '등록된 회원 정보가 없습니다.', 400)
    }
    return find_user_results
  }

  findMembersforPagenation = async (searchText) => {
    const find_user_results = await this.findPaginated(searchText, null, null, null, searchText.page_navigation)
    if (!find_user_results.data || find_user_results.data.length === 0) {
      return new StdObject(-1, '등록된 회원 정보가 없습니다.', 400)
    }
    return find_user_results
  }

  findMembersforNonPagenation = async (searchText) => {
    try {
      const find_user_results = await this.find(searchText)
      if (!find_user_results || find_user_results.length === 0) {
        return new StdObject(-1, '등록된 회원 정보가 없습니다.', 400)
      }
      return find_user_results
    } catch (exception) {
      log.debug(this.log_prefix, 'exception', exception)
    }
  }

  updateAdminUserData = async (setData, search_option = null) => {
    return await this.update(search_option, setData)
  }

  getAnlyticData = async () => {
    const oKnex = this.database.select('*')
    return null
  }

  getMember_Counts = async () => {
    const oKnex = this.database.select([
      this.database.raw('count(*) `all_count`'),
      this.database.raw('count(case when used in (0, 7) then 1 end) `appr_count`'),
      this.database.raw('count(case when used = 1 then 1 end) `used_count`'),
      this.database.raw('count(case when used = 6 then 1 end) `reject_count`'),
    ])
      .from('member')
    return oKnex
  }

  getApprLists = async () => {
    const oKnex = this.database.select('*')
      .from('member')
      .innerJoin('member_sub', 'member_sub.member_seq', 'member.seq')
      .whereIn('member.used', ['0', '7'])
      .limit(5)
    return oKnex
  }
}
