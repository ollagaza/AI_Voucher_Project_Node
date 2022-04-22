import MySQLModel from '../../mysql-model'
import Util from '../../../utils/Util'
import log from '../../../libs/logger'
import Constants from '../../../constants/constants'
import _ from 'lodash'

import OperationMediaModel from './OperationMediaModel'
import OperationInfo from '../../../wrapper/operation/OperationInfo'
import OperationInfoAndData from "../../../wrapper/operation/OperationInfoAndData";

const join_select = [
  'operation.*', 'member.user_id', 'member.user_name', 'member.user_nickname', 'operation_storage.seq as storage_seq',
  'operation_storage.total_file_size', 'operation_storage.total_file_count', 'operation_storage.clip_count',
  'operation_storage.index2_file_count', 'operation_storage.origin_video_count',
  'operation_storage.trans_video_size', 'operation_storage.trans_video_count', 'operation_storage.operation_file_size', 'operation_storage.operation_file_count',
  'operation_storage.refer_file_size', 'operation_storage.refer_file_count', 'operation_storage.origin_video_size',
  'operation_data.video_download', 'operation_data.file_download', 'operation_data.total_time', 'operation_data.thumbnail', 'operation_data.anno_count', 'operation_data.comment_count'
]
const join_trash_select = _.concat(join_select, ['delete_member.user_name as delete_user_name', 'delete_member.user_nickname as delete_user_nickname'])
const join_admin_select = _.concat(join_select, ['group_info.group_name'])
const join_search_select = [
  'operation.*', 'member.user_id', 'member.user_name', 'member.user_nickname', 'operation_storage.seq as storage_seq',
  'operation_storage.total_file_size', 'operation_storage.total_file_count', 'operation_storage.clip_count',
  'operation_storage.index2_file_count', 'operation_storage.origin_video_count', 'operation_storage.trans_video_count',
  'operation_folder.access_type'
]

