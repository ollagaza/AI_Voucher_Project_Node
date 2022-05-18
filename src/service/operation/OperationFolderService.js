import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql'
import log from '../../libs/logger'
import OperationService from '../operation/OperationService'
import OperationFolderModel from '../../database/mysql/operation/OperationFolderModel'
import OperationFolderInfo from '../../wrapper/operation/OperationFolderInfo'
import OperationStorageModel from '../../database/mysql/operation/OperationStorageModel'
import Util from '../../utils/Util'
// import GroupService from "../group/GroupService";

const OperationFolderServiceClass = class {
  constructor () {
    this.log_prefix = '[OperationFolderService]'
  }

  getOperationFolderModel = (database) => {
    if (database) {
      return new OperationFolderModel(database)
    }
    return new OperationFolderModel(DBMySQL)
  }

  getGroupFolderInfo = async (database, group_seq, request) => {
    const request_query = request.query ? request.query : {}
    const filter_params = {}
    filter_params.menu = request_query.menu

    const model = this.getOperationFolderModel(database)
    const result_list = await model.getGroupFolders(group_seq)
    const folder_map = {}
    let last_update = null
    result_list.forEach((result) => {
      const folder_info = new OperationFolderInfo(result)
      const seq = folder_info.seq
      const str_seq = `folder_${seq}`
      folder_map[str_seq] = folder_info
      if (!last_update || last_update < folder_info.modify_date) {
        last_update = folder_info.modify_date
      }
    })

    // log.debug(this.log_prefix, folder_map)
    this.makeFolderTree(folder_map)

    return {
      folder_map,
      // folder_tree: this.makeFolderTree(folder_map),
      last_update
    }
  }

  makeFolderTree = (folder_map) => {
    // const folder_map = {}
    // Object.keys(origin_folder_map).forEach((key) => {
    //   folder_map[key] = origin_folder_map[key].toJSON()
    // })
    const folder_tree = {}
    Object.keys(folder_map).forEach((key) => {
      const folder_info = folder_map[key]
      const seq = folder_info.seq
      const parent_seq = folder_info.parent_seq

      const str_seq = `folder_${seq}`
      const str_parent_seq = `folder_${parent_seq}`
      if (parent_seq) {
        if (folder_map[str_parent_seq]) {
          if (!folder_map[str_parent_seq].children) {
            folder_map[str_parent_seq].children = {}
          }
          folder_map[str_parent_seq].children[str_seq] = folder_info
        }
      } else {
        folder_tree[str_seq] = folder_info
      }
    })

    return folder_tree
  }

  getGroupFolderLastUpdate = async (database, group_seq) => {
    const model = this.getOperationFolderModel(database)
    const query_result = await model.getGroupFolderLastUpdate(group_seq)
    return query_result ? query_result.modify_date : null
  }

  getFolderInfo = async (database, group_seq, folder_seq) => {
    const model = this.getOperationFolderModel(database)
    return new OperationFolderInfo(await model.getFolderInfo(group_seq, folder_seq))
  }

  getChildAllFolderList = async (database, group_seq, folder_seq, include_current_folder = true, status = null) => {
    const model = this.getOperationFolderModel(database)
    return model.getAllChildFolders(group_seq, folder_seq, include_current_folder, status)
  }

  getAllChildFolderSeqListBySeqList = async (database, group_seq, folder_seq_list, include_current_folder = true, status = null) => {
    let child_folder_list;
    const child_folder_seq_list = [];
    for (let i = 0; i < folder_seq_list.length; i++) {
      child_folder_list = await this.getChildAllFolderList(database, group_seq, folder_seq_list[i], include_current_folder, status)
      for (let cnt = 0; cnt < child_folder_list.length; cnt++) {
        child_folder_seq_list.push(child_folder_list[cnt].seq);
      }
    }

    return child_folder_seq_list;
  }

  createDefaultOperationFolder = async (database, group_seq, member_seq) => {
    const model = this.getOperationFolderModel(database)
    const folder_info = new OperationFolderInfo();
    folder_info.folder_name = 'Folder';
    folder_info.depth = 0
    folder_info.parent_folder_list = []
    folder_info.group_seq = group_seq
    folder_info.member_seq = member_seq

    const folder_seq = await model.createOperationFolder(folder_info)
    folder_info.seq = folder_seq
    // log.debug(this.log_prefix, '[createDefaultOperationFolder]', folder_seq, folder_info)

    return folder_info
  }

  createOperationFolder = async (database, request_body, group_seq, member_seq) => {
    const model = this.getOperationFolderModel(database)
    const folder_info = new OperationFolderInfo(request_body.folder_info)
    const is_valid_folder_name = request_body.is_valid_folder_name ? JSON.parse(request_body.is_valid_folder_name) : false
    const parent_folder_info = request_body.parent_folder_info
    if (parent_folder_info) {
      folder_info.depth = parent_folder_info.depth + 1
      folder_info.parent_seq = parent_folder_info.seq
      folder_info.parent_folder_list = parent_folder_info.parent_folder_list
      folder_info.parent_folder_list.push(parent_folder_info.seq)
      folder_info.access_type = parent_folder_info.access_type ? parent_folder_info.access_type : '1';
      folder_info.is_access_way = parent_folder_info.is_access_way;
      folder_info.access_list = parent_folder_info.access_list;
    } else {
      folder_info.depth = 0
      folder_info.parent_folder_list = []
    }
    folder_info.group_seq = group_seq
    folder_info.member_seq = member_seq

    if (is_valid_folder_name) {
      const is_valid_name = await model.isValidFolderName(group_seq, folder_info.folder_name, parent_folder_info ? parent_folder_info.seq : null)
      if (!is_valid_name) {
        throw new StdObject(-1, '이미 사용중인 폴더명입니다.', 400)
      }
    }

    const folder_seq = await model.createOperationFolder(folder_info)
    folder_info.seq = folder_seq
    // log.debug(this.log_prefix, '[createOperationFolder]', folder_seq, folder_info)

    return folder_info
  }

  renameOperationFolder = async (database, folder_seq, folder_name) => {
    const model = this.getOperationFolderModel(database)
    const folder_info = new OperationFolderInfo({
      seq: folder_seq,
      folder_name,
    })
    return model.updateOperationFolder(folder_seq, folder_info);
  }

  updateOperationFolder = async (database, folder_seq, request_body) => {
    const model = this.getOperationFolderModel(database)
    const folder_info = new OperationFolderInfo(request_body.folder_info)
    const update_result = await model.updateOperationFolder(folder_seq, folder_info)
    return update_result
  }

  updateParentFolderAccessType = async (database, folder_seq, access_type, is_access_way, access_list) => {
    const model = this.getOperationFolderModel(database)
    const update_result = await model.updateOperationFolderAccessType(folder_seq, access_type, is_access_way, access_list)
    return update_result
  }

  moveFolder = async (database, request_body) => {
    const model = this.getOperationFolderModel(database)
    const folder_info = new OperationFolderInfo(request_body.folder_info)
    const target_folder_info = new OperationFolderInfo(request_body.target_folder_info)
    const result = await model.moveFolder(folder_info, target_folder_info)
    return result
  }

  deleteOperationFolder = async (database, group_seq, folder_seq) => {
    const model = this.getOperationFolderModel(database)
    return model.deleteOperationFolder(group_seq, folder_seq)
  }

  deleteOperationFolders = async (database, group_seq, folder_seq_list) => {
    const model = this.getOperationFolderModel(database)
    return model.deleteOperationFolderBySeqList(group_seq, folder_seq_list)
  }

  isFolderEmpty = async (database, group_seq, folder_seq, check_child_folder = false) => {
    try {
      const model = this.getOperationFolderModel(database)
      const folder_seq_list = []
      folder_seq_list.push(folder_seq)
      const child_folder_list = await model.getAllChildFolders(group_seq, folder_seq, false, 'Y')
      if (child_folder_list && child_folder_list.length > 0) {
        if (check_child_folder) return false
        for (let i = 0; i < child_folder_list.length; i++) {
          folder_seq_list.push(child_folder_list[i].seq)
        }
      }
      const operation_list = await OperationService.getOperationListInFolderSeqList(database, group_seq, folder_seq_list, 'Y', false)
      return !operation_list || operation_list.length === 0
    } catch (e) {
      log.error(this.log_prefix, '[isFolderEmpty]', group_seq, folder_seq, e)
      return false
    }
  }

  onChangeFolderSize = async (group_seq, folder_seq, is_reset = false) => {
    if (!folder_seq) return
    const folder_model = this.getOperationFolderModel(DBMySQL)
    const folder_info = await folder_model.getFolderInfoBySeq(folder_seq)
    if (!folder_info) return
    const child_folder_seq_list = []
    if (is_reset) {
      child_folder_seq_list.push(folder_seq)
    } else {
      const child_folder_list = await folder_model.getAllChildFolders(group_seq, folder_seq)
      for (let i = 0; i < child_folder_list.length; i++) {
        child_folder_seq_list.push(child_folder_list[i].seq)
      }
    }
    const storage_model = new OperationStorageModel(DBMySQL)
    const total_file_size = await storage_model.getFolderTotalSize(group_seq, child_folder_seq_list)
    await folder_model.setFolderStorageSize(folder_seq, total_file_size)

    const change_file_size = is_reset ? total_file_size : total_file_size - Util.parseInt(folder_info.total_folder_size)
    const parent_folder_list = folder_info.parent_folder_list ? JSON.parse(folder_info.parent_folder_list) : []
    if (parent_folder_list.length !== 0) {
      await folder_model.addFolderStorageSizeBySeqList(parent_folder_list, change_file_size)
    }
  }

  syncFolderTotalSize = async (group_seq) => {
    const folder_model = this.getOperationFolderModel()
    const filter = {}
    filter.group_seq = group_seq

    const max_depth = await folder_model.getGroupFolderMaxDepth(group_seq)
    for (let depth  = 0; depth  <= max_depth; depth ++) {
      const folder_list = await folder_model.getAllGroupFolderList(group_seq, depth)
      for (let cnt = 0; cnt < folder_list.length; cnt++) {
        const folder_info = new OperationFolderInfo(folder_list[cnt])
        await this.onChangeFolderSize(group_seq, folder_info.seq, true)
      }
    }
  }
  updateStatusFavorite = async (database, folder_seq, is_delete) => {
    const model = this.getOperationFolderModel(database)
    return await model.updateStatusFavorite(folder_seq, is_delete)
  }
  updateStatusTrash = async (database, request_body, group_seq, is_restore, is_delete_by_admin, delete_member_seq) => {
    const folder_seq_list = request_body.seq_list
    const move_folder_info = is_restore && request_body.folder_info ? request_body.folder_info : null
    if (!folder_seq_list || !folder_seq_list.length) return true
    const folder_model = this.getOperationFolderModel(database)
    let status = is_restore ? 'Y' : 'T'
    await folder_model.updateStatusTrash(folder_seq_list, group_seq, status, null, is_delete_by_admin, delete_member_seq)

    status = is_restore ? 'Y' : 'F'
    const prev_status = is_restore ? 'F' : 'Y'
    const child_seq_list = await this.getAllChildFolderSeqListBySeqList(database, group_seq, folder_seq_list, false, prev_status)
    await folder_model.updateStatusTrash(child_seq_list, group_seq, status, null, is_delete_by_admin, delete_member_seq)

    for (let i = 0; i < folder_seq_list.length; i++) {
      const folder_info = await folder_model.getFolderInfoBySeq(folder_seq_list[i])
      log.debug(this.log_prefix, 'updateStatusTrash', folder_info);
      if (move_folder_info) {
        await folder_model.moveFolder(move_folder_info, folder_info)
      }
      if (is_restore) {
        await this.onChangeFolderSize(group_seq, folder_seq_list[i])
      } else {
        const change_file_size = -Util.parseInt(folder_info.total_folder_size)
        const parent_folder_list = folder_info.parent_folder_list ? JSON.parse(folder_info.parent_folder_list) : []
        await folder_model.addFolderStorageSizeBySeqList(parent_folder_list, change_file_size)
      }
    }

    return true
  }

  getGroupFolderByDepthZero = async (database, group_seq) => {
    const model = this.getOperationFolderModel(database)
    return await model.getGroupFolderByDepthZero(group_seq)
  }

  isFolderAbleRestore = async (folder_seq, group_seq, group_grade_number, is_group_admin) => {
    const folder_info = await this.getFolderInfo(DBMySQL, group_seq, folder_seq)
    if (!folder_info || folder_info.isEmpty()) {
      throw new StdObject(1, '폴더정보가 존재하지 않습니다.', 400)
    }
    const parent_seq = folder_info.parent_seq
    if (!parent_seq) {
      return true
    }
    const parent_folder_info = await this.getFolderInfo(DBMySQL, group_seq, parent_seq)
    if (!parent_folder_info || parent_folder_info.status !== 'Y') {
      throw new StdObject(2, '상위폴더가 삭제되었습니다.', 400)
    }
    if (is_group_admin) return true
    const folder_grade_number = this.getFolderGradeNumber(folder_info.access_type)
    if (folder_grade_number > group_grade_number) {
      throw new StdObject(3, '상위폴더에 접근 권한이 없습니다.', 400)
    }
    return true
  }

  getFolderGradeNumber = (access_type) => {
    if (access_type === 'O' || access_type === 'A') {
      return 99
    }
    return Util.parseInt(access_type, 99)
  }

  getFolderListWithAgent = async (database, group_seq, member_seq) => {
    const folder_model = this.getOperationFolderModel(database)
    // const group_member_info = await GroupService.getGroupMemberInfo(database, group_seq, member_seq)
    const member_grade = this.getFolderGradeNumber(group_member_info.grade)
    const group_folder_list = await folder_model.getAllGroupFolderList(group_seq)

    for (let cnt = 0; cnt < group_folder_list.length; cnt++) {
      const folder_info = group_folder_list[cnt]
      const folder_grade = this.getFolderGradeNumber(folder_info.access_type)
      let bool_grade = false;
      if (member_grade >= 6) {
        bool_grade = true
      } else if (folder_info.is_access_way === 1) {
        const access_list = JSON.parse(folder_info.access_list)
        bool_grade = access_list.read[member_grade]
      } else {
        bool_grade = member_grade >= folder_grade
      }
      folder_info.is_read = bool_grade
      folder_info.is_create = bool_grade
      folder_info.is_delete = bool_grade
      folder_info.is_upload = bool_grade
    }

    return group_folder_list
  }
  updateContentCounts = async (database, mode, counts) => {
    const folder_model = this.getOperationFolderModel(database)
    for (let cnt = 0; cnt < counts.length; cnt++) {
      const item = counts[cnt]
      const filter = {
        seq: item.folder_seq
      }
      const params = {}
      params[mode] = item.count
      await folder_model.updateFolderCounts(filter, params)
    }
  }
  increaseCount = async (database, folder_seq, mode) => {
    const folder_model = this.getOperationFolderModel(database)
    return folder_model.updateCounts(folder_seq, mode)
  }
  decreaseCount = async (database, folder_seq, mode) => {
    const folder_model = this.getOperationFolderModel(database)
    return folder_model.updateCounts(folder_seq, mode, false)
  }
}

const operation_folder_service = new OperationFolderServiceClass()
export default operation_folder_service
