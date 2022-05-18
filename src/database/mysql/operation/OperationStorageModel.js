import MySQLModel from '../../mysql-model'
import OperationFileService from '../../../service/operation/OperationFileService'
import OperationStorageInfo from '../../../wrapper/operation/OperationStorageInfo'
import VideoFileModel from '../file/VideoFileModel'
import ReferFileModel from '../file/ReferFileModel'
import OperationFileModel from './OperationFileModel'
import * as util from 'util'
import Util from '../../../utils/Util'

export default class OperationStorageModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'operation_storage'
    this.selectable_fields = ['*']
    this.log_prefix = '[OperationStorageModel]'
  }

  getOperationStorageInfo = async (operation_info) => {
    return new OperationStorageInfo(await this.findOne({ operation_seq: operation_info.seq }))
  }

  deleteOperationStorageInfo = async (operation_info) => {
    return this.delete({ operation_seq: operation_info.seq })
  }

  createOperationStorageInfo = async (operation_info) => {
    const create_params = {
      operation_seq: operation_info.seq
    }
    return await this.create(create_params, 'seq')
  }

  copyOperationStorageInfo = async (operation_info, origin_operation_seq) => {
    const origin_operation_storage_info = await this.findOne({ operation_seq: origin_operation_seq })
    const origin_storage_seq = origin_operation_storage_info.seq

    delete origin_operation_storage_info.seq
    delete origin_operation_storage_info.reg_date
    delete origin_operation_storage_info.modify_date
    origin_operation_storage_info.operation_seq = operation_info.seq
    const storage_seq = await this.create(origin_operation_storage_info, 'seq')

    origin_operation_storage_info.seq = storage_seq
    origin_operation_storage_info.origin_storage_seq = origin_storage_seq

    return origin_operation_storage_info
  }

  getOperationStorageInfoNotExistsCreate = async (operation_info) => {
    let operation_storage_info = await this.getOperationStorageInfo(operation_info)
    if (!operation_storage_info || operation_storage_info.isEmpty()) {
      await this.createOperationStorageInfo(operation_info)
      operation_storage_info = this.getOperationStorageInfo(operation_info)
    }
    return operation_storage_info
  }

  updateUploadFileSize = async (operation_info, file_type, update_summary = true) => {
    let file_size_info = null
    let update_params = {}
    let total_size = 0
    const storage_seq = operation_info.storage_seq
    const operation_seq = operation_info.seq

    if (file_type === OperationFileService.TYPE_ALL || file_type === OperationFileService.TYPE_VIDEO) {
      file_size_info = await new VideoFileModel(this.database).videoFileSummary(storage_seq)
      total_size = file_size_info.total_size ? parseInt(file_size_info.total_size) : 0
      update_params.origin_video_size = total_size
      update_params.origin_video_count = (file_size_info.total_count ? parseInt(file_size_info.total_count) : 0)
    }
    if (file_type === OperationFileService.TYPE_ALL || file_type === OperationFileService.TYPE_REFER) {
      file_size_info = await new ReferFileModel(this.database).referFileSummary(storage_seq)
      total_size = file_size_info.total_size ? parseInt(file_size_info.total_size) : 0
      update_params.refer_file_size = total_size
      update_params.refer_file_count = (file_size_info.total_count ? parseInt(file_size_info.total_count) : 0)
    }
    if (file_type === OperationFileService.TYPE_ALL || file_type === OperationFileService.TYPE_FILE) {
      file_size_info = await new OperationFileModel(this.database).operationFileSummary(operation_seq)
      total_size = file_size_info.total_size ? parseInt(file_size_info.total_size) : 0
      update_params.operation_file_size = total_size
      update_params.operation_file_count = (file_size_info.total_count ? parseInt(file_size_info.total_count) : 0)
    }

    await this.update({ seq: storage_seq }, update_params)
    if (update_summary) {
      await this.updateStorageSummary(storage_seq, operation_info.member_seq)
    }

    return total_size
  }

  updateStorageInfo = async (storage_seq, update_storage_info) => {
    await this.update({ seq: storage_seq }, update_storage_info)
  }

  updateStorageSummary = async (storage_seq, member_seq) => {
    const update_params = {
      'total_file_size': this.database.raw('origin_video_size + refer_file_size + operation_file_size'),
      'total_file_count': this.database.raw('origin_video_count + refer_file_count + operation_file_count'),
      'modify_date': this.database.raw('NOW()')
    }
    await this.update({ seq: storage_seq }, update_params)

    const query = this.database
      .select(this.database.raw('SUM(operation_storage.total_file_size) AS used_storage_size'), this.database.raw('SUM(operation_storage.origin_video_count) AS video_count'))
      .from((builder) => {
        builder
          .select(['seq', 'member_seq'])
          .from('operation')
          .where('status', 'Y')
          .andWhere('member_seq', member_seq)
        builder.as('operation')
      })
      .innerJoin('operation_storage', 'operation_storage.operation_seq', 'operation.seq')
      .innerJoin('member', 'operation.member_seq', 'member.seq')
      .first()
    //
    const query_result = await query
    // console.log('query_result');
    // console.log(query_result);

    const update_params2 = {
      'used_storage_size': query_result.used_storage_size,
      'video_count': query_result.video_count
    }
    const query2 = this.database
      .update(update_params2)
      .from('member')
      .where('seq', member_seq)

    await query2
    // if (query_result && query_result.total_file_size) {
    //   return Util.parseInt(query_result.total_file_size)
    // }
  }

  updateClipCount = async (storage_seq, clip_count) => {
    return await this.update({ 'seq': storage_seq }, {
      clip_count: this.database.raw(clip_count > 0 ? `clip_count + ${clip_count}` : `IF(clip_count > 0, clip_count + ${clip_count}, 0)`),
      'modify_date': this.database.raw('NOW()')
    })
  }

  updateIndexCount = async (storage_seq, index_type, count) => {
    const params = {}
    params['index' + index_type + '_file_count'] = count
    params.modify_date = this.database.raw('NOW()')
    return await this.update({ 'seq': storage_seq }, params)
  }

  getFolderTotalSize = async (group_seq, folder_seq_list = null) => {
    const query = this.database
      .select(this.database.raw('SUM(operation_storage.total_file_size) AS total_file_size'))
      .from((builder) => {
        builder
          .select(['seq', 'folder_seq'])
          .from('operation')
          .where('group_seq', group_seq)
          .where('status', 'Y')
        if (folder_seq_list) {
          builder.whereIn('folder_seq', folder_seq_list)
        }
        builder.as('operation')
      })
      .joinRaw('INNER JOIN operation_folder ON operation_folder.seq = operation.folder_seq AND operation_folder.status = \'Y\'')
      .innerJoin('operation_storage', 'operation_storage.operation_seq', 'operation.seq')
      .first()
    const query_result = await query
    if (query_result && query_result.total_file_size) {
      return Util.parseInt(query_result.total_file_size)
    }
    return 0
  }
}
