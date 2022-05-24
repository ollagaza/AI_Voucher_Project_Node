import Util from '../../../utils/baseutil'
import MySQLModel from '../../mysql-model'
import StdObject from "../../../wrapper/std-object";
import logger from '../../../libs/logger'
import JsonWrapper from '../../../wrapper/json-wrapper'
import moment from "moment";

export default class BoardModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'board'
    this.private_fields = [
      'board_code', 'seq', 'project_seq'
    ]
  }

  createBoard  = async (board_info) => {
    // logger.debug(board_info.password)
    // const member = board_info.toJSON()
    board_info.password = this.encryptPassword(board_info.password)
    board_info.content_id = Util.getContentId();
    board_info.user_nickname = board_info.user_id;
    board_info.gender = 1;
    board_info.foreigner = 'N';
    board_info.user_type = 'P';

    if(board_info.storage_name === '') {
      board_info.used_admin = 'N';
      board_info.used = 0;
    } else {
      board_info.storage_name = board_info.storage_name;
      board_info.etc = board_info.etc;
      board_info.used_admin = board_info.used_admin;
      board_info.used = board_info.used;
    }

    // logger.debug(board_info)
    try{
      const board_info_seq = await this.create(board_info, 'seq')
      board_info.password = '';
      board_info.seq = board_info_seq
      board_info.error = 0;
    } catch (e) {
      board_info.error = -1;
      board_info.message = e.sqlMessage;
    }
    return board_info
  }

  updateBoard  = async (board_seq, board_info) => {
    const update_param = {};
    if(board_info.password !== '') {
      update_param.password = this.encryptPassword(board_info.password)
    }
    update_param.user_name = board_info.user_name;
    update_param.birth_day = board_info.birth_day;
    update_param.cellphone = board_info.cellphone;
    // update_param.tel = board_info.tel;
    update_param.email_address = board_info.email_address;
    if(board_info.storage_name !== '') {
      update_param.storage_name = board_info.storage_name;
      update_param.etc = board_info.etc;
      update_param.used_admin = board_info.used_admin;
      update_param.used = board_info.used;
    }
    try{
      const board_info_seq = await this.update({ seq: board_seq }, update_param)
      board_info.error = 0;
    } catch (e) {
      board_info.error = -1;
      board_info.message = e.sqlMessage;
    }
    return board_info
  }

  updateStatuss = async (params, arr_board_seq) => {
    const result = {};
    result.error = 0;
    result.mesage = '';
    try {
      const result = await this.database
        .from(this.table_name)
        .whereIn('seq', arr_board_seq)
        .update(params);
      // logger.debug(result);
    }catch (e) {
      result.error = 0;
      result.mesage = '';
    }
    return result;
  }

  updateStatus  = async (board_seq, board_info) => {
    const update_param = {};
    update_param.used =  board_info.used;
    update_param.admin_text = board_info.admin_text;
    // logger.debug(board_info, update_param);
    if (update_param.used===undefined){
      board_info.error = -1;
      board_info.message = 'error';
      return  board_info
    }
    try{
      const board_info_seq = await this.update({ seq: board_seq }, update_param)
      board_info.error = 0;
    } catch (e) {
      board_info.error = -1;
      board_info.message = e.sqlMessage;
    }
    return board_info
  }

  getBoardInfoById = async (board_seq) => {
    const query_result = await this.findOne({'seq': board_seq})
    // logger.debug('[query_result]', query_result);
    if (query_result && query_result.regist_date) {
      query_result.regist_date = Util.dateFormat(query_result.regist_date.getTime())
    }
    return new JsonWrapper(query_result, this.private_fields)
  }

  getBoardInfo = async (board_seq) => {
    const query_result = await this.findOne({ seq: board_seq })
    console.log('getMemberInfo')
    console.log(query_result)
    if (query_result && query_result.regist_date) {
      query_result.regist_date = Util.dateFormat(query_result.regist_date.getTime())
    }
    // return new MemberInfo(query_result, this.private_fields)
    return new JsonWrapper(query_result, this.private_fields)
  }

  getBoardcount = async () => {
    const oKnex = this.database.select([
      this.database.raw('count(*) `all_count`'),
      this.database.raw('count(case when used = 0 then 1 end) `appr_count`'),
      this.database.raw('count(case when used = 1 then 1 end) `used_count`'),
      this.database.raw('count(case when used in (3, 6) then 1 end) `reject_count`'),
    ])
      .from('board')
    const result = await oKnex
    if (result[0]){
      return result[0];
    }
    return {};
  }

  getBoardList = async (options, board_code, search_keyword) => {
    const page = options.page
    const limit = options.limit

    const oKnex = this.database.select(this.database.raw('board.*'), this.database.raw('member.user_name')).from(this.table_name)
    oKnex.innerJoin('member', 'member.seq', `${this.table_name}.reg_member_seq`)
    oKnex.where('board_code', '>' , 0)
    if (board_code) {
      oKnex.andWhere('board_code', board_code)
    }
    if (search_keyword) {
      oKnex.where((builder) => {
        builder.andWhere('subject', 'like', `%${search_keyword}%`)
        builder.orWhere('content', 'like', `%${search_keyword}%`)
      })
    }
    oKnex.orderBy('seq', 'desc')

    return this.queryPaginated(oKnex, limit, page)
  }
}
