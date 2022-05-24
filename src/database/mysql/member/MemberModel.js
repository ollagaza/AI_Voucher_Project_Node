import Util from '../../../utils/baseutil'
import MySQLModel from '../../mysql-model'
import StdObject from "../../../wrapper/std-object";
import logger from '../../../libs/logger'
import JsonWrapper from '../../../wrapper/json-wrapper'
import moment from "moment";

export default class MemberModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'member'
    this.private_fields = [
      'password', 'user_media_path', 'profile_image_path', 'certkey', 'member_seq'
    ]
  }

  createUser  = async (member_info) => {
    // logger.debug(member_info.password)
    // const member = member_info.toJSON()
    member_info.password = this.encryptPassword(member_info.password)
    member_info.content_id = Util.getContentId();
    member_info.user_nickname = member_info.user_id;
    member_info.gender = 1;
    member_info.foreigner = 'N';
    member_info.user_type = 'P';

    if(member_info.storage_name === '') {
      member_info.used_admin = 'N';
      member_info.used = 0;
    } else {
      member_info.storage_name = member_info.storage_name;
      member_info.etc = member_info.etc;
      member_info.used_admin = member_info.used_admin;
      member_info.used = member_info.used;
    }

    // logger.debug(member_info)
    try{
      const member_info_seq = await this.create(member_info, 'seq')
      member_info.password = '';
      member_info.seq = member_info_seq
      member_info.error = 0;
    } catch (e) {
      member_info.error = -1;
      member_info.message = e.sqlMessage;
    }
    return member_info
  }

  updateLastLogin  = async (member_seq) => {
    const today = new Date();
    const nowtime =  moment(new Date()).format('YYYY-MM-DD HH:MM:ss');
    const update_param = {lastlogin: nowtime}
    const member_info_seq = await this.update({ seq: member_seq }, update_param)

    return member_info_seq
  }

  updateUser  = async (member_seq, member_info) => {
    // logger.debug(member_info.password)
    // const member = member_info.toJSON()
    // logger.debug(member_info)
    const update_param = {};
    if(member_info.password !== '') {
      update_param.password = this.encryptPassword(member_info.password)
    }
    update_param.user_name = member_info.user_name;
    update_param.birth_day = member_info.birth_day;
    update_param.cellphone = member_info.cellphone;
    // update_param.tel = member_info.tel;
    update_param.email_address = member_info.email_address;
    if(member_info.storage_name !== '') {
      update_param.storage_name = member_info.storage_name;
      update_param.etc = member_info.etc;
      update_param.used_admin = member_info.used_admin;
      update_param.used = member_info.used;
    }
    try{
      const member_info_seq = await this.update({ seq: member_seq }, update_param)
      member_info.error = 0;
    } catch (e) {
      member_info.error = -1;
      member_info.message = e.sqlMessage;
    }
    return member_info
  }

  updateUsersUsed = async (params, arr_member_seq) => {
    const result = {};
    result.error = 0;
    result.mesage = '';
    try {
      const result = await this.database
        .from(this.table_name)
        .whereIn('user_id', arr_member_seq)
        .update(params);
      // logger.debug(result);
    }catch (e) {
      result.error = 0;
      result.mesage = '';
    }
    return result;
  }

  updateUserUsed  = async (member_seq, member_info) => {
    const update_param = {};
    update_param.used =  member_info.used;
    update_param.admin_text = member_info.admin_text;
    // logger.debug(member_info, update_param);
    if (update_param.used===undefined){
      member_info.error = -1;
      member_info.message = 'error';
      return  member_info
    }
    try{
      const member_info_seq = await this.update({ seq: member_seq }, update_param)
      member_info.error = 0;
    } catch (e) {
      member_info.error = -1;
      member_info.message = e.sqlMessage;
    }
    return member_info
  }

  getMemberInfoById = async (user_id) => {
    const query_result = await this.findOne({'user_id': user_id})
    // logger.debug('[query_result]', query_result);
    if (query_result && query_result.regist_date) {
      query_result.regist_date = Util.dateFormat(query_result.regist_date.getTime())
    }
    return new JsonWrapper(query_result, this.private_fields)
  }

  encryptPassword = (password) => {
    if (Util.isEmpty(password)) {
      return null
    } else {
      return Util.hash(`mt_${Util.md5(password)}_eg`)
    }
  }

  getVerify = async (user_id) => {
    try{
      const oKnex = this.database.count('* as co');
      oKnex.from(this.table_name);
      oKnex.where('user_id', user_id);
      const result = await oKnex
      // logger.debug(result);
      const out = new StdObject(0, 'OK', 200);
      // result.forEach
      let co = -1;
      Object.keys(result).forEach((key) => {
        co = result[key].co;
      });
      // logger.debug(co);
      out.add('co', co)
      return out;
    } catch (e) {
      throw  new StdObject(-1, e, 500);
    }
  }

  getMemberInfo = async (member_seq) => {
    const query_result = await this.findOne({ seq: member_seq })
    console.log('getMemberInfo')
    console.log(query_result)
    if (query_result && query_result.regist_date) {
      query_result.regist_date = Util.dateFormat(query_result.regist_date.getTime())
    }
    // return new MemberInfo(query_result, this.private_fields)
    return new JsonWrapper(query_result, this.private_fields)
  }

  findMemberId = async (member_info) => {
    member_info.setAutoTrim(true)
    const member = member_info.toJSON()
    const find_user_result = await this.findOne({ user_name: member.user_name, email_address: member.email_address })

    if (!find_user_result || !find_user_result.seq) {
      throw new StdObject(-1, '등록된 회원 정보가 없습니다.', 400)
    }
    return new JsonWrapper(find_user_result, []);
  }

  changePassword = async (member_seq, new_password) => {
    return await this.update({ seq: member_seq }, { password: this.encryptPassword(new_password) })
  }

  searchMembers = async (filter) => {
    const search_user_results = await this.findPaginated(filter, null, null, null, filter.page_navigation);
    if (!search_user_results.data || search_user_results.data.length === 0) {
      return new StdObject(-1, '등록된 회원 정보가 없습니다.', 400)
    }
    return search_user_results
  }

  getMembercount = async () => {
    const oKnex = this.database.select([
      this.database.raw('count(*) `all_count`'),
      this.database.raw('count(case when used = 0 then 1 end) `appr_count`'),
      this.database.raw('count(case when used = 1 then 1 end) `used_count`'),
      this.database.raw('count(case when used in (3, 6) then 1 end) `reject_count`'),
    ])
      .from('member')
    const result = await oKnex
    if (result[0]){
      return result[0];
    }
    return {};
  }

  getMember_1 = async () => {
    const select = ['user_id', 'user_name', 'regist_date', 'email_address']
    const oKnex = this.database.select(select).from(this.table_name).where('used',0).limit(5);
    const result = await oKnex;
    return result;
  }

  getMemberList = async (options, order_params = {}, search_keyword) => {
    const page = options.page
    const limit = options.limit

    const oKnex = this.database.select('*').from(this.table_name)

    if (search_keyword) {
      oKnex.where('user_name', 'like', `%${search_keyword}%`)
      oKnex.orWhere('user_id', 'like', `%${search_keyword}%`)
    }
    // const result = await oKnex
    // if (result && result.regist_date) {
    //   result.regist_date = Util.dateFormat(result.regist_date.getTime())
    // }
    const order_by = { name: 'regist_date', direction: 'DESC' }
    if (order_params.field) {
      switch (order_params.field) {
        case 'regist_date':
          order_by.name = 'regist_date'
          order_by.direction = order_params.type
          break;
        case 'user_id':
          order_by.name = 'user_id'
          order_by.direction = order_params.type
          break;
        case 'user_name':
          order_by.name = 'user_name'
          order_by.direction = order_params.type
          break;
        case 'used_admin':
          order_by.name = 'used_admin'
          order_by.direction = order_params.type
          break;
        case 'used':
          order_by.name = 'used'
          order_by.direction = order_params.type
          break;
        case 'storage_size':
          order_by.name = 'storage_size'
          order_by.direction = order_params.type
          break;
        default :
          break;
      }
    }
    oKnex.orderBy(order_by.name, order_by.direction)

    return this.queryPaginated(oKnex, limit, page)
    // return new MemberInfo(result, this.private_fields)
    // return new JsonWrapper(result, this.private_fields)
  }
}
