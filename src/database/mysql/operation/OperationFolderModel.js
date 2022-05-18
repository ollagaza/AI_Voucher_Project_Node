import MySQLModel from '../../mysql-model'
import log from '../../../libs/logger'
import Util from "../../../utils/Util"
import _ from 'lodash'

export default class OperationFolderModel extends MySQLModel {
  constructor (...args) {
    super(...args)

    this.table_name = 'operation_folder'
    this.log_prefix = '[OperationFolderModel]'
    this.selectable_fields = ['*']
    // this.selectable_fields_with_member = ['operation_folder.*', 'member.user_name', 'member.user_nickname']
    this.selectable_fields_with_member = ['operation_folder.*', 'member.user_name', 'member.user_nickname', 'delete_member.user_name AS delete_user_name', 'delete_member.user_nickname AS delete_user_nickname']
  }

  createOperationFolder = async (folder_info) => {
    folder_info.setIgnoreEmpty(true)
    const create_params = folder_info.toJSON()
    if (typeof create_params.parent_folder_list === 'object') {
      create_params.parent_folder_list = JSON.stringify(create_params.parent_folder_list)
    }
    if (typeof create_params.access_users === 'object') {
      create_params.access_users = JSON.stringify(create_params.access_users)
    }
    create_params.reg_date = this.database.raw('NOW()')
    create_params.modify_date = this.database.raw('NOW()')

    return this.create(create_params, 'seq')
  }

  isValidFolderName = async (group_seq, folder_name, parent_seq = null, folder_seq = null) => {
    const filter = {
      group_seq,
      folder_name,
      parent_seq
    }
    const find_result = await this.find(filter)
    if (!find_result || find_result.length <= 0) {
      return true
    }
    if (!folder_seq) {
      return false
    }
    if (find_result.length === 1) {
      if (find_result[0].seq === folder_seq) {
        return true
      }
    }
    return false
  }

  deleteOperationFolder = async (group_seq, folder_seq) => {
    return this.delete({ group_seq, seq: folder_seq })
  }

  deleteOperationFolderBySeqList = async (group_seq, folder_seq_list) => {
    log.debug(this.log_prefix, '[deleteOperationFolderBySeqList]', this.database)
    return this.database
      .from(this.table_name)
      .where('group_seq', group_seq)
      .whereIn('seq', folder_seq_list)
      .del()
  }

  getFolderInfo = async (group_seq, folder_seq) => {
    return this.findOne({ group_seq, seq: folder_seq })
  }

  getFolderInfoBySeq = async (folder_seq) => {
    return this.findOne({ seq: folder_seq })
  }

  getGroupFolders = async (group_seq) => {
    const query = this.database.select(this.selectable_fields_with_member)
      .from(this.table_name)
      .innerJoin('member', 'member.seq', `${this.table_name}.member_seq`)
      .joinRaw('LEFT OUTER JOIN `member` AS delete_member ON delete_member.seq = operation_folder.delete_member_seq')
      .where(`${this.table_name}.group_seq`, group_seq)
    query.orderBy([{ column: `${this.table_name}.depth`, order: 'asc' }, { column: `${this.table_name}.folder_name`, order: 'asc' }])
    return query
  }

  getGroupFolderLastUpdate = async (group_seq) => {
    return this.findOne({ group_seq: group_seq, status: 'Y' }, ['modify_date'], {
      name: 'modify_date',
      direction: 'desc'
    })
  }

  getAllChildFolders = async (group_seq, folder_seq, include_current_folder = true, status = null) => {
    const query = this.database
      .select(this.selectable_fields)
      .from(this.table_name)
      .where(`operation_folder.group_seq`, group_seq)
    if (include_current_folder) {
      query.andWhere(function () {
        this.where('operation_folder.seq', folder_seq)
        this.orWhereRaw(`JSON_CONTAINS(operation_folder.parent_folder_list, '${folder_seq}', '$')`)
      })
    } else {
      query.whereRaw(`JSON_CONTAINS(operation_folder.parent_folder_list, '${folder_seq}', '$')`)
    }
    if (status) {
      if (typeof status === 'object') {
        if (status.length) {
          query.whereIn('status', status)
        }
      } else {
        query.where('status', status)
      }
    }
    return query
  }

  updateOperationFolder = async (folder_seq, folder_info) => {
    folder_info.addPrivateKey('seq')
    const update_params = folder_info.toJSON()
    update_params.modify_date = this.database.raw('NOW()')
    if (update_params.parent_folder_list && typeof update_params.parent_folder_list === 'object') {
      update_params.parent_folder_list = JSON.stringify(update_params.parent_folder_list)
    }
    if (update_params.access_users && typeof update_params.access_users === 'object') {
      update_params.access_users = JSON.stringify(update_params.access_users)
    }
    return this.update({ seq: folder_seq }, update_params)
  }

  updateOperationFolderAccessType = async (folder_seq, access_type, is_access_way, access_list) => {
    return this.database.update({access_type, is_access_way, access_list})
      .from(this.table_name)
      .where(this.database.raw(`JSON_CONTAINS(parent_folder_list, '${folder_seq}') = 1`))
  }

