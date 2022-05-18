import _ from 'lodash'
import MySQLModel from '../../mysql-model'
import Util from '../../../utils/Util'
import GroupMemberInfo from '../../../wrapper/member/GroupMemberInfo'
import log from '../../../libs/logger'
import Constants from '../../../constants/constants'
import ServiceConfig from "../../../service/service-config";

export default class GroupMemberModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'group_member'
    this.selectable_fields = ['*']
    this.log_prefix = '[GroupMemberModel]'
    this.group_member_select = [
      'group_member.seq AS group_member_seq', 'group_member.member_seq AS member_seq', 'group_member.used_storage_size', 'group_member.max_storage_size', 'group_member.grade',
      'group_member.status AS group_member_status', 'group_member.join_date', 'group_member.ban_date', 'group_member.ban_member_seq', 'group_member.ban_reason',
      'group_member.invite_email', 'group_member.invite_status', 'group_member.invite_date', 'group_member.invite_code',
      'group_member.pause_sdate', 'group_member.pause_edate', 'group_member.pause_member_seq', 'group_member.pause_reason', 'group_member.pause_count',
      'member.user_name', 'member.user_nickname', 'member.user_id', 'member.email_address', 'member.hospname', 'member.treatcode', 'member.used', 'group_member.join_answer', 'member.user_type',
      'group_member.vid_cnt', 'group_member.anno_cnt', 'group_member.comment_cnt', 'group_member.board_cnt', 'group_member.board_comment_cnt', 'member.profile_image_path', 'group_member.ban_hide'
    ]
    this.member_group_select = [
      'group_member.seq AS group_member_seq', 'group_member.status AS group_member_status', 'group_member.grade', 'group_member.invite_email',
      'group_member.join_date', 'group_member.used_storage_size', 'group_member.max_storage_size', 'group_member.member_seq',
      'group_info.seq AS group_seq', 'group_info.group_type', 'group_info.status AS group_status', 'group_info.group_name', 'group_info.domain',
      'group_info.storage_size AS group_max_storage_size', 'group_info.used_storage_size AS group_used_storage_size', 'group_info.media_path', 'group_info.disable_box',
      'group_info.profile_image_path', 'group_info.profile_image_path as profile_image_url', 'group_info.profile', 'group_info.is_set_group_name',
      'group_info.search_keyword', 'group_info.group_explain', 'group_info.group_open', 'group_info.group_join_way', 'group_info.member_open', 'group_info.member_name_used',
      'group_member.ban_date', 'group_info.reg_date', 'group_info.member_count', 'group_member.pause_sdate', 'group_member.pause_edate'
    ]
    this.member_group_select_old = [
      'group_member.seq AS group_member_seq', 'group_member.status AS group_member_status', 'group_member.grade', 'group_member.invite_email',
      'group_member.join_date', 'group_member.used_storage_size', 'group_member.max_storage_size', 'group_member.member_seq',
      'group_info.seq AS group_seq', 'group_info.group_type', 'group_info.status AS group_status', 'group_info.group_name', 'group_info.gnb_color', 'group_info.domain',
      'group_info.storage_size AS group_max_storage_size', 'group_info.used_storage_size AS group_used_storage_size', 'group_info.media_path', 'group_info.disable_box',
      'group_info.profile_image_path', 'group_info.profile_image_path as profile_image_url', 'group_info.profile', 'group_info.is_set_group_name',
      'group_info.search_keyword', 'group_info.group_explain', 'group_info.group_open', 'group_info.group_join_way', 'group_info.member_open', 'group_info.member_name_used',
      'group_info.reg_date', 'group_info.member_count', 'group_member.status AS member_status', 'group_member.grade', 'group_info.channel_top_img_path', 'group_info.channel_top_img_path as channel_top_img_url',
      'group_counts.*'
    ]

    this.group_invite_select = [
      'group_member.invite_code', 'group_member.member_seq AS join_member_seq', 'group_member.seq AS invite_seq', 'group_member.grade',
      'group_member.status AS group_member_status', 'group_member.join_date', 'group_member.invite_status', 'group_member.invite_email', 'group_member.invite_date',
      'group_info.seq AS group_seq', 'group_info.group_type', 'group_info.status AS group_status', 'group_info.domain',
      'group_info.group_name', 'group_info.expire_date AS group_expire_date',
      'group_info.storage_size AS group_max_storage_size', 'group_info.used_storage_size AS group_used_storage_size',
      'payment_list.name AS plan_name', 'payment_list.desc AS plan_desc',
      'member.user_name AS invite_user_name', 'member.user_nickname AS invite_user_nickname'
    ]

    this.group_invite_private_fields = [
      'invite_code', 'invite_status', 'join_member_seq', 'grade', 'group_member_status', 'group_seq', 'group_type', 'group_status'
    ]
    this.group_member_private_fields = ['member_seq', 'media_path']

    this.group_member_seq_select = [
      'member.seq AS member_seq'
    ]
  }

  getParams = (group_member_info, is_set_modify_date = true, ignore_empty = true) => {
    if (!(group_member_info instanceof GroupMemberInfo)) {
      group_member_info = new GroupMemberInfo(group_member_info)
    }
    group_member_info.setIgnoreEmpty(ignore_empty)
    const params = group_member_info.toJSON()
    if (Util.isNumber(params.ban_date)) {
      params.ban_date = this.database.raw(`FROM_UNIXTIME(${params.ban_date})`)
    }
    if (Util.isNumber(params.join_date)) {
      params.join_date = this.database.raw(`FROM_UNIXTIME(${params.join_date})`)
    }
    if (Util.isNumber(params.invite_date)) {
      params.invite_date = this.database.raw(`FROM_UNIXTIME(${params.invite_date})`)
    }
    if (is_set_modify_date) {
      params.modify_date = this.database.raw('NOW()')
    }
    return params
  }

  createGroupMember = async (group_info, member_info, grade, max_storage_size, status = null, answer = null) => {
    const group_member_info = {
      group_seq: group_info.seq,
      member_seq: member_info.seq,
      invite_email: member_info.email_address,
      max_storage_size: max_storage_size ? max_storage_size : group_info.storage_size,
      used_storage_size: 0,
      grade: grade,
      status: status ? status : 'Y',
      join_date: Util.getCurrentTimestamp(),
      join_answer: answer,
    }
    const create_params = this.getParams(group_member_info)
    const group_member_seq = await this.create(create_params, 'seq')
    group_member_info.seq = group_member_seq
    if (!(group_member_info instanceof GroupMemberInfo)) {
      return new GroupMemberInfo(group_member_info)
    }
    group_member_info.addKey('seq')
    return group_member_info
  }

  getGroupMemberQueryOLD = (member_seq = null, group_seq = null, group_member_seq = null, status = null) => {
    const filter = {}
    if (member_seq) {
      filter['group_member.member_seq'] = member_seq
    }
    if (group_member_seq) {
      filter['group_member.seq'] = group_member_seq
    }
    if (group_seq) {
      filter['group_member.group_seq'] = group_seq
    }
    if (status) {
      filter['group_member.status'] = status
    }
    const in_raw = this.database.raw("group_info.status IN ('Y', 'P', 'F')")
    const query = this.database.select(this.member_group_select_old)
    query.from('group_member')
    query.innerJoin("group_info", function() {
      this.on("group_info.seq", "group_member.group_seq")
        .andOn(in_raw)
    })
    query.innerJoin('group_counts', 'group_counts.group_seq', 'group_info.seq')
    query.where(filter)
    query.orderBy([{column: 'group_info.group_type', order: 'desc'}, { column: 'group_member.join_date', order: 'desc' }]);

    return query
  }

  getGroupMemberQuery = (member_seq = null, group_seq = null, group_member_seq = null, status = null, option = null, page = null) => {
    const filter = {}
    if (member_seq) {
      filter['group_member.member_seq'] = member_seq
    }
    if (group_member_seq) {
      filter['group_member.seq'] = group_member_seq
    }
    if (group_seq) {
      filter['group_member.group_seq'] = group_seq
    }
    let status_in = [];
    if (option) {
      if (option.group_type) {
        filter['group_info.group_type'] = option.group_type;
      }
      if (option.grade) {
        filter['group_member.grade'] = option.grade;
      }
      if (option.status !== null) {
        if (option.status === 'J') {
          status_in.push('J', 'C');
        } else if (option.status === 'D'){
          status_in.push('D', 'B');
        } else {
          if (typeof option.status === 'object') {
            status_in = option.status;
          } else {
            status_in.push(option.status);
          }
        }
      } else if (status) {
        if (status !== 'D') {
          status_in.push(status);
        } else if (status === 'D') {
          status_in.push('D', 'B');
        }
      }
    } else {
      if (status && status !== 'D') {
        status_in.push(status);
      } else if (status === 'D') {
        status_in.push('D', 'B');
      }
    }
    const in_raw = this.database.raw('group_info.status IN (\'Y\', \'F\')')
    if (option) {
      if (option.member_count) {
        this.member_group_select.push('member_count.count AS member_count');
      }
      if (_.includes(option.manager, '2')) {
        this.member_group_select.push('grade_info.grade AS grade_info');
      }
    }
    const query = this.database.select(this.member_group_select)
    query.from('group_member')
    query.innerJoin('group_info', function () {
      this.on('group_info.seq', 'group_member.group_seq')
        .andOn(in_raw)
    })
    if (option) {
      if (option.member_count) {
        query.joinRaw('LEFT JOIN (SELECT group_seq, COUNT(*) AS count FROM group_member WHERE status NOT IN ("D", "C", "N", "L") GROUP BY group_seq) AS member_count ON (member_count.group_seq = group_info.seq)')
      }
      if (_.includes(option.manager, '2')) {
        query.joinRaw('LEFT JOIN (SELECT group_seq, CONCAT("[", GROUP_CONCAT(CONCAT("{\\"grade\\": \\"", grade, "\\", \\"grade_text\\": \\"", grade_text, "\\" }")), "]") AS grade FROM group_grade GROUP BY group_seq) AS grade_info ON (grade_info.group_seq = group_info.seq)')
      }
    }

    query.where(filter)
    if (status_in && status_in.length > 0) {
      query.whereIn('group_member.status', status_in)
    }
    if (option) {
      if (option.manager) {
        if (option.manager === '1') {
          query.whereRaw('group_member.grade IN ("O", "6")');
        } else if (option.manager === '2') {
          query.whereRaw('group_member.grade NOT IN ("O", "6")');
        }
      }
      if (option.status === 'D') {
        query.where('group_member.ban_hide', 'N')
      }
    }
    if (page) {
      if (page.orderby === '1') {
        query.orderBy('group_info.group_name', 'ASC');
      } else if (page.orderby === '2') {
        query.orderBy('group_member.join_date', 'DESC');
      } else if (page.orderby === '3') {
        query.orderBy('group_info.reg_date', 'DESC');
      } else if (page.orderby === '4') {
        query.orderBy('group_member.ban_date', 'DESC');
      } else {
        query.orderBy('group_member.seq', 'desc')
      }
    } else {
      // query.orderBy('group_member.seq', 'desc')
      query.orderBy('group_info.seq', 'asc');
    }
    return query
  }

  getMemberGroupList = async (member_seq, status = null, private_keys = null, filter = null, page = null) => {
    const query = this.getGroupMemberQuery(member_seq, null, null, status, filter, page)
    const query_result = await query
    return this.getFindResultList(query_result, private_keys ? private_keys : this.group_member_private_fields)
  }

  getMemberGroupListOLD = async (member_seq, status = null, private_keys = null) => {
    const query = this.getGroupMemberQueryOLD(member_seq, null, null, status)
    const query_result = await query
    return this.getFindResultList(query_result, private_keys ? private_keys : this.group_member_private_fields)
  }

  getMemberGroupInfoWithGroup = async (group_seq, member_seq, status = null, private_keys = null) => {
    const query = this.getGroupMemberQueryOLD(member_seq, group_seq, null, status)
    query.first()
    const query_result = await query
    return new GroupMemberInfo(query_result, private_keys ? private_keys : this.group_member_private_fields)
  }

  getGroupMemberInfoBySeq = async (group_member_seq, private_keys = null) => {
    const query = this.getGroupMemberQueryOLD(null, null, group_member_seq)
    query.first()
    const query_result = await query
    return new GroupMemberInfo(query_result, private_keys ? private_keys : this.group_member_private_fields)
  }

  getGroupMemberList = async (group_seq, member_seq, member_type = null, paging = {}, search_field = null, search_text = null, order = null, videos_count = null, get_pause_name = null, get_delete_name = null, detail_search = null, member_grade = null, non_admin = null, is_me_noninclude = true) => {
    const filter = {
      group_seq
    }
    let status = null
    if (member_type && member_type !== 'all') {
      if (member_type === 'active') {
        status = ['Y']
      } else if (member_type === 'pause') {
        status = ['P']
      } else if (member_type === 'delete') {
        status = ['D', 'L', 'B']
      } else if (member_type === 'invite') {
        filter['group_member.status'] = 'N'
        status = ['N']
      } else if (member_type === 'join') {
        status = ['J']
      } else if (member_type === 'all_not_in_ban') {
        status = ['Y', 'P']
      }
    }
    if (member_grade && member_grade !== '0') {
      filter['group_member.grade'] = member_grade;
    }
    const isSelect = this.group_member_select;
    if (get_pause_name) {
      isSelect.push('submit_member_name');
    }
    if (get_delete_name) {
      isSelect.push('submit_member_name');
    }
    const query = this.database.select(isSelect)
    query.from('group_member')
    query.leftOuterJoin('member', { 'member.seq': 'group_member.member_seq' })
    if (get_pause_name) {
      query.joinRaw('LEFT JOIN (SELECT seq AS submit_member_seq, user_name AS submit_member_name FROM `member`) AS submit_member ON (`group_member`.`pause_member_seq` = `submit_member`.`submit_member_seq`)')
    }
    if (get_delete_name) {
      query.joinRaw('LEFT JOIN (SELECT seq AS submit_member_seq, user_name AS submit_member_name FROM `member`) AS submit_member ON (`group_member`.`ban_member_seq` = `submit_member`.`submit_member_seq`)')
    }
    query.where(filter)
    if (status && status.length > 0) {
      query.whereIn('group_member.status', status)
    }
    if (non_admin === 'Y') {
      query.andWhere('group_member.grade', '!=', 'O');
    } else if (non_admin === 'OnlyManager') {
      query.andWhere(function () {
        this
          .where('group_member.grade', '=', 'O')
          .orWhere('group_member.grade', '=', '6')
      })
    }
    if (is_me_noninclude) {
      query.andWhere('group_member.member_seq', '!=', member_seq)
    }
    if (search_text) {
      if (search_field) {
        query.andWhere(search_field, 'like', `%${search_text}%`)
      } else {
        query.andWhere(function () {
          this
            .where('member.user_name', 'like', `%${search_text}%`)
            .orWhere('group_member.invite_email', 'like', `%${search_text}%`)
            .orWhere('member.email_address', 'like', `%${search_text}%`)
            .orWhere('member.treatcode', 'like', `%${search_text}%`)
        })
      }
    }
    if (detail_search) {
      // detail_search
      if (detail_search.mem_name) {
        query.andWhere('member.user_name', 'like', `%${detail_search.mem_name}%`);
      }
      if (detail_search.mem_id) {
        query.andWhere('member.user_id', 'like', `%${detail_search.mem_id}%`);
      }
      if (detail_search.mem_nickname) {
        query.andWhere('member.user_nickname', 'like', `%${detail_search.mem_nickname}%`);
      }
      if (detail_search.mem_upload_scount) {
        query.andWhere('group_member.vid_cnt', '>=', `${detail_search.mem_upload_scount}`);
      }
      if (detail_search.mem_upload_ecount) {
        query.andWhere('group_member.vid_cnt', '<=', `${detail_search.mem_upload_ecount}`);
      }
      if (detail_search.reg_sdate) {
        query.andWhereRaw(`group_member.join_date >= date_format('${detail_search.reg_sdate}', '%Y-%m-%d 00:00:00')`);
      }
      if (detail_search.reg_edate) {
        query.andWhereRaw(`group_member.join_date <= date_format('${detail_search.reg_edate}', '%Y-%m-%d 23:59:59')`);
      }
      if (detail_search.mem_grade_select) {
        query.andWhere('group_member.grade', '=', `${detail_search.mem_grade_select}`);
      }
      if (detail_search.mem_used_sdrive) {
        let storeage_size_s = 0;
        if (detail_search.mem_upload_drive_select === 'MB') {
          storeage_size_s = 1024 * 1024 * Number(detail_search.mem_used_sdrive);
        } else if (detail_search.mem_upload_drive_select === 'GB') {
          storeage_size_s = 1024 * 1024 * 1024 * Number(detail_search.mem_used_sdrive);
        } else if (detail_search.mem_upload_drive_select === 'TB') {
          storeage_size_s = 1024 * 1024 * 1024 * 1024 * Number(detail_search.mem_used_sdrive);
        }
        query.andWhere('group_member.used_storage_size', '>=', storeage_size_s);
      }
      if (detail_search.mem_used_edrive) {
        let storeage_size_e = 0;
        if (detail_search.mem_upload_drive_select === 'MB') {
          storeage_size_e = 1024 * 1024 * Number(detail_search.mem_used_edrive);
        } else if (detail_search.mem_upload_drive_select === 'GB') {
          storeage_size_e = 1024 * 1024 * 1024 * Number(detail_search.mem_used_edrive);
        } else if (detail_search.mem_upload_drive_select === 'TB') {
          storeage_size_e = 1024 * 1024 * 1024 * 1024 * Number(detail_search.mem_used_edrive);
        }
        query.andWhere('group_member.used_storage_size', '<=', storeage_size_e);
      }
      if (detail_search.select_depart_list) {
        query.whereRaw('JSON_VALID(treatcode) = 1');
        const depart_list = JSON.parse(detail_search.select_depart_list);
        if (detail_search.select_depart_type === 1) {
          for (const index in depart_list) {
            query.whereRaw(`JSON_SEARCH(JSON_EXTRACT(treatcode, '$[*].code'), 'all', '${depart_list[index].code}') IS NOT NULL `);
          }
        } else if (detail_search.select_depart_type === 2) {
          query.andWhere(function () {
            for (const index in depart_list) {
              this
                .orWhereRaw(`JSON_SEARCH(JSON_EXTRACT(treatcode, '$[*].code'), 'all', '${depart_list[index].code}') IS NOT NULL `)
            }
          })
        }
      }
    }
    if (order) {
      query.orderBy(order)
    }

    const query_result = await this.queryPaginated(query, paging.list_count, paging.cur_page, paging.page_count, paging.no_paging)
    query_result.data = this.getFindResultList(query_result.data, null)
    return query_result
  }

  getFindResultList = (query_result, private_keys = null) => {
    const result_list = []
    if (!query_result) {
      return result_list
    }
    if (Util.isArray(query_result)) {
      for (let i = 0; i < query_result.length; i++) {
        result_list.push(new GroupMemberInfo(query_result[i], private_keys))
      }
    } else {
      result_list.push(new GroupMemberInfo(query_result, private_keys))
    }
    return result_list
  }

  getActiveGroupMemberSeqList = async (group_seq) => {
    const filter = {
      'group_member.group_seq': group_seq,
      'group_member.status': 'Y',
    }
    const query = this.database.select(this.group_member_seq_select)
    query.from(this.table_name)
    query.leftOuterJoin('member', { 'group_member.member_seq': 'member.seq' })
    query.where(filter)
    const query_result = await query
    const user_seq_list = []
    if (query_result && query_result.length) {
      for (let i = 0; i < query_result.length; i++) {
        user_seq_list.push(query_result[i].member_seq)
      }
    }
    return user_seq_list
  }

  getAdminGroupMemberSeqList = async (group_seq) => {
    const filter = {
      'group_member.group_seq': group_seq,
      'group_member.status': 'Y'
    }
    const query = this.database.select(this.group_member_seq_select)
    query.from(this.table_name)
    query.leftOuterJoin('member', { 'group_member.member_seq': 'member.seq' })
    query.where(filter)
    query.whereIn('group_member.grade', ['A', 'O'])
    const query_result = await query
    const user_seq_list = []
    if (query_result && query_result.length) {
      for (let i = 0; i < query_result.length; i++) {
        user_seq_list.push(query_result[i].member_seq)
      }
    }
    return user_seq_list
  }

  getMemberSeqByGroupMemberSeq = async (group_member_seq) => {
    const filter = {
      'group_member.seq': group_member_seq
    }
    const query = this.database.select(['member_seq'])
    query.from(this.table_name)
    query.where(filter)
    query.first()
    const query_result = await query
    return query_result && query_result.member_seq ? query_result.member_seq : null
  }

  getGroupMemberCount = async (group_seq, status) => {
    const select = ['COUNT(*) AS total_count']
    const filter = {
      group_seq
    }
    if (status) {
      filter.status = status
    }
    const find_result = await this.findOne(filter, select)
    if (!find_result) {
      return 0
    }
    return Util.parseInt(find_result.total_count, 0)
  }

  changeMemberGrade = async (group_member_seq = null, grade, member_seq = null, group_seq = null) => {
    const filter = {}
    if (group_member_seq) {
      filter.seq = group_member_seq;
    }
    if (member_seq && group_seq) {
      filter.member_seq = member_seq;
      filter.group_seq = group_seq;
    }
    const update_params = {
      grade,
      modify_date: this.database.raw('NOW()')
    }
    const update_result = await this.update(filter, update_params)
    log.debug(this.log_prefix, '[changeMemberGrade]', update_result)
    return update_result
  }

  changeMemberStatus = async (group_member_seq = null, status, member_seq = null, group_seq = null) => {
    const filter = {}
    if (group_member_seq) {
      filter.seq = group_member_seq;
    }
    if (member_seq && group_seq) {
      filter.member_seq = member_seq;
      filter.group_seq = group_seq;
    }
    const update_params = {
      status,
      modify_date: this.database.raw('NOW()')
    }
    const update_result = await this.update(filter, update_params)
    log.debug(this.log_prefix, '[changeMemberStatus]', update_result)
    return update_result
  }

  banMember = async (group_member_seq, ban_member_seq, used_storage_size = null) => {
    const filter = {
      seq: group_member_seq
    }
    const update_params = {
      status: 'D',
      modify_date: this.database.raw('NOW()'),
      ban_date: this.database.raw('NOW()'),
      ban_member_seq: ban_member_seq
    }
    if (used_storage_size) {
      update_params.used_storage_size = used_storage_size
    }
    const update_result = await this.update(filter, update_params)
    log.debug(this.log_prefix, '[banMember]', update_result)
    return update_result
  }

  restoreMemberStatus = async (group_member_seq) => {
    const filter = {
      seq: group_member_seq
    }
    const update_params = {
      status: 'Y',
      modify_date: this.database.raw('NOW()'),
      ban_date: null,
      ban_member_seq: null
    }
    const update_result = await this.update(filter, update_params)
    log.debug(this.log_prefix, '[restoreMemberStatus]', update_result)
    return update_result
  }

  updateStorageUsedSizeByMemberSeq = async (group_seq, member_seq, used_storage_size) => {
    const filter = {
      group_seq,
      member_seq
    }
    return await this.updateStorageUsedSize(filter, used_storage_size)
  }

  updateStorageUsedSize = async (filter, used_storage_size) => {
    const update_params = {
      used_storage_size,
      modify_date: this.database.raw('NOW()')
    }
    return await this.update(filter, update_params)
  }

  updateGroupMemberMaxStorageSize = async (group_seq, max_storage_size) => {
    const filter = {
      group_seq,
    }
    const update_params = {
      max_storage_size,
      modify_date: this.database.raw('NOW()')
    }
    return await this.update(filter, update_params)
  }

  getGroupMemberInfoByInviteEmail = async (group_seq, email_address) => {
    const filter = {
      group_seq,
      invite_email: email_address
    }
    const find_result = await this.findOne(filter)
    return new GroupMemberInfo(find_result)
  }

  isAvailableInviteCode = async (invite_code) => {
    const select = ['COUNT(*) AS total_count']
    const filter = {
      invite_code
    }
    const find_result = await this.findOne(filter, select)
    if (!find_result) {
      return true
    }
    return Util.parseInt(find_result.total_count, 0) === 0
  }

  createGroupInvite = async (group_seq, invite_member_seq, invite_code, email_address) => {
    const create_params = {
      group_seq: group_seq,
      invite_code,
      invite_member_seq,
      invite_email: email_address,
      invite_status: 'S',
      invite_date: this.database.raw('NOW()')
    }
    const group_member_seq = await this.create(create_params, 'seq')
    create_params.seq = group_member_seq
    return new GroupMemberInfo(create_params, ['invite_date'])
  }

  resetInviteInfo = async (group_member_seq, invite_code, member_info) => {
    const filter = {
      seq: group_member_seq
    }
    const update_params = {
      invite_code,
      invite_status: 'S',
      invite_date: this.database.raw('NOW()'),
      invite_member_seq: member_info.seq,
    }
    const query_result = await this.update(filter, update_params)
    log.debug(this.log_prefix, '[resetInviteInfo]', query_result)
    return query_result
  }

  getGroupInviteInfo = async (invite_code, invite_seq = null, private_keys = null) => {
    const filter = {}
    if (invite_seq) {
      filter.seq = invite_seq
    } else {
      filter.invite_code = invite_code
    }

    const group_member_query = this.database.select(['*'])
    group_member_query.from(this.table_name)
    group_member_query.where(filter)
    group_member_query.first()

    const query = this.database.select(this.group_invite_select)
    query.from(group_member_query.clone().as('group_member'))
    query.innerJoin('group_info', { 'group_info.seq': 'group_member.group_seq' })
    query.innerJoin('payment_list', { 'payment_list.code': 'group_info.pay_code' })
    query.leftOuterJoin('member', { 'member.seq': 'group_member.invite_member_seq' })
    query.first()

    const query_result = await query
    return new GroupMemberInfo(query_result, private_keys ? private_keys : this.group_invite_private_fields)
  }

  updateInviteStatus = async (group_member_seq, invite_status, error = null) => {
    const filter = {
      seq: group_member_seq
    }
    const update_params = {
      invite_status,
      modify_date: this.database.raw('NOW()')
    }
    if (error) {
      update_params.invite_error = error
    }
    const update_result = await this.update(filter, update_params)
    log.debug(this.log_prefix, '[updateInviteStatus]', update_result)
    return update_result
  }

  inviteConfirm = async (group_member_seq, member_seq, max_storage_size = 0, change_grade = null, status = 'Y') => {
    const filter = {
      seq: group_member_seq
    }
    const update_params = {
      member_seq,
      status: status,
      invite_code: null,
      invite_status: 'Y',
      max_storage_size: max_storage_size,
      join_date: this.database.raw('NOW()'),
      modify_date: this.database.raw('NOW()')
    }
    if (change_grade) {
      update_params.grade = change_grade;
    }
    return await this.update(filter, update_params)
  }

  deleteGroupMemberInfo = async (group_seq, group_member_seq) => {
    const filter = {
      seq: group_member_seq,
      group_seq
    }
    return this.delete(filter)
  }

  getGroupMemberSummary = async (group_seq) => {
    const filter = {
      group_seq: group_seq
    }
    const select_fields = []
    select_fields.push(this.database.raw('COUNT(*) AS total_count'))
    select_fields.push(this.database.raw('SUM(IF(`status` != \'N\', 1, 0)) AS member_count'))
    select_fields.push(this.database.raw('SUM(IF(`status` = \'Y\', 1, 0)) AS active_count'))
    select_fields.push(this.database.raw('SUM(IF(`status` = \'P\', 1, 0)) AS pause_count'))
    select_fields.push(this.database.raw('SUM(IF(`status` = \'D\', 1, 0)) AS delete_count'))
    select_fields.push(this.database.raw('SUM(IF(`status` = \'N\' AND invite_status = \'Y\', 1, 0)) AS invite_count'))
    select_fields.push(this.database.raw('SUM(IF(`status` = \'J\', 1, 0)) AS join_count'))
    const query = this.database.select(select_fields)
    query.from(this.table_name)
    query.joinRaw('LEFT JOIN (SELECT seq, group_type FROM group_info) AS GI ON (group_member.group_seq = GI.seq)')
    query.where(filter)
    query.andWhere('status', 'Y')
    query.first()

    const query_result = await query
    log.debug(this.log_prefix, '[getGroupMemberSummary]', query_result)
    return query_result
  }

  joinConfirm = async (group_member_seq) => {
    const filter = {
      seq: group_member_seq
    }
    const update_params = {
      status: 'Y',
      join_date: this.database.raw('NOW()'),
      modify_date: this.database.raw('NOW()')
    }
    return await this.update(filter, update_params)
  }

  updatePauseList = async (group_seq, seq_list, request_body, status) => {
    const update_params = {
      status: status,
      pause_reason: request_body.pause_reason,
      pause_sdate: request_body.pause_sdate,
      pause_member_seq: request_body.ban_member,
      pause_edate: request_body.pause_edate ? request_body.pause_edate : null,
      pause_count: this.database.raw('pause_count + 1'),
      modify_date: this.database.raw('NOW()'),
    }
    return this.database
      .update(update_params)
      .from(this.table_name)
      .where('group_seq', group_seq)
      .whereIn('seq', seq_list)
  }

  updateBanList = async (group_seq, seq_list, request_body, status, grade = 1) => {
    const update_params = {
      status: status,
      grade: grade,
      ban_hide: 'N',
      ban_reason: request_body.ban_reason,
      ban_member_seq: request_body.ban_member,
      ban_date: status === 'D' ? this.database.raw('NOW()') : null,
      modify_date: this.database.raw('NOW()'),
    }
    return this.database
      .update(update_params)
      .from(this.table_name)
      .where('group_seq', group_seq)
      .whereIn('seq', seq_list)
  }

  groupJoinList = async (group_seq, join_list, status) => {
    const filter = {
      group_seq: group_seq
    }
    const update_params = {
      status: status,
      join_date: this.database.raw('NOW()'),
      modify_date: this.database.raw('NOW()'),
      grade: '1',
    }
    for (let cnt = 0; cnt < join_list.length; cnt++) {
      filter.seq = join_list[cnt];
      await this.update(filter, update_params);
    }
    return true;
  }

  updateGradeList = async (group_seq, change_member_info) => {
    const filter = {
      group_seq: group_seq
    }
    const update_params = {
      grade: change_member_info.grade,
      modify_date: this.database.raw('NOW()'),
    }
    for (let cnt = 0; cnt < change_member_info.change_list.length; cnt++) {
      filter.seq = change_member_info.change_list[cnt];
      await this.update(filter, update_params);
    }
    return true;
  }

  updateMemberContentsInfo = async (group_seq, target_info) => {
    const filter = {
      group_seq: group_seq
    }
    const update_params = {
      vid_cnt: 0,
      anno_cnt: 0,
      comment_cnt: 0,
      modify_date: this.database.raw('NOW()'),
    }
    for (let cnt = 0; cnt < target_info.target_list.length; cnt++) {
      filter.seq = target_info.target_list[cnt];
      await this.update(filter, update_params);
    }
    return true;
  }

  getMemberGroupAllCount = async (member_seq, option) => {
    const filter = {
      member_seq: member_seq
    }
    if (option) {
      if (option.group_type) {
        filter.group_type = option.group_type;
      }
    }
    const select_fields = []
    select_fields.push(this.database.raw('COUNT(*) AS total_count'))
    select_fields.push(this.database.raw('SUM(IF(`status` IN (\'Y\', \'P\'), 1, 0)) AS mygroup_count'))
    select_fields.push(this.database.raw('SUM(IF((`status` = \'J\' OR `status` = \'C\') and grade NOT IN (\'O\', \'6\'), 1, 0)) AS join_wait_count'))
    select_fields.push(this.database.raw('SUM(IF(`status` = \'Y\' and grade IN (\'O\', \'6\'), 1, 0)) AS manage_count'))
    select_fields.push(this.database.raw('SUM(IF((`status` = \'D\' OR `status` = \'B\'), 1, 0) AND `ban_hide` = \'N\') AS ban_count'))
    const query = this.database.select(select_fields)
    query.from(this.table_name)
    query.joinRaw('LEFT JOIN (SELECT seq, group_type FROM group_info WHERE status != \'X\') AS GI ON (group_member.group_seq = GI.seq)')
    query.where(filter)
    query.first()

    const query_result = await query
    log.debug(this.log_prefix, '[getMemberGroupAllCount]', query_result)
    return query_result
  }

  updateMemberStatus = async (group_seq, ban_info) => {
    const filter = {
      group_seq: ban_info.group_seq,
    }
    let update_params = {};
    if (ban_info.status === 'D' || ban_info.status === 'B') {
      update_params = {
        status: ban_info.status,
        ban_reason: ban_info.ban_reason,
        ban_member_seq: ban_info.ban_member ? ban_info.ban_member : null,
        ban_date: this.database.raw('NOW()'),
        modify_date: this.database.raw('NOW()'),
      }
    } else if (ban_info.status === 'N') {
      update_params = {
        status: ban_info.status,
        ban_reason: ban_info.ban_reason,
        ban_member_seq: ban_info.ban_member ? ban_info.ban_member : null,
        modify_date: this.database.raw('NOW()'),
      }
    } else if (ban_info.status === 'L') {
      update_params = {
        ban_hide: 'Y',
        modify_date: this.database.raw('NOW()'),
      }
    } else {
      update_params = {
        status: ban_info.status,
        modify_date: this.database.raw('NOW()'),
      }
    }
    filter.seq = ban_info.group_member_seq;
    await this.update(filter, update_params);
    return true;
  }

  getGroupMemberDetailQuery = async (group_seq, group_member_seq, member_seq) => {
    const filter = {
      group_seq: group_seq,
    }
    if (group_member_seq) {
      filter['group_member.seq'] = group_member_seq;
    }
    if (member_seq) {
      filter['group_member.member_seq'] = member_seq;
    }
    this.group_member_select.push('member.profile_image_path');
    const query = this.database.select(this.group_member_select)
    query.from(this.table_name)
    query.innerJoin('member', (query) => {
      query.on('member.seq', 'group_member.member_seq')
    });
    query.where(filter)
    query.first()

    return query
  }

  updateGroupMemberContentCount = async (group_seq, member_seq, update_column, type, count = 1) => {
    const set_count = count;
    const filter = {
      group_seq,
      member_seq
    };
    const update_params = {}
    if (update_column === 'vid') {
      update_params.vid_cnt = set_count;
    } else if (update_column === 'file') {
      update_params.file_cnt = set_count;
    } else if (update_column === 'anno') {
      update_params.anno_cnt = set_count;
    } else if (update_column === 'vid_comment') {
      update_params.comment_cnt = set_count;
    } else if (update_column === 'board_comment') {
      update_params.board_comment_cnt = set_count;
    } else if (update_column === 'board_cnt') {
      update_params.board_cnt = set_count;
    }
    let update_result = null;
    if (type === Constants.UP) {
      update_result = await this.increment(filter, update_params)
    } else if (type === Constants.DOWN) {
      update_result = await this.decrement(filter, update_params)
    }
    return update_result
  }
  getGroupMemberInfo = async (group_seq, member_seq) => {
    const filter = {
      member_seq: member_seq,
      group_seq: group_seq,
    }
    const query = this.database.select(['*'])
    query.from(this.table_name)
    query.where(filter)
    query.first()

    return query
  }

  updateGroupMemberJoin = async (group_seq, member_seq = null, group_member_seq = null, params) => {
    const filter = {
      group_seq: group_seq
    }
    if (!member_seq && !group_member_seq) {
      return false;
    }
    if (member_seq) {
      filter['member_seq'] = member_seq;
    }
    if (group_member_seq) {
      filter['seq'] = group_member_seq;
    }
    const update_params = {
      grade: params.grade,
      status: params.status,
      join_date: this.database.raw('NOW()'),
      modify_date: this.database.raw('NOW()'),
      join_answer: params.answer,
      ban_hide: params.ban_hide,
    }
    const update_result = await this.update(filter, update_params)
    log.debug(this.log_prefix, '[changeMemberGrade]', update_result)
    return update_result
  }

  setPauseMemberReset = async () => {
    return this.database.raw('UPDATE group_member SET status = \'Y\', pause_edate = null WHERE status = \'p\' AND pause_edate <= now() AND pause_edate IS NOT NULL')
  }

  setInviteInfoMerge = async (invite_info, group_seq, member_seq) => {
    const delete_filter = {
      seq: invite_info.invite_seq
    }
    await this.delete(delete_filter)

    const filter = {
      group_seq,
      member_seq
    }
    const update_params = {
      invite_code: invite_info.invite_code,
      invite_email: invite_info.invite_email,
      invite_status: invite_info.invite_status,
      invite_date: invite_info.invite_date,
    }
    return await this.update(filter, update_params)
  }

  getGroupMemberGradeCount = async (group_seq, grade) => {
    const select = ['COUNT(*) AS total_count']
    const filter = {
      group_seq,
      grade,
    }
    const find_result = await this.findOne(filter, select)
    if (!find_result) {
      return 0
    }
    return Util.parseInt(find_result.total_count, 0)
  }
}