export default class OperationModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'operation'
    this.selectable_fields = ['*']
    this.log_prefix = '[OperationModel]'
  }

  getOperationInfoNoJoin = async (operation_seq, wrap_result = true) => {
    const operation_info = await this.findOne({ seq: operation_seq })
    if (wrap_result) {
      return new OperationInfo(operation_info)
    } else {
      return operation_info
    }
  }

  getOperation = async (where, import_media_info) => {
    const query = this.database.select(join_select)
    query.from('operation')
    query.innerJoin('member', 'member.seq', 'operation.member_seq')
    query.innerJoin('operation_data', 'operation_data.operation_seq', 'operation.seq')
    query.leftOuterJoin('operation_storage', 'operation_storage.operation_seq', 'operation.seq')
    query.where(where)
    query.first()

    const query_result = await query

    return await this.getOperationInfoWithMediaInfo(query_result, import_media_info)
  }

  getOperationInfo = async (operation_seq, import_media_info) => {
    const where = { 'operation.seq': operation_seq }
    return await this.getOperation(where, import_media_info)
  }

  getOperationInfoListPage = async (group_seq, member_seq, group_grade_number = null, is_group_admin = false, page_params = {}, filter_params = {}, order_params = {}, is_admin = false, operation_data_seq_list = [], is_agent = false) => {
    const page = page_params.page ? page_params.page : 1
    const list_count = page_params.list_count ? page_params.list_count : 20
    const page_count = page_params.page_count ? page_params.page_count : 10

    const is_trash = filter_params.menu === 'trash'
    let select_fields = is_admin ? join_admin_select : (is_trash ? join_trash_select : join_select)
    const query = this.database.select(select_fields)
    query.from('operation')
    query.innerJoin('operation_data', 'operation_data.operation_seq', 'operation.seq')
    query.innerJoin('member', 'member.seq', 'operation.member_seq')
    if (is_admin) {
      query.innerJoin('group_info', 'group_info.seq', 'operation.group_seq')
    }
    query.leftOuterJoin('operation_storage', 'operation_storage.operation_seq', 'operation.seq')
    query.leftOuterJoin('operation_folder', 'operation.folder_seq', 'operation_folder.seq')
    if (!is_admin) {
      if (is_trash) {
        query.joinRaw('LEFT OUTER JOIN `member` AS delete_member ON delete_member.seq = operation.delete_member_seq')
      }
      query.where('operation.group_seq', group_seq)
      if (!is_trash && !is_group_admin) {
        query.where(
          this.database.raw(`
            IF (
              operation_folder.is_access_way IS NULL,
                true,
                IF (
                  operation_folder.is_access_way = 0,
                    (
                      CASE
                        WHEN operation_folder.access_type IS NULL THEN 1
                        WHEN operation_folder.access_type = 'A' THEN 99
                        WHEN operation_folder.access_type = 'O' THEN 99
                        ELSE operation_folder.access_type
                      END
                    ) <= ?,
                    JSON_EXTRACT(operation_folder.access_list, '$.read."?"') = true
                )
            )
          `, [group_grade_number, group_grade_number])
        )
      }
    } else if (filter_params.group_seq) {
      query.where('operation.group_seq', filter_params.group_seq)
    }
    if (filter_params.status) {
      query.andWhere('operation.status', filter_params.status.toUpperCase())
    }

    if (filter_params.limit) {
      query.limit(filter_params.limit)
    }

    let check_folder = true
    const recent_timestamp = Util.addDay(-(Util.parseInt(filter_params.day, 7)), Constants.TIMESTAMP)
    switch (filter_params.menu) {
      case 'open':
        query.andWhere('operation.status', 'Y')
        query.andWhere('operation.analysis_status', 'Y')
        query.andWhere('operation_data.is_open_video', 1)
        check_folder = false
        break
      case 'recent':
        query.andWhere('operation.reg_date', '>=', recent_timestamp)
        query.andWhere('operation.status', 'Y')
        check_folder = false
        break
      case 'favorite':
        query.andWhere('operation.is_favorite', 1)
        query.andWhere('operation.status', 'Y')
        check_folder = false
        break
      case 'trash':
        query.andWhere('operation.status', 'T')
        check_folder = false
        break
      case 'clip':
        query.andWhere('operation.status', 'Y')
        check_folder = false
        break
      case 'drive':
        query.andWhere('operation.status', 'Y')
        break
      case 'collect':
        query.andWhere('operation.status', 'Y')
        check_folder = true
        break
      default:
        query.andWhere('operation.status', 'Y')
        check_folder = false
        break
    }
    if (!is_admin) {
      if (!is_trash) {
        query.andWhere((builder) => {
          builder.whereNull('operation.folder_seq')
          builder.orWhere('operation_folder.status', 'Y')
        })
      } else if (!is_group_admin) {
        query.andWhere('operation.member_seq', member_seq)
      }
    }

    if (filter_params.member_seq) {
      query.andWhere('operation.member_seq', filter_params.member_seq)
    }
    if (filter_params.analysis_status) {
      query.andWhere('operation.analysis_status', filter_params.analysis_status)
    }
    if (filter_params.search_keyword) {
      query.where((builder) => {
        builder.where('operation.operation_name', 'like', `%${filter_params.search_keyword}%`)
        builder.orWhere('operation.operation_date', 'like', `%${filter_params.search_keyword}%`)
        builder.orWhere('operation.seq', 'like', `%${filter_params.search_keyword}%`)
        if (is_admin) {
          builder.orWhere('member.user_name', 'like', `%${filter_params.search_keyword}%`)
          builder.orWhere('member.user_id', 'like', `%${filter_params.search_keyword}%`)
          builder.orWhere('group_info.group_name', 'like', `%${filter_params.search_keyword}%`)
        } else {
          if (filter_params.use_user_name) {
            builder.orWhere('member.user_name', 'like', `%${filter_params.search_keyword}%`)
          } else {
            builder.orWhere('member.user_nickname', 'like', `%${filter_params.search_keyword}%`)
          }
        }
        if (operation_data_seq_list && operation_data_seq_list.length) {
          builder.orWhereIn('operation_data.seq', operation_data_seq_list)
        }
      })
    } else if (check_folder) {
      if (filter_params.folder_seq) {
        if (filter_params.folder_seq !== 'all') {
          query.andWhere('operation.folder_seq', Util.parseInt(filter_params.folder_seq, null))
        }
      } else {
        query.whereNull('operation.folder_seq')
      }
    }

    const order_by = { name: 'operation.seq', direction: 'DESC' }
    if (order_params.field) {
      switch (order_params.field) {
        case 'seq':
          order_by.name = 'operation.seq'
          order_by.direction = order_params.type
          break;
        case 'operation_name':
          order_by.name = 'operation.operation_name'
          order_by.direction = order_params.type
          break;
        case 'operation_date':
          order_by.name = 'operation.modify_date'
          order_by.direction = order_params.type
          break;
        case 'reg_date':
          order_by.name = 'operation.reg_date'
          order_by.direction = order_params.type
          break;
        case 'user_name':
          order_by.name = 'member.user_name'
          order_by.direction = order_params.type
          break;
        case 'patient_age':
          order_by.name = 'operation.patient_age'
          order_by.direction = order_params.type
          break;
        case 'patient_sex':
          order_by.name = 'operation.patient_sex'
          order_by.direction = order_params.type
          break;
        case 'total_file_size':
          order_by.name = 'operation_storage.total_file_size'
          order_by.direction = order_params.type
          break;
        case 'group_name':
          if (is_admin) {
            order_by.name = 'group_info.group_name'
            order_by.direction = order_params.type
          }
          break;
        default :
          break;
      }
    }
    query.orderBy(order_by.name, order_by.direction)

    const paging_result = await this.queryPaginated(query, list_count, page, page_count, page_params.no_paging)

    const result = []

    if (paging_result && paging_result.data) {
      for (const key in paging_result.data) {
        let query_result = paging_result.data[key]
        result.push(this.getOperationInfoByResult(query_result))
      }
    }

    paging_result.data = result
    return paging_result
  }

  getOperationInfoListByMember = async (member_seq) => {
    const filters = {
      member_seq,
      status: 'Y',
      is_analysis_complete: 1
    }
    return await this.find(filters, null, { name: 'seq', direction: 'asc' })
  }

  updateOperationInfo = async (operation_seq, operation_info) => {
    operation_info.setIgnoreEmpty(true)
    const update_params = operation_info.toJSON()
    update_params.modify_date = this.database.raw('NOW()')
    return await this.update({ 'seq': operation_seq }, update_params)
  }

  getOperationInfoByResult = (query_result) => {
    if (query_result.mode === 'operation') {
      query_result.download_file_size = query_result.origin_video_size
      query_result.download_file_count = query_result.origin_video_count
    } else {
      query_result.download_file_size = query_result.operation_file_size
      query_result.download_file_count = query_result.operation_file_count
    }

    return new OperationInfoAndData(query_result)
    // return new OperationInfo(query_result)
  }

  getOperationInfoWithMediaInfo = async (query_result, import_media_info = false) => {
    if (query_result == null) {
      return new OperationInfo(null)
    }

    const operation_info = this.getOperationInfoByResult(query_result)

    if (import_media_info === true) {
      const media_info = await new OperationMediaModel(this.database).getOperationMediaInfo(operation_info)
      operation_info.setMediaInfo(media_info)
    }

    return operation_info
  }

  setOperationStatusDelete = async (operation_seq) => {
    return await this.update({ 'seq': operation_seq }, { 'status': 'D' })
  }

  deleteOperation = async (operation_seq) => {
    await this.delete({ 'seq': operation_seq })
  }

  updateStatusTrash = async (operation_seq_list, status, is_delete_by_admin, delete_member_seq, folder_info = null) => {
    const update_params = {
      status,
      is_delete_by_admin: is_delete_by_admin ? 1 : 0,
      delete_member_seq,
      'modify_date': this.database.raw('NOW()')
    }
    if (folder_info) {
      update_params.folder_seq = folder_info.seq
    }
    let filters = null
    return this.updateIn('seq', operation_seq_list, update_params, filters)
  }

  updateStatus = async (operation_seq_list, status) => {
    return this.updateIn('seq', operation_seq_list, { status, 'modify_date': this.database.raw('NOW()') })
  }

  updateStatusFavorite = async (operation_seq, is_delete) => {
    return await this.update({ 'seq': operation_seq }, {
      is_favorite: is_delete ? 0 : 1,
      'modify_date': this.database.raw('NOW()')
    })
  }

  updateAnalysisStatus = async (operation_seq, status, encoding_info = null) => {
    if (encoding_info && typeof encoding_info === 'object') encoding_info = JSON.stringify(encoding_info)
    return await this.update({ 'seq': operation_seq }, {
      analysis_status: status ? status.toUpperCase() : 'N',
      encoding_info,
      'modify_date': this.database.raw('NOW()')
    })
  }

  updateAnalysisComplete = async (operation_seq, status) => {
    return await this.update({ 'seq': operation_seq }, {
      is_analysis_complete: status ? 1 : 0,
      'modify_date': this.database.raw('NOW()')
    })
  }

  updateAnalysisProgress = async (operation_seq, progress) => {
    return await this.update({ 'seq': operation_seq }, {
      progress: progress,
      'modify_date': this.database.raw('NOW()')
    })
  }

  createOperation = async (operation_info) => {
    const operation_seq = await this.create(operation_info, 'seq')
    operation_info.seq = operation_seq

    return operation_info
  }

  isDuplicateOperationCode = async (group_seq, member_seq, operation_code) => {
    const where = { 'group_seq': group_seq, 'member_seq': member_seq, 'operation_code': operation_code }
    const total_count = await this.getTotalCount(where)

    return total_count > 0
  }

  getOperationInfoByContentId = async (content_id) => {
    const where = { 'content_id': content_id }
    return await this.getOperation(where, false)
  }

  remove = async (operation_info, member_seq) => {
    const where = { 'member_seq': member_seq, 'seq': operation_info.seq }
    return await this.delete(where)
  }

  getGroupMemberOperationList = async (group_seq, member_seq) => {
    const filter = {
      group_seq,
      member_seq,
      status: 'Y',
    }
    const operation_list = []
    const query_result = await this.find(filter)
    if (query_result) {
      for (let i = 0; i < query_result.length; i++) {
        operation_list.push(this.getOperationInfoByResult(query_result[i]))
      }
    }
    return operation_list
  }

  setGroupMemberOperationState = async (group_seq, member_seq, status) => {
    const filter = {
      group_seq,
      member_seq
    }
    const params = {
      status,
      'modify_date': this.database.raw('NOW()')
    }
    return await this.update(filter, params)
  }

  getGroupTotalStorageUsedSize = async (group_seq) => {
    const filter = {
      group_seq
    }

    return await this.getGroupUsedStorageSize(filter)
  }

  getGroupMemberStorageUsedSize = async (group_seq, member_seq) => {
    const filter = {
      group_seq,
      member_seq
    }

    return await this.getGroupUsedStorageSize(filter)
  }

  getGroupUsedStorageSize = async (filter) => {
    const query = this.database.select([this.database.raw('SUM(operation_storage.total_file_size) AS total_size')])
    query.from('operation')
    query.innerJoin('operation_storage', 'operation_storage.operation_seq', 'operation.seq')
    query.where(filter)
    query.whereIn('status', ['Y', 'T'])
    query.first()

    const query_result = await query
    log.debug(this.log_prefix, '[getGroupUsedStorageSize]', filter, query_result)
    if (!query_result || !query_result.total_size) {
      return 0
    }
    log.debug(this.log_prefix, '[getGroupUsedStorageSize - return]', filter, query_result.total_size, Util.parseInt(query_result.total_size))
    return Util.parseInt(query_result.total_size)
  }

  getOperationListByMemberSeq = async (member_seq) => {
    return await this.find({ member_seq })
  }

  updateLinkState = async (operation_seq, has_link) => {
    return await this.update({ 'seq': operation_seq }, {
      has_link: has_link ? 1 : 0,
      'modify_date': this.database.raw('NOW()')
    })
  }

  getOperationByFolderSeq = async (group_seq, folder_seq) => {
    return await this.find({ group_seq, folder_seq })
  }

  moveOperationFolder = async (operation_seq_list, folder_seq) => {
    const filters = {
      is_new: true,
      query: [
        { seq: _.concat(['in'], operation_seq_list) },
      ],
    }
    return await this.update(filters, { folder_seq })
  }

  hasCopy = async (operation_seq) => {
    const result = await this.findOne({ origin_seq: operation_seq }, [ 'COUNT(*) AS total_count'])
    return result && result.total_count > 0
  }

  hasOrigin = async (origin_operation_seq) => {
    const query = this.database.select([ this.database.raw('COUNT(*) AS total_count') ])
    query.from(this.table_name)
    query.where('origin_seq', origin_operation_seq)
    query.orWhere('seq', origin_operation_seq)
    query.first()
    const result = await query
    return result && result.total_count > 0
  }
  getOperationListInFolderSeqList = async (group_seq, folder_seq_list, status = null) => {
    const params = {
      is_new: true,
      query: [
        { group_seq },
        { folder_seq: _.concat(['in'], folder_seq_list) }
      ]
    }
    if (status) {
      if (typeof status === 'object') {
        params.query.push( { status: _.concat(['in'], status) } )
      } else {
        params.query.push( { status } )
      }
    }
    log.debug(this.log_prefix, '[getOperationListInFolderSeqList]', group_seq, folder_seq_list, status, params)
    return this.find(params)
  }
  getOperationListInSeqList = async (group_seq, seq_list) => {
    const params = {
      is_new: true,
      query: [
        { group_seq },
        { seq: _.concat(['in'], seq_list) }
      ]
    }
    return this.find(params)
  }
  getOperationMode = async (operation_seq) => {
    return this.findOne({ seq: operation_seq}, ['mode'])
  }

  getOperationFolderGrade = async (operation_seq) => {
    return this.database.select(['operation.seq', 'operation.folder_seq', 'operation_folder.access_type'])
      .from('operation')
      .leftOuterJoin('operation_folder', 'operation_folder.seq', 'operation.folder_seq')
      .where('operation.seq', operation_seq)
      .first()
  }
  getOperationVideoCountWithFolder = async () => {
    return this.database.select(['folder_seq', this.database.raw('count(*) as count')])
      .from('operation')
      .where('mode', 'operation')
      .andWhere('status', 'Y')
      .groupBy('folder_seq')
  }
  getOperationFileCountWithFolder = async () => {
    return this.database.select(['folder_seq', this.database.raw('count(*) as count')])
      .from('operation')
      .where('mode', 'file')
      .andWhere('status', 'Y')
      .groupBy('folder_seq')
  }
}