  moveFolder = async (folder_info, target_folder_info) => {
    if (target_folder_info && target_folder_info.parent_seq && target_folder_info.total_folder_size > 0) {
      const parent_folder_size_down = this.database
        .update('total_folder_size', this.database.raw(`total_folder_size - ${target_folder_info.total_folder_size}`))
        .from(this.table_name)
        .where('seq', target_folder_info.parent_seq)
      await parent_folder_size_down
    }
    if (target_folder_info.total_folder_size > 0) {
      const new_parent_folder_size_up = this.database
        .update('total_folder_size', this.database.raw(`total_folder_size + ${target_folder_info.total_folder_size}`))
        .from(this.table_name)
        .where('seq', folder_info.seq)
      await new_parent_folder_size_up
    }

    const target_folder_parent_seq_update = this.database
      .update({'parent_seq': folder_info.seq, 'access_type': folder_info.access_type, 'is_access_way': folder_info.is_access_way, 'access_list': folder_info.access_list})
      .from(this.table_name)
      .where('seq', target_folder_info.seq)
    await target_folder_parent_seq_update

    const before_update_target_depth = this.database.select('depth')
      .from(this.table_name)
      .where('seq', target_folder_info.seq)
      .first()
    const before_update_target_depth_result = await before_update_target_depth

    if (folder_info.seq) {
      const target_folder_parent_list_update = this.database
        .update({ 'target.parent_folder_list': this.database.raw(`JSON_MERGE(parent.parent_folder_list, '[${folder_info.seq}]')`),
          'target.depth': this.database.raw(`JSON_LENGTH(JSON_MERGE(parent.parent_folder_list, '[${folder_info.seq}]'))`)
        })
        .from({'target': this.table_name})
        .leftOuterJoin({'parent': this.table_name}, 'parent.seq', folder_info.seq)
        .where('target.seq', target_folder_info.seq)
      await target_folder_parent_list_update
    } else {
      const target_folder_parent_list_update = this.database
        .update({'target.parent_folder_list': '[]', 'target.depth': 0})
        .from({'target': this.table_name})
        .where('target.seq', target_folder_info.seq)
      await target_folder_parent_list_update
    }

    const include_target_folder_replace = []
    for (let cnt = 0; cnt < Util.parseInt(before_update_target_depth_result.depth); cnt++) {
      include_target_folder_replace.push(`$[0]`)
    }

    const include_target_folder_update = this.database
      .update({
        'target.parent_folder_list': this.database.raw(`JSON_MERGE(parent.parent_folder_list, JSON_REMOVE(target.parent_folder_list, '${include_target_folder_replace.join('\', \'')}'))`),
        'target.depth': this.database.raw(`JSON_LENGTH(JSON_MERGE(parent.parent_folder_list, JSON_REMOVE(target.parent_folder_list, '${include_target_folder_replace.join('\', \'')}')))`),
        'target.access_type': folder_info.access_type
      })
      .from({'target': this.table_name})
      .leftOuterJoin({'parent': this.table_name}, 'parent.seq', target_folder_info.seq)
      .where(this.database.raw(`JSON_CONTAINS(target.parent_folder_list, '${target_folder_info.seq}') = 1`))
    await include_target_folder_update

    return true
  }
  updateStatusFavorite = async (folder_seq, is_delete) => {
    return await this.update({ 'seq': folder_seq }, {
      is_favorite: is_delete ? 0 : 1,
      'modify_date': this.database.raw('NOW()')
    })
  }
  addFolderStorageSizeBySeqList = async (folder_seq_list, file_size) => {
    if (file_size === 0 || !folder_seq_list) return
    log.debug(this.log_prefix, '[addFolderStorageSizeBySeqList]', folder_seq_list, file_size)
    const update_params = {}
    if (file_size < 0) {
      update_params.total_folder_size = this.database.raw('IF(total_folder_size > ?, total_folder_size + ?, 0)', [file_size, file_size])
    } else {
      update_params.total_folder_size = this.database.raw('total_folder_size + ?', [file_size])
    }
    return this.database
      .update(update_params)
      .from(this.table_name)
      .whereIn('seq', folder_seq_list)
  }
  setFolderStorageSize = async (folder_seq, file_size) => {
    return this.update({ seq: folder_seq }, { total_folder_size: file_size })
  }

  getGroupFolderMaxDepth = async (group_seq) => {
    const query = this.database
      .select([this.database.raw('MAX(depth) AS max_depth')])
      .from(this.table_name)
      .where({ group_seq })
      .first()
    const query_result = await query
    if (!query_result || !query_result.max_depth) return 0
    return Util.parseInt(query_result.max_depth)
  }
  getAllGroupFolderList = async (group_seq, depth = null) => {
    const filter = { group_seq }
    if (depth !== null) filter.depth = depth
    return this.find(filter)
  }
  updateStatusTrash = async (folder_seq_list, group_seq, status, prev_status, is_delete_by_admin, delete_member_seq) => {
    const update_params = {
      status,
      is_delete_by_admin: is_delete_by_admin ? 1 : 0,
      delete_member_seq,
      modify_date: this.database.raw('NOW()')

    }
    const query = this.database
      .update(update_params)
      .from(this.table_name)
      .whereIn('seq', folder_seq_list)
      .where('group_seq', group_seq)
    if (prev_status) {
      if (typeof prev_status === 'object') {
        query.whereIn('status', prev_status)
      } else {
        query.where('status', prev_status)
      }
    }
    return query
  }
  getGroupFolderByDepthZero = async (group_seq) => {
    return await this.find({ group_seq, status: 'Y', depth: 0 }, this.selectable_fields, { name: 'sort', direction: 'asc' })
  }

  updateFolderCounts = async (filter, params) => {
    return this.update(filter, params)
  }
  updateCounts = async (folder_seq, mode, is_crease = true) => {
    const params = {}
    if (mode === 'operation') {
      if (is_crease) {
        params.video_count = this.database.raw('video_count + 1')
      } else {
        params.video_count = this.database.raw('IF(video_count > 0, video_count - 1, 0)')
      }
    }
    if (mode === 'file') {
      if (is_crease) {
        params.file_count = this.database.raw('file_count + 1')
      } else {
        params.file_count = this.database.raw('IF(file_count > 0, file_count - 1, 0)')
      }
    }
    return this.update({ seq: folder_seq }, params)
  }
}
