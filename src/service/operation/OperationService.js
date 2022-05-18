import _ from 'lodash'
import querystring from 'querystring'
import DBMySQL from '../../database/knex-mysql'
import ServiceConfig from '../../service/service-config'
import Role from '../../constants/roles'
import Util from '../../utils/Util'
import StdObject from '../../wrapper/std-object'
import log from '../../libs/logger'
// import GroupService from '../group/GroupService'
import OperationFileService from './OperationFileService'
import OperationMediaService from './OperationMediaService'
import OperationDataService from './OperationDataService'
import CloudFileService from '../cloud/CloudFileService'
import VacsService from '../vacs/VacsService'
import OperationModel from '../../database/mysql/operation/OperationModel'
import OperationStorageModel from '../../database/mysql/operation/OperationStorageModel'
import OperationFolderService from './OperationFolderService'
import { VideoIndexInfoModel } from '../../database/mongodb/VideoIndex'
import { OperationMetadataModel } from '../../database/mongodb/OperationMetadata'
import { OperationClipModel } from '../../database/mongodb/OperationClip'
import { UserDataModel } from '../../database/mongodb/UserData'
import OperationInfo from '../../wrapper/operation/OperationInfo'
import OperationClipService from './OperationClipService'
import MongoDataService from '../common/MongoDataService'
import { OperationAnalysisModel } from '../../database/mongodb/OperationAnalysisModel'
import Zip from 'adm-zip'
import iconv from 'iconv-lite'
import NaverObjectStorageService from '../storage/naver-object-storage-service'
// import GroupMemberModel from "../../database/mysql/group/GroupMemberModel";
import OperationCommentService from "./OperationCommentService";
import GroupAlarmService from '../group/GroupAlarmService'
import SyncService from '../sync/SyncService'
import Constants from '../../constants/constants'
// import HashtagService from './HashtagService'
import TranscoderSyncService from '../sync/TranscoderSyncService'
import DynamicService from "../dynamic/DynamicService";
// import GroupCountModel from "../../database/mysql/group/GroupCountsModel";

const OperationServiceClass = class {
  constructor () {
    this.log_prefix = '[OperationServiceClass]'
    this.MODE_OPERATION = 'operation'
    this.MODE_FILE = 'file'
  }

  getOperationModel = (database = null) => {
    if (database) {
      return new OperationModel(database)
    }
    return new OperationModel(DBMySQL)
  }

  getOperationStorageModel = (database = null) => {
    if (database) {
      return new OperationStorageModel(database)
    }
    return new OperationStorageModel(DBMySQL)
  }

  // getGroupMemberModel = (database = null) => {
  //   if (database) {
  //     return new GroupMemberModel(database)
  //   }
  //   return new GroupMemberModel(DBMySQL)
  // }

  // createOperation = async (database, member_info, group_member_info, request_body, status = null, export_from_project = false) => {
  //   const output = new StdObject()
  //   let is_success = false
  //   if (!request_body || !request_body.operation_info) {
  //     throw new StdObject(-2, '수술 정보가 없습니다.', 500)
  //   }
  //   const operation_code = Util.trim(request_body.operation_info.operation_code)
  //   const age = Util.parseInt(request_body.operation_info.patient_age, null)
  //   const sex = Util.trim(request_body.operation_info.patient_sex)
  //
  //   request_body.operation_info.operation_code = operation_code ? operation_code : request_body.operation_info.operation_name
  //   request_body.operation_info.patient_age = age ? age : null
  //   request_body.operation_info.patient_sex = sex ? sex : null
  //
  //   const input_operation_data = new OperationInfo().getByRequestBody(request_body.operation_info)
  //   if (input_operation_data.isEmpty()) {
  //     throw new StdObject(-1, '수술 정보가 없습니다.', 500)
  //   }
  //   const operation_info = input_operation_data.toJSON()
  //   const content_id = Util.getContentId()
  //   const group_media_path = group_member_info.media_path
  //   operation_info.group_seq = group_member_info.group_seq
  //   operation_info.member_seq = member_info.seq
  //   operation_info.media_path = `${group_media_path}/operation/${content_id}/`
  //   operation_info.created_by_user = 1
  //   operation_info.content_id = content_id
  //   operation_info.export_from_project = export_from_project
  //   if (status) {
  //     operation_info.status = status
  //   }
  //
  //   const operation_model = new OperationModel(database)
  //   await operation_model.createOperation(operation_info)
  //   if (!operation_info || !operation_info.seq) {
  //     throw new StdObject(-1, '수술정보 입력에 실패하였습니다.', 500)
  //   }
  //   const operation_seq = operation_info.seq
  //   output.add('operation_info', operation_info)
  //
  //   let operation_storage_seq = null
  //
  //   await database.transaction(async (transaction) => {
  //     const operation_media_seq = await OperationMediaService.createOperationMediaInfo(database, operation_info)
  //     operation_storage_seq = await this.getOperationStorageModel(transaction).createOperationStorageInfo(operation_info)
  //
  //     output.add('operation_seq', operation_seq)
  //     output.add('operation_media_seq', operation_media_seq)
  //     output.add('operation_storage_seq', operation_storage_seq)
  //
  //     is_success = true
  //   })
  //
  //   if (is_success) {
  //     await this.createOperationDirectory(operation_info)
  //
  //     try {
  //       await VideoIndexInfoModel.createVideoIndexInfoByOperation(operation_info)
  //       await OperationMetadataModel.createOperationMetadata(operation_info, request_body.meta_data)
  //       if (operation_info.operation_type) {
  //         await UserDataModel.updateByMemberSeq(member_info.seq, { operation_type: operation_info.operation_type, operation_mode: operation_info.mode })
  //       }
  //     } catch (error) {
  //       log.error(this.log_prefix, '[createOperation]', 'create metadata error', error)
  //     }
  //
  //     const created_operation_info = await operation_model.getOperationInfoNoJoin(operation_seq)
  //     const operation_data_seq = await OperationDataService.createOperationDataByRequest(created_operation_info, request_body, group_member_info.group_seq, group_member_info.group_name, group_member_info.group_type, member_info.hospname)
  //     output.add('operation_data_seq', operation_data_seq)
  //
  //     if (ServiceConfig.isVacs()) {
  //       VacsService.increaseCount(1)
  //     }
  //
  //     // if (group_member_info) {
  //     //   GroupService.onChangeGroupMemberContentCount(group_member_info.group_seq, member_info.seq, operation_info.mode === 'operation' ? 'vid' : 'file', Constants.UP);
  //     // }
  //   }
  //
  //   return output
  // }

  // 수술영상 등록 by djyu
  createOperation = async (database, member_info, request_body, status = null, export_from_project = false) => {
    const output = new StdObject()
    let is_success = false
    if (!request_body || !request_body.operation_info) {
      throw new StdObject(-2, '수술 정보가 없습니다.', 500)
    }
    const operation_code = Util.trim(request_body.operation_info.operation_code)
    const age = Util.parseInt(request_body.operation_info.patient_age, null)
    const sex = Util.trim(request_body.operation_info.patient_sex)

    request_body.operation_info.operation_code = operation_code ? operation_code : request_body.operation_info.operation_name
    request_body.operation_info.patient_age = age ? age : null
    request_body.operation_info.patient_sex = sex ? sex : null

    const input_operation_data = new OperationInfo().getByRequestBody(request_body.operation_info)
    if (input_operation_data.isEmpty()) {
      throw new StdObject(-1, '수술 정보가 없습니다.', 500)
    }
    const operation_info = input_operation_data.toJSON()
    const content_id = Util.getContentId()
    const group_media_path = '/enterprise/2836b830-d983-11eb-8695-4f1fba2797f5'; // group_member_info.media_path
    operation_info.group_seq = 3
    operation_info.member_seq = member_info.seq
    // operation_info.media_path = `${group_media_path}/operation/${content_id}/`
    // operation_info.media_path = `${group_info.media_path}/operation/${content_id}/`
    operation_info.media_path = `/operation/${member_info.content_id}/${content_id}/`
    operation_info.created_by_user = 1 // 1
    operation_info.content_id = content_id
    operation_info.export_from_project = export_from_project
    if (status) {
      operation_info.status = status
    }

    const operation_model = new OperationModel(database)
    await operation_model.createOperation(operation_info)
    if (!operation_info || !operation_info.seq) {
      throw new StdObject(-1, '수술정보 입력에 실패하였습니다.', 500)
    }
    const operation_seq = operation_info.seq
    output.add('operation_info', operation_info)

    let operation_storage_seq = null

    await database.transaction(async (transaction) => {
      const operation_media_seq = await OperationMediaService.createOperationMediaInfo(database, operation_info)
      operation_storage_seq = await this.getOperationStorageModel(transaction).createOperationStorageInfo(operation_info)

      output.add('operation_seq', operation_seq)
      output.add('operation_media_seq', operation_media_seq)
      output.add('operation_storage_seq', operation_storage_seq)

      is_success = true
    })

    if (is_success) {
      await this.createOperationDirectory(operation_info)

      try {
        await VideoIndexInfoModel.createVideoIndexInfoByOperation(operation_info)
        await OperationMetadataModel.createOperationMetadata(operation_info, request_body.meta_data)
        if (operation_info.operation_type) {
          await UserDataModel.updateByMemberSeq(2, { operation_type: operation_info.operation_type, operation_mode: operation_info.mode })
        }
      } catch (error) {
        log.error(this.log_prefix, '[createOperation]', 'create metadata error', error)
      }

      const created_operation_info = await operation_model.getOperationInfoNoJoin(operation_seq)
      const operation_data_seq = await OperationDataService.createOperationDataByRequest(created_operation_info, request_body, 1, 'group', 'G', 1)
      output.add('operation_data_seq', operation_data_seq)

      if (ServiceConfig.isVacs()) {
        VacsService.increaseCount(1)
      }

      // if (group_member_info) {
      //   GroupService.onChangeGroupMemberContentCount(3, 2, operation_info.mode === 'operation' ? 'vid' : 'file', Constants.UP);
      // }
    }

    return output
  }

  copyOperation = (group_seq, member_info, request_body) => {
    (
      async () => {

        const operation_seq_list = request_body.copy_seq_list
        const copy_type = request_body.operation_copy_type ? request_body.operation_copy_type : null
        const folder_info = request_body.folder_info ? request_body.folder_info : null
        const change_group_seq = request_body.group_seq ? request_body.group_seq : group_seq

        const result_list = []
        const copy_result = {
          success: false,
          operation_seq_list,
          copy_type,
          folder_seq: folder_info ? folder_info.seq : null,
          group_seq: change_group_seq,
          result_list
        }
        log.debug(this.log_prefix, '[copyOperation]', 'copy_result', copy_result)
        let has_error = false

        for (let i = 0; i < operation_seq_list.length; i++) {
          const origin_operation_seq = operation_seq_list[i]
          const copy_result = await this.copyOperationOne(member_info, origin_operation_seq, change_group_seq, request_body)
          if (!copy_result.success) {
            has_error = true
          }
          result_list.push(copy_result)

          //TODO: 복사결과 socket 전송
        }
        if (has_error) {
          log.error(this.log_prefix, '[copyOperation]', 'fail', copy_result)
        } else {
          log.debug(this.log_prefix, '[copyOperation]', 'success', copy_result)
        }
      }
    )()
  }

  copyOperationOne = async (member_info, origin_operation_seq, group_seq, request_body) => {
    const copy_type = request_body.operation_copy_type ? request_body.operation_copy_type : null
    const modify_operation_info = request_body.operation_info ? request_body.operation_info : null
    const modify_operation_data = request_body.operation_data ? request_body.operation_data : null
    const folder_info = request_body.folder_info ? request_body.folder_info : null
    const mento_group_seq = request_body.mento_group_seq ? request_body.mento_group_seq : null
    const group_private_fields = ['start_date', 'reg_date', 'modify_date']
    // const group_info = await GroupService.getGroupInfo(null, group_seq, group_private_fields)

    let is_success = false
    const result = {
      success: false
    }
    result.origin_operation_seq = origin_operation_seq

    let operation_seq = null
    const operation_model = new OperationModel(DBMySQL)

    try {
      const content_id = Util.getContentId()
      const origin_operation_info = await this.getOperationInfoNoJoin(DBMySQL, origin_operation_seq, false)
      log.debug(this.log_prefix, '[copyOperationOne]', 'origin_operation_info', origin_operation_seq, group_seq)
      const origin_content_id = origin_operation_info.content_id
      delete origin_operation_info.seq
      delete origin_operation_info.reg_date
      delete origin_operation_info.modify_date

      result.origin_operation_name = origin_operation_info.operation_name
      result.origin_operation_code = origin_operation_info.operation_code

      const operation_info = _.clone(origin_operation_info)
      operation_info.group_seq = group_seq
      if (!operation_info.origin_seq) {
        operation_info.origin_seq = origin_operation_seq
        operation_info.origin_media_path = origin_operation_info.media_path
        operation_info.origin_content_id = origin_content_id
      }
      operation_info.media_path = `${group_info.media_path}/operation/${content_id}/`
      operation_info.content_id = content_id
      operation_info.folder_seq = folder_info !== null ? folder_info.seq : null
      operation_info.status = 'C'

      if (!Util.isEmpty(modify_operation_info)) {
        operation_info.operation_code = modify_operation_info.operation_code
        operation_info.operation_date = modify_operation_info.operation_date
        operation_info.operation_name = modify_operation_info.operation_name
        operation_info.operation_type = modify_operation_info.operation_type
        operation_info.folder_seq = modify_operation_info.folder_seq
        operation_info.hour = modify_operation_info.hour
        operation_info.minute = modify_operation_info.minute
        operation_info.patient_age = modify_operation_info.patient_age
        operation_info.patient_sex = modify_operation_info.patient_sex
      }

      await operation_model.createOperation(operation_info)
      if (!operation_info || !operation_info.seq) {
        throw new StdObject(-1, '수술정보 복사에 실패하였습니다.', 500)
      }
      operation_seq = operation_info.seq
      operation_info.operation_seq = operation_info.seq
      const operation_media_seq = await OperationMediaService.copyOperationMediaInfo(DBMySQL, operation_info, origin_operation_seq)
      const operation_storage_info = await this.getOperationStorageModel(DBMySQL).copyOperationStorageInfo(operation_info, origin_operation_seq)
      const storage_seq = operation_storage_info.seq
      const origin_storage_seq = operation_storage_info.origin_storage_seq

      result.operation_seq = operation_seq
      result.operation_media_seq = operation_media_seq
      result.storage_seq = storage_seq

      const directory_info = this.getOperationDirectoryInfo(operation_info)

      is_success = true

      if (is_success) {
        await this.createOperationDirectory(operation_info)

        const origin_operation_file_list = await OperationFileService.getOperationFileList(DBMySQL, origin_operation_seq, false)
        if (origin_operation_file_list && origin_operation_file_list.length) {
          await OperationFileService.copyOperationFileInfo(DBMySQL, operation_seq, origin_operation_file_list)
        }
        result.copy_operation_file_info = true

        const origin_refer_file_list = await OperationFileService.getReferFileList(DBMySQL, origin_storage_seq, false)
        if (origin_refer_file_list) {
          await OperationFileService.copyReferFileInfo(DBMySQL, storage_seq, origin_refer_file_list, operation_info)
        }
        result.copy_refer_file_info = true

        const video_index_info = await VideoIndexInfoModel.findOneByOperation(origin_operation_seq)
        let index_list = []
        if (video_index_info.index_list) {
          index_list = video_index_info.index_list
          for (let i = 0; i < index_list.length; i++) {
            if (index_list[i].thumbnail_url) {
              index_list[i].thumbnail_url = index_list[i].thumbnail_url.replace(operation_info.origin_media_path, operation_info.media_path)
            }
          }
        }
        await VideoIndexInfoModel.createVideoIndexInfoByOperation(operation_info, index_list)
        result.copy_video_index_info = true

        let operation_metadata = await OperationMetadataModel.findByOperationSeq(origin_operation_seq, '-_id -member_seq -content_id -operation_seq -created_date -modify_date -__v')
        if (operation_metadata) {
          operation_metadata = operation_metadata.toJSON()
          await OperationMetadataModel.createOperationMetadata(operation_info, operation_metadata)
        }
        result.copy_operation_metadata = true

        const copy_clip_result = await OperationClipService.copyClipByOperation(origin_operation_seq, operation_info)
        if (!copy_clip_result) {
          throw new StdObject(-2, '클립 복사에 실패하였습니다.')
        }
        result.copy_clip_list = true

        const { operation_data_seq, origin_data_seq } = await OperationDataService.copyOperationDataByRequest(operation_info, origin_operation_seq, copy_type, modify_operation_data, mento_group_seq)
        result.operation_data_seq = operation_data_seq
        result.copy_operation_data = true

        await OperationCommentService.copyComment(operation_data_seq, origin_data_seq, group_seq)

        const origin_directory_info = this.getOperationDirectoryInfo(origin_operation_info)

        let copy_result
        copy_result = await Util.copyDirectory(origin_directory_info.image, directory_info.image, false)
        if (copy_result.has_error) {
          throw new StdObject(-3, '이미지 복사에 실패하였습니다.', 500, copy_result)
        }
        result.copy_image_directory = true

        await Util.copyDirectory(origin_directory_info.refer, directory_info.refer)
        if (copy_result.has_error) {
          throw new StdObject(-4, '첨부파일 복사에 실패하였습니다.', 500, copy_result)
        }
        result.copy_refer_directory = true

        await Util.copyDirectory(origin_directory_info.temp, directory_info.temp)
        result.copy_temp_directory = true

        await Util.copyDirectory(origin_directory_info.other, directory_info.other)
        result.copy_other_directory = true

        await this.updateStatus(DBMySQL, [operation_seq], 'Y')

        if (ServiceConfig.isVacs()) {
          VacsService.increaseCount(1)
        }

        result.success = true
        await OperationFolderService.onChangeFolderSize(operation_info.group_seq, operation_info.folder_seq)
        // GroupService.onChangeGroupMemberContentCount(group_seq, operation_info.member_seq, operation_info.mode === 'operation' ? 'vid' : 'file', Constants.UP, 1)
        if (!Util.isEmpty(operation_info.folder_seq)) {
          await OperationFolderService.increaseCount(DBMySQL, operation_info.folder_seq, operation_info.mode)
        }
        const group_count_field_name = [operation_info.mode === 'operation' ? 'video_count' : 'file_count']
        // await new GroupCountModel(DBMySQL).AddCount(operation_info.group_seq, group_count_field_name, true)
      }
    } catch (e) {
      log.error(this.log_prefix, '[copyOperationOne]', origin_operation_seq, e, result)
      if (operation_seq) {
        try {
          await this.deleteOperation(null, null, operation_seq, false)
        } catch (error) {
          log.error(this.log_prefix, '[copyOperationOne]', '[Delete Copy Operation]', origin_operation_seq, operation_seq, error)
        }
      }
    }

    return result
  }

  deleteMongoDBData = async (operation_seq) => {
    try {
      await VideoIndexInfoModel.deleteByOperation(operation_seq)
    } catch (e1) {}
    try {
      await OperationMetadataModel.deleteByOperationSeq(operation_seq)
    } catch (e1) {}
    try {
      await OperationClipModel.deleteByOperationSeq(operation_seq)
    } catch (e1) {}
    try {
      OperationAnalysisModel.deleteByOperationSeq(operation_seq)
    } catch (e1) {}
  }

  updateOperation = async (member_seq, operation_info, request_body) => {
    const operation_seq = operation_info.seq

    const age = Util.parseInt(request_body.operation_info.patient_age, null)
    const sex = Util.trim(request_body.operation_info.patient_sex)

    request_body.operation_info.patient_age = age ? age : null
    request_body.operation_info.patient_sex = sex ? sex : null

    const update_operation_info = new OperationInfo().getByRequestBody(request_body.operation_info)
    if (operation_info.isEmpty()) {
      throw new StdObject(-1, '잘못된 요청입니다.', 400)
    }

    const output = new StdObject()
    await DBMySQL.transaction(async (transaction) => {
      const result = await this.getOperationModel(transaction).updateOperationInfo(operation_seq, update_operation_info)
      await OperationDataService.updateOperationDataByRequest(transaction, operation_seq, request_body)
      if (request_body.meta_data) {
        await OperationMetadataModel.updateByOperationInfo(operation_info, update_operation_info.operation_type, request_body.meta_data)
      }
      output.add('result', result)
    })
    try {
      await UserDataModel.updateByMemberSeq(member_seq, { operation_type: update_operation_info.operation_type })
    } catch (error) {
      log.error(this.log_prefix, '[updateOperation]', 'update user_data error', error)
    }
    return output
  }

  deleteOperationByList = (request_data) => {
    (
      async (request_data) => {
        try {
          let target_operation_list = []
          log.debug(this.log_prefix, 'deleteOperationByList', request_data)
          if (request_data.operation_seq_list) {
            const operation_model = this.getOperationModel()
            const operation_list = await operation_model.getOperationListInSeqList(request_data.operation_seq_list)
            log.debug(this.log_prefix, '[deleteOperationByList]', 'operation_list', operation_list)
            if (operation_list) {
              target_operation_list = _.concat(target_operation_list, operation_list)
            }
          }
          log.debug(this.log_prefix, '[deleteOperationByList]', 'target_operation_list', target_operation_list)

          if (target_operation_list && target_operation_list.length > 0) {
            for (let cnt = 0; cnt < target_operation_list.length; cnt++) {
              await OperationService.deleteOperationAndUpdateStorage(target_operation_list[cnt])
            }
          }
        } catch (error) {
          log.error(this.log_prefix, '[deleteOperationBySeqList]', request_data, error)
        }
      }
    )(request_data)
  }

  deleteOperation = async (database, token_info, operation_seq, check_owner = true) => {
    const operation_info = await this.getOperationInfo(database, operation_seq, token_info, check_owner, false)
    await this.deleteOperationAndUpdateStorage(operation_info)
    return true
  }

  deleteOperationAndUpdateStorage = async (operation_info) => {
    const operation_model = this.getOperationModel()
    await operation_model.setOperationStatusDelete(operation_info.seq)
    await OperationDataService.changeStatus(operation_info.seq, 'D')
    await OperationFileService.deleteOperationFileByOperationSeq(null, operation_info.seq)

    await this.deleteMongoDBData(operation_info.seq)
    this.onOperationDeleteComplete(operation_info)
    return true
  }

  onOperationDeleteComplete = (operation_info) => {
    (
      async () => {
        try {
          let delete_link_file = false
          let delete_origin = false
          let has_copy = false
          const operation_model = this.getOperationModel()
          if (operation_info.origin_seq) {
            const has_origin = await operation_model.hasOrigin(operation_info.origin_seq)
            delete_origin = !has_origin
            delete_link_file = true
          } else {
            has_copy = await operation_model.hasCopy(operation_info.seq)
            delete_link_file = !has_copy
          }
          if (!has_copy) {
            await operation_model.deleteOperation(operation_info.seq)
          }

          await this.deleteOperationFiles(operation_info, delete_link_file, delete_origin)
          if (ServiceConfig.isVacs()) {
            VacsService.updateStorageInfo()
            VacsService.increaseCount(0, 1)
          }
          // await OperationFolderService.onChangeFolderSize(operation_info.group_seq, operation_info.folder_seq)

          // 개인용량 Storage update
          await this.getOperationStorageModel(DBMySQL).updateStorageSummary(operation_info.seq, operation_info.member_seq)

          // await OperationStorageModel.updateStorageSummary(operation_info.seq, operation_info.member_seq)

          // await GroupService.updateMemberUsedStorage(null, operation_info.group_seq, operation_info.member_seq)
        } catch (e) {
          log.error(this.log_prefix, '[onOperationDeleteComplete]', e)
        }
      }
    )()
  }

  deleteOperationFiles = async (operation_info, delete_link_file = true, delete_origin = false) => {
    const directory_info = this.getOperationDirectoryInfo(operation_info)
    if (delete_origin) {
      await Util.deleteDirectory(directory_info.root_origin)
      await Util.deleteDirectory(directory_info.root_origin_video)
    }
    if (ServiceConfig.isVacs() === false) {
      log.debug(this.log_prefix, '[deleteOperationFiles]', 'directory_info.root', directory_info.root)
      await Util.deleteDirectory(directory_info.root)
      await Util.deleteDirectory(directory_info.root_video)
      if (delete_link_file) {
        await CloudFileService.requestDeleteObjectFile(directory_info.media_path, true)
      }
      if (delete_origin) {
        await CloudFileService.requestDeleteObjectFile(directory_info.media_path_origin, true)
      }
    } else {
      if (delete_link_file) {
        await Util.deleteDirectory(directory_info.root)
      } else {
        await Util.deleteDirectory(directory_info.image)
        await Util.deleteDirectory(directory_info.refer)
        await Util.deleteDirectory(directory_info.temp)
        await Util.deleteDirectory(directory_info.other)
        await Util.deleteDirectory(directory_info.origin)
        if (!ServiceConfig.isVacs()) {
          await Util.deleteDirectory(directory_info.file)
        }
      }
    }
  }

  getOperationListByRequest = async (database, group_seq, member_seq, request, is_admin = false, is_agent = false) => {
    const request_query = request.query ? request.query : {}
    const page_params = {}
    page_params.page = Util.parseInt(request_query.page, 1)
    // page_params.limit = Util.parseInt(request_query.limit, 20)
    page_params.list_count = request_query.list_count
    page_params.page_count = request_query.page_count
    page_params.no_paging = request_query.no_paging === 'y' ? 'y' : 'n'

    const filter_params = {}
    filter_params.analysis_complete = request_query.analysis_complete
    filter_params.status = request_query.status
    filter_params.menu = request_query.menu
    filter_params.member_seq = request_query.member_seq ? request_query.member_seq : null

    if (request_query.search_keyword) {
      filter_params.search_keyword = Util.trim(request_query.search_keyword)
    }
    if (request_query.member_grade) {
      filter_params.member_grade = request_query.member_grade
    }
    if (request_query.day) {
      filter_params.day = request_query.day
    }
    if (request_query.limit) {
      filter_params.limit = request_query.limit
    }
    if (request_query.analysis_status) {
      filter_params.analysis_status = `${request_query.analysis_status}`.toUpperCase()
    }
    // if(request_query.member_seq) {
    //   filter_params.member_seq = request_query.member_seq
    // }
    // filter_params.use_user_name = !group_member_info || group_member_info.member_name_used === 1
    const order_params = {}
    order_params.field = request_query.order_fields
    order_params.type = request_query.order_type

    // log.debug(this.log_prefix, '[getOperationListByRequest]', 'request.query', request_query, page_params, filter_params, order_params)

    let operation_data_seq_list = []
    if (filter_params.search_keyword) {
    }

    const operation_model = this.getOperationModel(database)
    return operation_model.getOperationInfoListPage(member_seq, page_params, filter_params, order_params, is_admin, operation_data_seq_list, is_agent)
  }

  // // List by djyu
  // getOperationListByRequest2 = async (database, group_seq, member_seq, group_member_info, group_grade_number, is_group_admin, request, is_admin = false, is_agent = false) => {
  //   const request_query = request.query ? request.query : {}
  //   const page_params = {}
  //   page_params.page = request_query.page
  //   page_params.list_count = request_query.list_count
  //   page_params.page_count = request_query.page_count
  //   page_params.no_paging = request_query.no_paging === 'y' ? 'y' : 'n'
  //
  //   const filter_params = {}
  //   filter_params.analysis_complete = request_query.analysis_complete
  //   filter_params.status = request_query.status
  //   filter_params.menu = request_query.menu
  //   filter_params.member_seq = request_query.member_seq ? request_query.member_seq : null
  //   if (request_query.folder_seq) {
  //     filter_params.folder_seq = request_query.folder_seq
  //   }
  //   if (request_query.search_keyword) {
  //     filter_params.search_keyword = Util.trim(request_query.search_keyword)
  //   }
  //   if (request_query.member_grade) {
  //     filter_params.member_grade = request_query.member_grade
  //   }
  //   if (request_query.day) {
  //     filter_params.day = request_query.day
  //   }
  //   if (request_query.limit) {
  //     filter_params.limit = request_query.limit
  //   }
  //   if (request_query.analysis_status) {
  //     filter_params.analysis_status = `${request_query.analysis_status}`.toUpperCase()
  //   }
  //   filter_params.use_user_name = !group_member_info || group_member_info.member_name_used === 1
  //   const order_params = {}
  //   order_params.field = request_query.order_fields
  //   order_params.type = request_query.order_type
  //
  //   // log.debug(this.log_prefix, '[getOperationListByRequest]', 'request.query', request_query, page_params, filter_params, order_params)
  //
  //   let operation_data_seq_list = []
  //   // if (filter_params.search_keyword) {
  //   //   const hashtag_use = await HashtagService.searchHashtagUse(database, group_seq, filter_params.search_keyword, HashtagService.TAG_TARGET_OPERATION)
  //   //   if (hashtag_use && hashtag_use.length) {
  //   //     for (let i = 0; i < hashtag_use.length; i++) {
  //   //       operation_data_seq_list.push(hashtag_use[i].target_seq)
  //   //     }
  //   //   }
  //   // }
  //
  //   const operation_model = this.getOperationModel(database)
  //   return operation_model.getOperationInfoListPage(group_seq, member_seq, group_grade_number, is_group_admin, page_params, filter_params, order_params, is_admin, operation_data_seq_list, is_agent)
  // }

  setMediaInfo = async (database, operation_info) => {
    const media_info = await OperationMediaService.getOperationMediaInfo(database, operation_info)
    operation_info.setMediaInfo(media_info)
  }

  getOperationInfoNoAuth = async (database, operation_seq, import_media_info = true) => {
    const operation_model = this.getOperationModel(database)
    const operation_info = await operation_model.getOperationInfo(operation_seq, import_media_info)
    return { operation_info, operation_model }
  }

  getOperationInfoNoJoin = async (database, operation_seq, wrap_result = true) => {
    const operation_model = this.getOperationModel(database)
    return await operation_model.getOperationInfoNoJoin(operation_seq, wrap_result)
  }

  getOperationInfo = async (database, operation_seq, token_info, check_owner = true, import_media_info = false) => {
    const { operation_info } = await this.getOperationInfoNoAuth(database, operation_seq, false)

    if (!operation_info || operation_info.isEmpty()) {
      throw new StdObject(-1, '수술 정보가 존재하지 않습니다.', 400)
    }
    if (check_owner) {
      if (!token_info) {
        throw new StdObject(-98, '권한이 없습니다.', 403)
      }
      if (operation_info.member_seq !== token_info.getId()) {
        if (token_info.getRole() !== Role.ADMIN) {
          if (operation_info.group_seq !== token_info.getGroupSeq()) {
            throw new StdObject(-99, '권한이 없습니다.', 403)
          }
        }
      }
    }

    if (import_media_info) {
      await this.setMediaInfo(database, operation_info)
    }

    return operation_info
  }

  getOperationInfoByContentId = async (database, content_id, import_media_info = false) => {
    const operation_model = this.getOperationModel(database)
    const operation_info = await operation_model.getOperationInfoByContentId(content_id)

    if (import_media_info) {
      await this.setMediaInfo(database, operation_info)
    }

    return { operation_info, operation_model }
  }

  createOperationDirectory = async (operation_info) => {
    const directory_info = this.getOperationDirectoryInfo(operation_info)

    await Util.createDirectory(directory_info.video)
    await Util.createDirectory(directory_info.other)
    await Util.createDirectory(directory_info.refer)
    await Util.createDirectory(directory_info.image)
    await Util.createDirectory(directory_info.temp)
    await Util.createDirectory(directory_info.file)
    await Util.createDirectory(directory_info.origin)
  }

  getGroupTotalStorageUsedSize = async (database, group_seq) => {
    const operation_model = this.getOperationModel(database)
    return await operation_model.getGroupTotalStorageUsedSize(group_seq)
  }

  getGroupMemberStorageUsedSize = async (database, group_seq, member_seq) => {
    const operation_model = this.getOperationModel(database)
    return await operation_model.getGroupMemberStorageUsedSize(group_seq, member_seq)
  }

  getVideoIndexList = async (operation_seq) => {
    const video_index_info = await VideoIndexInfoModel.findOneByOperation(operation_seq)
    return video_index_info && video_index_info.index_list ? video_index_info.index_list : []
  }

  uploadOperationFile = async (database, request, response, operation_info, file_type, field_name = null, file_name = null) => {
    const directory_info = this.getOperationDirectoryInfo(operation_info)
    let media_directory
    if (file_type === OperationFileService.TYPE_REFER) {
      media_directory = directory_info.refer
    } else if (file_type === OperationFileService.TYPE_FILE) {
      media_directory = directory_info.file
    } else {
      media_directory = directory_info.origin
    }

    if (!(await Util.fileExists(media_directory))) {
      await Util.createDirectory(media_directory)
    }

    const file_field_name = field_name ? field_name : 'target'
    if (file_type === OperationFileService.TYPE_REFER) {
      await Util.uploadByRequest(request, response, file_field_name, media_directory, Util.getRandomId())
    } else if (file_type === OperationFileService.TYPE_FILE) {
      await Util.uploadByRequest(request, response, file_field_name, media_directory, Util.getRandomId())
    } else {
      await Util.uploadByRequest(request, response, file_field_name, media_directory, file_name)
    }
    const upload_file_info = request.file
    if (Util.isEmpty(upload_file_info)) {
      throw new StdObject(-1, '파일 업로드가 실패하였습니다.', 500)
    }
    upload_file_info.new_file_name = request.new_file_name

    return await this.createOperationFileInfo(file_type, operation_info, upload_file_info, request.body)
  }

  createOperationFileInfo = async (file_type, operation_info, upload_file_info, request_body) => {
    let upload_seq = null
    if (file_type === OperationFileService.TYPE_REFER) {
      upload_seq = await OperationFileService.createReferFileInfo(null, operation_info, upload_file_info)
    } else if (file_type === OperationFileService.TYPE_FILE) {
      upload_seq = await OperationFileService.createOperationFileInfo(null, operation_info, upload_file_info, request_body)
    } else {
      upload_seq = await OperationFileService.createVideoFileInfo(null, operation_info, upload_file_info, false)
    }
    // if (!upload_seq) {
    //   throw new StdObject(-1, '파일 정보를 저장하지 못했습니다.', 500)
    // }
    return upload_seq
  }

  uploadOperationFileByZip = (operation_info, temp_directory, zip_file_path, encoding, file_type) => {
    const directory_info = this.getOperationDirectoryInfo(operation_info)
    const operation_seq = operation_info.seq
    const storage_seq = operation_info.storage_seq

    let zip = null
    try {
      zip = new Zip(zip_file_path)
    } catch (e) {
      log.error(this.log_prefix, '[uploadOperationFileByZip] - unable open zip file', operation_seq, e);
      (
        async () => {
          await Util.deleteDirectory(temp_directory)
        }
      )()
      return
    }

    (
      async (zip_entries) => {
        for (let i = 0; i < zip_entries.length; i++) {
          const zip_entry = zip_entries[i]
          if (zip_entry.isDirectory) continue
          const entry_header = zip_entry.header
          const size = entry_header.size
          const entry_name = iconv.decode(zip_entry.rawEntryName, encoding);
          const file_name = entry_name.split("/").pop()
          log.debug(this.log_prefix, '[uploadOperationFileByZip]', operation_seq, entry_name, file_name, size);

          const upload_file_name = Util.getRandomId()
          const upload_file_path = directory_info.refer + upload_file_name
          const upload_result = await Util.writeFile(upload_file_path, zip_entry.getData(), false)
          if (!upload_result) {
            log.error(this.log_prefix, '[uploadOperationFileByZip] unable write file', operation_seq, entry_name, upload_file_path)
            return;
          }
          const upload_file_info = {
            originalname: file_name,
            new_file_name: upload_file_name,
            path: upload_file_path,
            size
          }
          try {
            await this.createOperationFileInfo(file_type, operation_info, upload_file_info, storage_seq)
          } catch (e) {
            log.error(this.log_prefix, '[uploadOperationFileByZip]', operation_seq, e)
          }
        }

        await Util.deleteDirectory(temp_directory)
      }
    )(zip.getEntries())
  }

  onUploadComplete = async (operation_info, is_create = false) => {
    if (operation_info.mode === 'file') {
      if (!ServiceConfig.isVacs()) {
        const directory_info = this.getOperationDirectoryInfo(operation_info)
        if (!is_create) {
          await NaverObjectStorageService.moveFolder(directory_info.file, directory_info.media_file)
        }
      }
    }
    await this.updateStorageSize(operation_info)
  }

  updateOperationDataFileThumbnail = async (operation_info) => {
    const result = await OperationFileService.getFileList(DBMySQL, operation_info, 'file', { limit: 1 })
    if (result) {
      if (result.operation_file_list && result.operation_file_list.length > 0) {
        let thumbnail = result.operation_file_list[0].thumbnail_path
        if (thumbnail) {
          if (!ServiceConfig.isVacs()) {
            thumbnail = ServiceConfig.get('static_cloud_prefix') + thumbnail
          }
          await OperationDataService.setThumbnailAuto(operation_info.seq, thumbnail);
        }
      }
    }
  }

  requestAnalysis = (database, token_info, operation_seq, member_info) => {
    (
      async () => {
        try {
          const operation_info = await this.getOperationInfo(database, operation_seq, token_info, false)
          // log.debug(this.log_prefix, 'operation_info', 'operation_info.seq:', operation_info.seq, 'operation_seq:', operation_seq, `${operation_info.seq}` === `${operation_seq}`)
          if (operation_info && `${operation_info.seq}` === `${operation_seq}`) {
            if (operation_info.mode === this.MODE_FILE) {
              if (ServiceConfig.isVacs()) {
                await OperationService.updateOperationDataFileThumbnail(operation_info)
                await this.updateAnalysisStatus(null, operation_info, 'Y')
                SyncService.sendAnalysisCompleteMessage(operation_info)
              } else {
                await this.updateAnalysisStatus(null, operation_info, 'R')
                this.onOperationCreateComplete(operation_info, member_info)
                await SyncService.moveImageFileToObject(operation_info)
              }
            } else {
              await this.requestTranscoder(operation_info)
              this.onOperationCreateComplete(operation_info, member_info)
            }
          } else {
            log.error(this.log_prefix, '[requestAnalysis] operation not exists', operation_seq)
          }
        } catch (error) {
          log.error(this.log_prefix, '[requestAnalysis]', operation_seq, error)
        }
      }
    )()
  }


  getBaseInfo = (database, req) => {
    const token_info = req.token_info
    // log.error(this.log_prefix, '[getBaseInfo] token_info', req);
    const member_seq = token_info.getId()
    return {
      token_info,
      member_seq
    }
  }

  // 인코딩, 썸네일 by djyu
  requestAnalysis2 = (database, token_info, operation_seq, member_info) => {
    (
      async () => {
        try {
          const operation_info = await this.getOperationInfo(database, operation_seq, token_info, false)
          // log.debug(this.log_prefix, 'operation_info', 'operation_info.seq:', operation_info.seq, 'operation_seq:', operation_seq, `${operation_info.seq}` === `${operation_seq}`)
          if (operation_info && `${operation_info.seq}` === `${operation_seq}`) {
            if (operation_info.mode === this.MODE_FILE) {
              if (ServiceConfig.isVacs()) {
                await OperationService.updateOperationDataFileThumbnail(operation_info)
                await this.updateAnalysisStatus(null, operation_info, 'Y')
                SyncService.sendAnalysisCompleteMessage(operation_info)
              } else {
                await this.updateAnalysisStatus(null, operation_info, 'R')
                this.onOperationCreateComplete(operation_info, member_info)
                await SyncService.moveImageFileToObject(operation_info)
              }
            } else {
              await this.requestTranscoder(operation_info)
              this.onOperationCreateComplete(operation_info, member_info)
            }
          } else {
            log.error(this.log_prefix, '[requestAnalysis2] operation not exists', operation_seq)
          }
        } catch (error) {
          log.error(this.log_prefix, '[requestAnalysis2]', operation_seq, error)
        }
      }
    )()
  }

  onOperationCreateComplete(operation_info, member_info) {
    (
      async () => {
        try {
          if (!Util.isEmpty(operation_info.folder_seq)) {
            await OperationFolderService.increaseCount(DBMySQL, operation_info.folder_seq, operation_info.mode)
          }
          // const group_count_field_name = [operation_info.mode === 'operation' ? 'video_count' : 'file_count']
          // // await new GroupCountModel(DBMySQL).AddCount(operation_info.group_seq, group_count_field_name, true)

          const alarm_data = {
            operation_seq: operation_info.seq,
            member_seq: member_info.seq
          }
          const name = member_info.user_name
          const alarm_message = `'${name}'님이 '${operation_info.operation_name}'수술을 등록했습니다.`

          const socket_message = {
            title: `'${name}'님이 '${operation_info.operation_name}'수술을 등록했습니다.`,
          }
          const socket_data = {
            operation_seq: operation_info.seq,
            folder_seq: operation_info.folder_seq,
            member_seq: operation_info.member_seq,
            message: socket_message.title,
            analysis_complete: false,
            reload_operation_list: true,
            disable_click: true
          }
          GroupAlarmService.createOperationGroupAlarm(member_info.seq, GroupAlarmService.ALARM_TYPE_OPERATION, alarm_message, operation_info, member_info, alarm_data, socket_message, socket_data, true)
        } catch (error) {
          log.error(this.log_prefix, '[onOperationCreateComplete]', error)
        }
      }
    )()
  }

  updateStorageSize = async (operation_info) => {
    await new OperationStorageModel(DBMySQL).updateUploadFileSize(operation_info, OperationFileService.TYPE_ALL)
    // await GroupService.updateMemberUsedStorage(null, operation_info.group_seq, operation_info.member_seq)
    await OperationFolderService.onChangeFolderSize(operation_info.group_seq, operation_info.folder_seq)
    if (ServiceConfig.isVacs()) {
      VacsService.updateStorageInfo()
    }
  }

  deleteFileInfo = async (operation_info, file_type, request_body) => {
    if (file_type === OperationFileService.TYPE_VIDEO) {
      throw new StdObject(-1, '잘못된 요청입니다.', 400)
    }

    if (file_type === OperationFileService.TYPE_FILE) {
      await OperationFileService.deleteOperationFileList(DBMySQL, operation_info, request_body)
      return
    }

    const file_seq_list = request_body.file_seq_list
    if (!file_seq_list || file_seq_list.length <= 0) {
      throw new StdObject(-2, '잘못된 요청입니다.', 400)
    }

    if (file_type === OperationFileService.TYPE_REFER) {
      await OperationFileService.deleteReferFileList(DBMySQL, operation_info, file_seq_list)
    } else {
      return
    }
    await this.updateStorageSize(operation_info)
  }

  createOperationVideoThumbnail = async (origin_video_path, operation_info, second = 0, media_info, use_name_second = false) => {
    const directory_info = this.getOperationDirectoryInfo(operation_info)
    let width, height
    if (media_info) {
      width = media_info.width
      height = media_info.height
    } else {
      const dimension = await Util.getVideoDimension(origin_video_path)
      width = dimension.width
      height = dimension.height
    }
    if (width && height) {
      const thumb_width = Util.parseInt(ServiceConfig.get('thumb_width'), 212)
      const thumb_height = Util.parseInt(ServiceConfig.get('thumb_height'), 160)
      const file_id = Util.getRandomId()
      const thumbnail_file_name = use_name_second ? `thumb_sec_${second}.jpg` : `thumb_${file_id}.jpg`
      const thumbnail_image_path = `${directory_info.image}${thumbnail_file_name}`

      const get_thumbnail_result = await Util.getThumbnail(origin_video_path, thumbnail_image_path, second, thumb_width, thumb_height, media_info)
      if (get_thumbnail_result.success && (await Util.fileExists(thumbnail_image_path))) {
        return {
          file_id: file_id,
          file_name: thumbnail_file_name,
          full: thumbnail_image_path,
          path: `${directory_info.media_image}${thumbnail_file_name}`
        }
      } else {
        log.error(this.log_prefix, '[updateTranscodingComplete]', '[Util.getThumbnail]', get_thumbnail_result)
      }
    }
    return null
  }

  requestTranscoder = async (operation_info) => {
    const encoding_info = await this.checkOperationFileStatus(operation_info, null, false, true, true)
    log.debug(this.log_prefix, '[requestTranscoder]', encoding_info)
    if (encoding_info.is_error) {
      await OperationService.updateAnalysisStatus(DBMySQL, operation_info, 'E', encoding_info)
      throw new StdObject(601, encoding_info.message, 500, encoding_info)
    }
    const directory_info = this.getOperationDirectoryInfo(operation_info)
    let api_request_result = null
    let is_execute_success = false

    const content_id = operation_info.content_id
    const query_data = {
      'DirPath': directory_info.trans_origin,
      'ContentID': content_id
    }
    const query_str = querystring.stringify(query_data)

    const request_options = {
      hostname: ServiceConfig.get('trans_server_domain'),
      port: ServiceConfig.get('trans_server_port'),
      path: ServiceConfig.get('trans_start_api') + '?' + query_str,
      method: 'GET'
    }
    const api_url = 'http://' + ServiceConfig.get('trans_server_domain') + ':' + ServiceConfig.get('trans_server_port') + ServiceConfig.get('trans_start_api') + '?' + query_str
    log.debug(this.log_prefix, '[requestTranscoder]', 602, 'trans api url', api_url)
    let request_error = null
    try {
      api_request_result = await Util.httpRequest(request_options, false)
      is_execute_success = api_request_result && api_request_result.toLowerCase() === 'done'
      request_error = api_request_result
    } catch (error) {
      log.error(this.log_prefix, '[requestTranscoder]', 603, 'trans api url', api_url, error)
      request_error = error
    }

    if (is_execute_success) {
      await OperationService.updateAnalysisStatus(DBMySQL, operation_info, 'R')
    } else {
      const encoding_info = {
        is_error: true,
        message: '동영상 인코딩 요청이 실패하였습니다.',
        is_trans_success: false,
        video_file_list: [],
        next: Constants.ENCODING_PROCESS_REQUEST_TRANSCODING,
        error: request_error
      }
      await OperationService.updateAnalysisStatus(DBMySQL, operation_info, 'E', encoding_info)
      throw new StdObject(604, encoding_info.message, 500, encoding_info)
    }
  }

  isDuplicateOperationCode = async (database, group_seq, member_seq, operation_code) => {
    const operation_model = this.getOperationModel(database)
    return operation_model.isDuplicateOperationCode(group_seq, member_seq, operation_code)
  }

  updateLinkState = async (database, operation_seq, has_link) => {
    const operation_model = this.getOperationModel(database)
    await operation_model.updateLinkState(operation_seq, has_link)
  }

  updateAnalysisStatus = async (database, operation_info, status, encoding_info = null) => {
    const operation_model = this.getOperationModel(database)
    await operation_model.updateAnalysisStatus(operation_info.seq, status, encoding_info)
    if (status === 'Y') {
      try {
        await OperationDataService.onUpdateComplete(operation_info.seq)
      } catch (error) {
        log.error(this.log_prefix, '[updateAnalysisStatus] - OperationDataService.onUpdateComplete', operation_info.seq, error)
      }
      if (ServiceConfig.isVacs()) {
        VacsService.updateStorageInfo()
      }
    }
  }

  getVideoDownloadURL = (operation_info) => {
    const directory_info = this.getOperationDirectoryInfo(operation_info)
    const has_origin = operation_info.origin_seq
    let video_path = directory_info.cdn_video
    if (ServiceConfig.isVacs()) {
      if (has_origin) {
        video_path = directory_info.url_video_origin
      } else {
        video_path = directory_info.url_video
      }
      return video_path + operation_info.media_info.video_file_name
    }
    if (has_origin) {
      video_path = directory_info.cdn_video_origin
    }
    return video_path + operation_info.media_info.video_file_name
  }

  getOperationMode = async (operation_seq) => {
    const operation_model = this.getOperationModel()
    return operation_model.getOperationMode(operation_seq)
  }

  getOperationDataView = async (operation_seq, group_seq) => {
    const options = {
      index_list: true,
      clip_list: true,
      writer_info: true,
      refer_file_list: true,
      import_media_info: true,
      questionnaire: true,
    }
    return this.getOperationDataInfo(operation_seq, group_seq, options)
  }

  getOperationDataViewFile = async (operation_seq, group_seq) => {
    const options = {
      index_list: false,
      clip_list: true,
      writer_info: true,
      refer_file_list: true,
      import_media_info: false,
      questionnaire: true,
    }
    return this.getOperationDataInfo(operation_seq, group_seq, options)
  }

  getOperationDataInfo = async (operation_seq, group_seq, options = null) => {
    const { operation_info } = await this.getOperationInfoNoAuth(DBMySQL, operation_seq, options ? options.import_media_info : false)
    if (!operation_info || operation_info.isEmpty()) {
      throw new StdObject(-1, '등록된 수술이 없습니다.', 400)
    }
    let operation_data_info = await OperationDataService.getOperationDataByOperationSeq(DBMySQL, operation_seq)
    if (!operation_data_info || operation_data_info.isEmpty()) {
      const operation_data_seq = await OperationDataService.createOperationDataByOperationSeq(operation_seq)
      if (operation_data_seq) {
        operation_data_info = await OperationDataService.getOperationDataByOperationSeq(DBMySQL, operation_data_seq)
      }
    }
    if (operation_data_info.thumbnail && !operation_data_info.thumbnail.startsWith('/static/')) {
      operation_data_info.setUrl(ServiceConfig.get('static_storage_prefix'))
    }

    const output = new StdObject()
    output.add('operation_info', operation_info)
    output.add('operation_data_info', operation_data_info)
    output.add('is_writer', operation_info.group_seq === group_seq)

    if (options) {
      if (options.index_list) {
        const index_list = await this.getVideoIndexList(operation_seq)
        output.add('index_list', index_list)
      }

      if (options.clip_list) {
        const clip_list = await OperationClipService.findByOperationSeq(operation_seq)
        output.add('clip_list', clip_list)
      }

      if (options.writer_info) {
        // const writer_info = await GroupService.getGroupInfoWithGroupCounts(DBMySQL, operation_info.group_seq)
        output.add('writer_info', '')
      }

      if (options.refer_file_list) {
        const { refer_file_list } = await OperationFileService.getFileList(DBMySQL, operation_info, OperationFileService.TYPE_REFER)
        output.add('refer_file_list', refer_file_list)
      }

      if (options.operation_metadata) {
        const operation_metadata = await OperationMetadataModel.findByOperationSeq(operation_seq)
        output.add('operation_metadata', operation_metadata)
      }

      if (options.medical_info) {
        const medical_info_lang = options.medical_info_lang ? options.medical_info_lang : 'kor';
        const medical_info = await MongoDataService.getMedicalInfo(medical_info_lang)
        output.add('medical_info', medical_info)
      }

      if (options.questionnaire) {
        const questionnaire_list = await DynamicService.getDynamicResultList(operation_seq)
        output.add('questionnaire_list', questionnaire_list)
      }
    }

    return output
  }

  getOperationByFolderSeq = async (database, group_seq, folder_seq) => {
    const model = this.getOperationModel(database)
    return await model.getOperationByFolderSeq(group_seq, folder_seq)
  }

  updateStatusFavorite = async (database, operation_seq, is_delete) => {
    const model = this.getOperationModel(database)
    return await model.updateStatusFavorite(operation_seq, is_delete)
  }

  updateStatusTrash = async (database, request_body, is_restore = false, is_admin, delete_member_seq) => {
    const operation_seq_list = request_body.seq_list
    // const restore_folder_info = is_restore && request_body.folder_info ? request_body.folder_info : null
    const model = this.getOperationModel(database)
    const status = is_restore ? 'Y' : 'T'
    await model.updateStatusTrash(operation_seq_list, status, is_admin, delete_member_seq)
    await OperationDataService.updateOperationDataByOperationSeqList(operation_seq_list, status)

    try {
      for (let cnt = 0; cnt < operation_seq_list.length; cnt++) {
        const where = { 'operation.seq': operation_seq_list[cnt] }
        const operation_info = await model.getOperation(where);

        // if (is_restore) {
        //   // GroupService.onChangeGroupMemberContentCount(group_seq, operation_info.member_seq, operation_info.mode === 'operation' ? 'vid' : 'file', Constants.UP)
        //   if (!Util.isEmpty(operation_info.folder_seq)) {
        //     await OperationFolderService.increaseCount(DBMySQL, operation_info.folder_seq, operation_info.mode)
        //   }
        //   const group_count_field_name = [operation_info.mode === 'operation' ? 'video_count' : 'file_count']
        //   // await new GroupCountModel(DBMySQL).AddCount(operation_info.group_seq, group_count_field_name, true)
        // } else {
        //   // GroupService.onChangeGroupMemberContentCount(group_seq, operation_info.member_seq, operation_info.mode === 'operation' ? 'vid' : 'file', Constants.DOWN)
        //   if (!Util.isEmpty(operation_info.folder_seq)) {
        //     await OperationFolderService.decreaseCount(DBMySQL, operation_info.folder_seq, operation_info.mode)
        //   }
        //   const group_count_field_name = [operation_info.mode === 'operation' ? 'video_count' : 'file_count']
        //   // await new GroupCountModel(DBMySQL).MinusCount(operation_info.group_seq, group_count_field_name, true)
        // }
        //
        // if (is_restore && restore_folder_info && restore_folder_info.seq) {
        //   await OperationFolderService.onChangeFolderSize(group_seq, restore_folder_info.seq)
        // } else if (operation_info.folder_seq !== null) {
        //   await OperationFolderService.onChangeFolderSize(group_seq, operation_info.folder_seq)
        // }
      }
    } catch (error) {
      log.error(this.log_prefix, '[updateStatusTrash]', operation_seq_list, is_restore, error)
      throw error
    }

    return true
  }

  updateStatus = async (database, seq_list, status) => {
    const model = this.getOperationModel(database)
    await model.updateStatus(seq_list, status)
    await OperationDataService.updateOperationDataByOperationSeqList(seq_list, status)

    return true
  }

  moveOperationFolder = async (database, group_seq, operation_seq_list, folder_info) => {
    log.debug(this.log_prefix, '[moveOperationFolder]', 'group_seq', group_seq, 'operation_seq_list', operation_seq_list)
    try {
      const model = this.getOperationModel(database)
      const old_folder_map = {}
      for (let cnt = 0; cnt < operation_seq_list.length; cnt++) {
        const where = { 'operation.seq': operation_seq_list[cnt] }
        const operation_info = await model.getOperation(where);
        if (operation_info.folder_seq) {
          old_folder_map[operation_info.folder_seq] = true
        }
        if (!Util.isEmpty(folder_info.seq)) {
          await OperationFolderService.increaseCount(DBMySQL, folder_info.seq, operation_info.mode)
          await OperationFolderService.decreaseCount(DBMySQL, operation_info.folder_seq, operation_info.mode)
        }
      }

      await model.moveOperationFolder(operation_seq_list, folder_info ? folder_info.seq : null)

      if (folder_info) {
        await OperationFolderService.onChangeFolderSize(group_seq, folder_info.seq)
      }
      const old_folder_key_list = Object.keys(old_folder_map)
      for (let i = 0; i < old_folder_key_list.length; i++) {
        await OperationFolderService.onChangeFolderSize(group_seq, old_folder_key_list[i])
      }
    } catch (e) {
      throw e
    }
  }

  getOperationListInFolderSeqList = async (database, group_seq, folder_seq_list, status = null, wrap_result = true) => {
    const model = this.getOperationModel(database)
    const operation_info_list = await model.getOperationListInFolderSeqList(group_seq, folder_seq_list, status)

    if (wrap_result) {
      for (let cnt = 0; cnt < operation_info_list.length; cnt++) {
        operation_info_list[cnt] = new OperationInfo(operation_info_list[cnt], null);
      }
    }

    return operation_info_list
  }

  getOperationDirectoryInfo = (operation_info) => {
    const media_path = operation_info.media_path
    const origin_media_path = operation_info.origin_media_path
    const media_directory = ServiceConfig.getMediaRoot() + media_path
    const video_directory = ServiceConfig.getVideoRoot() + media_path
    const url_prefix = ServiceConfig.get('static_storage_prefix') + media_path
    const cdn_url = ServiceConfig.get('static_cloud_prefix') + media_path
    const origin_media_directory = ServiceConfig.getMediaRoot() + origin_media_path
    const origin_media_video_directory = ServiceConfig.getVideoRoot() + origin_media_path
    const origin_url_prefix = ServiceConfig.get('static_storage_prefix') + origin_media_path
    const origin_cdn_url = ServiceConfig.get('static_cloud_prefix') + origin_media_path
    const content_path = operation_info.content_id + '/'
    const origin_content_path = operation_info.origin_content_id + '/'
    const trans_server_root = ServiceConfig.get('trans_server_root')

    return {
      'root': media_directory,
      'root_video': video_directory,
      'root_origin': origin_media_directory,
      'root_origin_video': origin_media_video_directory,
      'origin': video_directory + 'origin/',
      'video': video_directory + 'video/',
      'other': media_directory + 'other/',
      'refer': media_directory + 'refer/',
      'image': media_directory + 'image/',
      'temp': media_directory + 'temp/',
      'file': video_directory + 'file/',
      'media_path': media_path,
      'media_path_origin': origin_media_path,
      'media_origin': media_path + 'origin/',
      'media_video': media_path + 'video/',
      'media_video_origin': origin_media_path + 'video/',
      'media_other': media_path + 'other/',
      'media_refer': media_path + 'refer/',
      'media_image': media_path + 'image/',
      'media_temp': media_path + 'temp/',
      'media_file': media_path + 'file/',
      'trans_origin': trans_server_root + media_path + 'origin/',
      'trans_video': trans_server_root + media_path + 'video/',
      'url_prefix': url_prefix,
      'url_origin': url_prefix + 'origin/',
      'url_video': url_prefix + 'video/',
      'url_video_origin': origin_url_prefix + 'video/',
      'url_other': url_prefix + 'other/',
      'url_refer': url_prefix + 'refer/',
      'url_image': url_prefix + 'image/',
      'url_temp': url_prefix + 'temp/',
      'url_file': url_prefix + 'file/',
      'cdn_prefix': cdn_url,
      'cdn_video': cdn_url + 'video/',
      'cdn_video_origin': origin_cdn_url + 'video/',
      'cdn_other': cdn_url + 'other/',
      'cdn_refer': cdn_url + 'refer/',
      'cdn_image': cdn_url + 'image/',
      'cdn_file': cdn_url + 'file/',
      'content_path': content_path,
      'content_origin': content_path + 'origin/',
      'content_video': content_path + 'video/',
      'content_video_origin': origin_content_path + 'video/',
      'content_other': content_path + 'other/',
      'content_refer': content_path + 'refer/',
      'content_image': content_path + 'image/',
      'content_temp': content_path + 'temp/',
      'content_file': content_path + 'file/',
    }
  }

  getAllOperationGroupMemberList = async (database, group_seq, member_seq) => {
    const model = this.getOperationModel(database)
    return await model.getGroupMemberOperationList(group_seq, member_seq);
  }

  setAllOperationClipDeleteByGroupSeqAndMemberSeq = async (databases, group_seq, member_seq) => {
    const clip_list = await OperationClipService.findByMemberSeqAndGroupSeq(member_seq, group_seq);
    let counting_clip = {};
    for (let i = 0; i < clip_list.length; i++) {
      const operation_seq = Number(clip_list[i].operation_seq);
      if (!counting_clip[operation_seq]) {
        counting_clip[operation_seq] = 1;
      } else {
        counting_clip[operation_seq]++;
      }
      const clip_id = clip_list[i]._id.toString();
      await OperationCommentService.deleteClipInfo(clip_id);
      await OperationClipModel.deleteById(clip_id);
    }
    const operation_storage_model = this.getOperationStorageModel(databases);
    const operation_seq_list = Object.keys(counting_clip);
    for (let i = 0; i < operation_seq_list.length; i++) {
      const operation_seq = operation_seq_list[i];
      const del_count = counting_clip[operation_seq];
      const operation_storage_info = await operation_storage_model.getOperationStorageInfo({ seq: operation_seq });
      let update_clip_count = operation_storage_info.clip_count - del_count;
      if (update_clip_count <= 0) {
        update_clip_count = 0;
      }
      await OperationClipService.updateClipCount({ seq: operation_storage_info.seq }, update_clip_count);
    }
  }

  getFolderGrade = async (operation_seq) => {
    const model = this.getOperationModel()
    const query_result = await model.getOperationFolderGrade(operation_seq)
    if (!query_result || !query_result.seq) return 100
    if (query_result.folder_seq === null) return 1
    return OperationFolderService.getFolderGradeNumber(query_result.access_type)
  }

  isOperationActive = async (operation_seq, group_seq, is_group_admin, group_grade_number) => {
    const operation_info = await this.getOperationInfoNoJoin(null, operation_seq, true)
    if (!operation_info || Util.parseInt(operation_info.seq, 0) !== Util.parseInt(operation_seq, 0)) {
      return new StdObject(51, '수술정보가 존재하지 않습니다.')
    }
    if (operation_info.status === 'T') {
      return new StdObject(52, '휴지통에 있는 수술은 확인이 불가능 합니다.')
    }
    if (operation_info.status === 'D') {
      return new StdObject(53, '삭제된 수술입니다.')
    }
    const folder_seq = operation_info.folder_seq
    if (is_group_admin || !folder_seq) {
      return new StdObject()
    }
    const folder_info = await OperationFolderService.getFolderInfo(null, group_seq, folder_seq);
    const folder_grade_num = OperationFolderService.getFolderGradeNumber(folder_info.access_type)
    let is_able_access_folder = false
    if (folder_info.is_access_way === 1) {
      if (folder_info.access_list) {
        const access_list = JSON.parse(folder_info.access_list)
        is_able_access_folder = access_list.read[group_grade_number]
      }
    } else {
      is_able_access_folder = group_grade_number >= folder_grade_num
    }
    if (!is_able_access_folder) {
      return new StdObject(54, '폴더 접근 권한이 없습니다.')
    }
    return new StdObject()
  }

  isOperationAbleRestore = async (operation_seq, group_seq, group_grade_number, is_group_admin) => {
    const operation_info = await this.getOperationInfoNoJoin(DBMySQL, operation_seq, true)
    if (!operation_info || operation_info.isEmpty()) {
      throw new StdObject(1, '수술정보가 존재하지 않습니다.', 400)
    }
    // if (!operation_info.folder_seq) {
    //   return true
    // }
    // const folder_info = await OperationFolderService.getFolderInfo(DBMySQL, group_seq, operation_info.folder_seq)
    // if (!folder_info || folder_info.status !== 'Y') {
    //   throw new StdObject(2, '상위폴더가 삭제되었습니다.', 400)
    // }
    // if (is_group_admin) return true
    // const folder_grade_number = OperationFolderService.getFolderGradeNumber(folder_info.access_type)
    // if (folder_grade_number > group_grade_number) {
    //   throw new StdObject(3, '상위폴더에 접근 권한이 없습니다.', 400)
    // }
    return true
  }

  onAgentVideoUploadComplete = async (operation_info) => {
    await TranscoderSyncService.updateTranscodingComplete(operation_info, Util.getRandomId(), Constants.AGENT_VIDEO_FILE_NAME, null, null)
  }

  getAgentFileList = async (operation_seq, query, member_seq) => {
    const { operation_info } = await this.getOperationInfoNoAuth(null, operation_seq)
    if (!operation_info || operation_info.isEmpty()) {
      throw new StdObject(2011, '수술정보가 존재하지 않습니다.')
    }
    const group_seq = operation_info.group_seq
    // const { is_group_admin } = await GroupService.checkGroupAuthBySeq(null, group_seq, member_seq, true, false, false)
    const has_admin_permission = is_group_admin === true || operation_info.member_seq === member_seq
    const import_main_files = Util.isTrue(query.main)
    const import_refer_files = Util.isTrue(query.refer)
    log.debug(this.log_prefix, '[getAgentFileList]', operation_seq, query, is_group_admin, member_seq, is_group_admin === true, import_main_files, import_refer_files)

    const mode = operation_info.mode
    const file_list = []
    if (import_main_files && (has_admin_permission || operation_info.is_video_download)) {
      if (mode === this.MODE_FILE) {
        const file_list_query = {
          last_seq: 0,
          limit: 1000
        }
        let operation_file_list = await OperationFileService.getOperationFileList(null, operation_seq, true, file_list_query)
        let list_count = operation_file_list ? operation_file_list.length : 0
        while (list_count > 0) {
          for (let i = 0; i < list_count; i++) {
            const file_info = operation_file_list[i]
            file_list.push({
              type: 'image',
              seq: file_info.seq,
              directory: file_info.directory,
              file_name: file_info.file_name,
              download_url: file_info.origin_url,
              file_size: file_info.file_size
            })
          }
          file_list_query.last_seq = operation_file_list[list_count - 1].seq

          operation_file_list = await OperationFileService.getOperationFileList(null, operation_seq, true, file_list_query)
          list_count = operation_file_list ? operation_file_list.length : 0
        }
      } else {
        const media_info = operation_info.media_info
        file_list.push({
          type: 'video',
          seq: media_info.seq,
          directory: null,
          file_name: `${operation_info.operation_name}.mp4`,
          download_url: media_info.download_url,
          file_size: operation_info.origin_video_size
        })
      }
    }
    log.debug(this.log_prefix, '', import_refer_files, has_admin_permission, operation_info.is_file_download, import_refer_files && (has_admin_permission || operation_info.is_file_download))
    if (import_refer_files && (has_admin_permission || operation_info.is_file_download)) {
      const refer_file_list = await OperationFileService.getReferFileList(null, operation_info.storage_seq, true)
      if (refer_file_list && refer_file_list.length > 0) {
        for (let i = 0; i < refer_file_list.length; i++) {
          const file_info = refer_file_list[i]
          file_list.push({
            type: 'refer_file',
            seq: file_info.seq,
            directory: null,
            file_name: file_info.file_name,
            download_url: file_info.download_url,
            file_size: file_info.file_size
          })
        }
      }
    }

    return file_list
  }

  getAgentOperationList = async (group_seq, member_seq, group_member_info, group_grade_number, is_group_admin, request) => {
    log.debug(this.log_prefix, request.query)
    request.query.no_paging = 'y'
    request.query.analysis_status = 'Y'
    request.query.menu = 'drive'
    const operation_list = await this.getOperationListByRequest(DBMySQL, group_seq, member_seq, group_member_info, group_grade_number, is_group_admin, request, false, true)

    if (operation_list && operation_list.data) {
      for (let i = 0; i < operation_list.data.length; i++) {
        const operation_info = operation_list.data[i];
        if (is_group_admin) {
          operation_info.is_video_download = true
          operation_info.is_file_download = true
        } else if (operation_info.member_seq === member_seq) {
          operation_info.is_video_download = true
          operation_info.is_file_download = true
        }
      }
    }
    return operation_list
  }

  checkOperationStatus = async (operation_info) => {
    const operation_seq = operation_info.seq
    const prev_encoding_info = operation_info.encoding_info
    const prev_next = prev_encoding_info ? prev_encoding_info.next : null
    let encoding_info = {
      is_error: false,
      message: null,
      is_trans_success: false,
      is_trans_coding_error: false,
      video_file_list: [],
      next: null,
    }
    let analysis_status = operation_info.analysis_status
    if (operation_info.status !== 'Y') {
      encoding_info.message = '이미 삭제된 수술입니다.'
      if (operation_info.status === 'T') {
        encoding_info.message = '휴지통에서 복구 후 작업 가능합니다.'
      }
    }
    else if (analysis_status === 'Y') {
      encoding_info.message = '이미 작업이 완료되었습니다.'
    }
    else if (analysis_status === 'M') {
      encoding_info.message = '작업 완료 후 파일을 클라우드 스토리지로 이동하는 중입니다.'
      encoding_info.next = Constants.ENCODING_PROCESS_FILE_MOVE
    }
    else if (analysis_status === 'T') {
      encoding_info.message = '인코딩 완료 후 추가 작업 중 입니다.'
      encoding_info.next = Constants.ENCODING_PROCESS_TRANSCODING_COMPLETE
    }
    else if (operation_info.mode === this.MODE_OPERATION) {
      if (!prev_next || prev_next === Constants.ENCODING_PROCESS_REQUEST_TRANSCODING) {
        await this.checkOperationFileStatus(operation_info, encoding_info, true)
      } else if (prev_encoding_info) {
        encoding_info = prev_encoding_info
      } else if (analysis_status === 'R') {
        encoding_info.message = '동영상 인코딩 중입니다.'
        encoding_info.next = Constants.ENCODING_PROCESS_REQUEST_TRANSCODING
      } else {
        encoding_info.message = '파일을 업로드 하는 중입니다.'
        encoding_info.next = Constants.ENCODING_PROCESS_REQUEST_TRANSCODING
      }
    }
    else if (operation_info.mode === this.MODE_FILE) {
      if (prev_encoding_info) {
        encoding_info = prev_encoding_info
      } else {
        encoding_info.message = '파일을 업로드 하는 중입니다.'
        encoding_info.next = Constants.ENCODING_PROCESS_FILE_MOVE
      }
    }

    const operation_model = this.getOperationModel()
    await operation_model.updateAnalysisStatus(operation_seq, encoding_info.is_error ? 'E' : analysis_status, encoding_info)
    const result = new StdObject()
    result.add('encoding_info', encoding_info)
    return result
  }

  checkOperationFileStatus = async (operation_info, encoding_info = null, check_trans_file = false, delete_non_origin_files = false, delete_error_file_force = false) => {
    if (!encoding_info) {
      encoding_info = {
        is_error: false,
        message: null,
        is_trans_success: false,
        is_trans_coding_error: false,
        video_file_list: [],
        next: null,
      }
    }

    const directory_info = this.getOperationDirectoryInfo(operation_info)
    const origin_file_list = await Util.getDirectoryFileList(directory_info.origin)
    if (origin_file_list.length === 0) {
      encoding_info.message = '동영상 파일이 업로드 되지 않았습니다.'
      encoding_info.is_error = true
    } else {
      let prev_video_info = null
      const trans_file_regex = /^trans_([\w_-]+)\.mp4$/i
      const origin_file_regex = /^upload_.+$/i
      for (let i = 0; i < origin_file_list.length; i++) {
        const file_info = origin_file_list[i]
        if (file_info.isFile()) {
          const file_name = file_info.name
          const file_path = directory_info.origin + file_name
          const file_size = await Util.getFileSize(file_path)
          const media_info = await Util.getMediaInfo(file_path)
          const video_info = media_info.media_info
          const video_file_info = {
            origin_file_name: file_name,
            file_name,
            file_path,
            file_size,
            media_type: media_info.media_type,
            is_video: true
          }
          if (video_info) {
            video_file_info.width = video_info.width
            video_file_info.height = video_info.height
            video_file_info.format = video_info.format
            video_file_info.profile = video_info.profile
            video_file_info.level = video_info.level
            video_file_info.bitrate = video_info.bit_rate
          }
          if (trans_file_regex.test(file_name)) {
            if (delete_non_origin_files || delete_error_file_force) {
              await Util.deleteFile(file_path)
              continue
            }
            video_file_info.is_trans_video = true
            if (!check_trans_file) continue
            if (media_info.media_type !== Constants.VIDEO) {
              if (encoding_info.message === null) encoding_info.message = '인코딩이 진행중이거나 정상 완료되지 않았습니다.'
              encoding_info.next = Constants.ENCODING_PROCESS_REQUEST_TRANSCODING
              encoding_info.is_trans_coding_error = true
              video_file_info.is_video = false
            } else {
              if (encoding_info.message === null) encoding_info.message = '인코딩이 파일이 생성되었습니다. 추가 작업이 진행중일수도 있습니다.'
              encoding_info.is_trans_success = true
              encoding_info.next = Constants.ENCODING_PROCESS_TRANSCODING_COMPLETE
            }
          }
          else if (origin_file_regex.test(file_name)) {
            if (file_size === 0) {
              if (encoding_info.message === null) encoding_info.message = '동영상 파일의 크기가 0 입니다.'
              encoding_info.is_error = true
              video_file_info.is_video = false
              video_file_info.error = true
            }
            else {
              video_file_info.origin_file_name = file_name.replace(/^upload_/, '')
              if (media_info.media_type !== Constants.VIDEO) {
                if (encoding_info.message === null) encoding_info.message = '원본 파일 중 동영상 정보를 확인할 수 없는 파일이 존재합니다.'
                encoding_info.is_error = true
                video_file_info.is_video = false
                video_file_info.error = true
              } else {
                if (prev_video_info !== null) {
                  if (video_info.format !== prev_video_info.format) {
                    if (encoding_info.message === null) encoding_info.message = '동영상의 포멧이 일치하지 않습니다.'
                    encoding_info.is_error = true
                    video_file_info.error = true
                  } else if (video_info.width !== prev_video_info.width || video_info.height !== prev_video_info.height) {
                    if (encoding_info.message === null) encoding_info.message = '동영상의 가로 세로 크기가 일치하지 않습니다.'
                    encoding_info.is_error = true
                    video_file_info.error = true
                  } else if (video_info.profile !== prev_video_info.profile || video_info.level !== prev_video_info.level) {
                    if (encoding_info.message === null) encoding_info.message = '동영상의 프로파일이 일치하지 않습니다.'
                    encoding_info.is_error = true
                    video_file_info.error = true
                  }
                } else {
                  prev_video_info = media_info.media_info
                }
              }
            }
          } else if (delete_non_origin_files) {
            await Util.deleteFile(file_path)
            continue
          }

          if (delete_error_file_force && video_file_info.error === true) {
            encoding_info.message = null
            encoding_info.is_error = false
            await Util.deleteFile(file_path)
            continue
          }

          encoding_info.video_file_list.push(video_file_info)
        }
      }
    }
    if (!encoding_info.is_error && !encoding_info.next) {
      encoding_info.next = Constants.ENCODING_PROCESS_REQUEST_TRANSCODING
    }
    return encoding_info
  }

  continueProcessForce = async (operation_info) => {
    if (!operation_info || !operation_info.encoding_info || !operation_info.encoding_info.next) {
      return new StdObject(2001, '진행상태 정보가 없어 재시작이 불가능 합니다.')
    }
    const encoding_info = operation_info.encoding_info
    const next = encoding_info.next
    if (next === Constants.ENCODING_PROCESS_REQUEST_TRANSCODING) {
      return this.requestTranscodingForce(operation_info)
    } else if (next === Constants.ENCODING_PROCESS_TRANSCODING_COMPLETE) {
      TranscoderSyncService.onTranscodingSuccess(operation_info, Util.getRandomId())
      return new StdObject(0, '인코딩 완료 후 처리가 시작되었습니다.')
    } else if (next === Constants.ENCODING_PROCESS_FILE_MOVE) {
      return await this.requestFileMoveForce(operation_info)
    }
    return new StdObject(2003, '다음 프로세스를 진행할 수 없습니다.', { next })
  }

  requestTranscodingForce = async (operation_info) => {
    await OperationService.requestTranscoder(operation_info)
    return new StdObject(0, '인코딩 시작 요청이 성공하였습니다.')
  }

  requestFileMoveForce = async (operation_info) => {
    let encoding_info
    if (operation_info.mode === OperationService.MODE_FILE) {
      encoding_info = await SyncService.moveImageFileToObject(operation_info)
    } else {
      encoding_info = await SyncService.moveTransFileToObject(operation_info)
    }
    if (encoding_info.is_error === true) {
      throw new StdObject(2004, encoding_info.message, { encoding_info })
    }
    return new StdObject(0, '파일이동 시작되었습니다.')
  }

  transcodingCompleteForce = async (operation_info) => {
    const operation_model = this.getOperationModel()
    const encoding_info = {
      is_error: false,
      message: null,
      is_trans_success: false,
      is_trans_coding_error: false,
      video_file_list: [],
      next: null,
    }
    const trans_file_regex = /^trans_([\w_-]+)\.mp4$/i
    const smil_file_regex = /^.+\.smil$/i
    let video_file_name = null
    let smil_file_name = null
    const directory_info = this.getOperationDirectoryInfo(operation_info)
    const origin_file_list = await Util.getDirectoryFileList(directory_info.origin)
    const log_prefix = `${this.log_prefix} [transcodingCompleteForce operation_seq: ${operation_info.seq}]`
    log.debug(log_prefix, 'path:', directory_info.origin, ', origin_file_list:', origin_file_list)
    for (let i = 0; i < origin_file_list.length; i++) {
      const file_info = origin_file_list[i]
      const file_name = file_info.name
      const is_trans_file = trans_file_regex.test(file_name)
      log.debug(log_prefix, 'index:', i, ', is_file:', file_info.isFile(), ', file_path:', directory_info.origin + file_name, ', is_trans_file:', is_trans_file)
      if (file_info.isFile()) {
        if (is_trans_file) {
          const file_path = directory_info.origin + file_name
          const file_size = await Util.getFileSize(file_path)
          const media_info = await Util.getMediaInfo(file_path)
          log.debug(log_prefix, i, 'file_path:', directory_info.origin + file_name, ', media_info:', media_info)
          if (file_size === 0 || media_info.media_type !== Constants.VIDEO) {
            encoding_info.is_error = true
            encoding_info.message = '인코딩 완료 된 파일이 정상적이 않습니다.'
            encoding_info.is_trans_success = false
            encoding_info.is_trans_coding_error = true
            encoding_info.next = Constants.ENCODING_PROCESS_REQUEST_TRANSCODING
            encoding_info.video_file_list.push({
              origin_file_name: file_name,
              file_name,
              file_path,
              file_size,
              media_type: media_info.media_type,
              is_video: false
            })
            video_file_name = file_name
            break
          }
          video_file_name = file_name
        }
        if (smil_file_regex.test(file_name)) smil_file_name = file_name
      }
    }
    if (!video_file_name) {
      encoding_info.is_error = true
      encoding_info.message = '인코딩된 파일이 존재하지 않습니다.'
      encoding_info.is_trans_success = false
      encoding_info.is_trans_coding_error = true
      encoding_info.next = Constants.ENCODING_PROCESS_REQUEST_TRANSCODING
    }
    if (encoding_info.is_error) {
      await operation_model.updateAnalysisStatus(operation_info.seq, 'E', encoding_info)
      throw new StdObject(2005, encoding_info.message, 200, { encoding_info })
    }
    TranscoderSyncService.updateTranscodingComplete(operation_info, Util.getRandomId(), video_file_name, smil_file_name, null)
    return new StdObject(0, '인코딩 완료 후 처리가 시작되었습니다.')
  }

  getOperationModeCountWithFolder = async () => {
    const operation_model = this.getOperationModel(DBMySQL)
    const video_counts = await operation_model.getOperationVideoCountWithFolder()
    const file_counts = await operation_model.getOperationFileCountWithFolder()
    return { video_counts, file_counts }
  }

  requestTranscodingList = async (request_body) => {
    const seq_list_text = Util.trim(request_body.seq_list)
    if (!seq_list_text) {
      throw new StdObject(2006, '잘못된 요청입니다.', 200)
    }
    const list_split_regex = /[^\d]+/i
    const seq_list = seq_list_text.split(list_split_regex)
    if (!seq_list || seq_list.length <= 0) {
      throw new StdObject(2007, '수술 번호 목록이 비었습니다.', 200)
    }
    this.requestTranscodingByOperationSeqList(seq_list)
    return new StdObject(0, `${seq_list.length}개의 수술 인코딩 요청이 시작되었습니다.`)
  }
  requestTranscodingByOperationSeqList = (operation_seq_list) => {
    (
      async (operation_seq_list) => {
        try {
          for (let i = 0; i < operation_seq_list.length; i++) {
            const operation_seq = Util.parseInt(operation_seq_list[i], 0)
            if (operation_seq <= 0) continue
            const { operation_info } = await this.getOperationInfoNoAuth(DBMySQL, operation_seq, true)
            if (operation_info && !operation_info.isEmpty()) {
              log.debug(this.log_prefix, '[requestTranscodingByOperationSeqList]', operation_info.seq, operation_info.mode, operation_info.status, operation_info.analysis_status)
              if (operation_info.mode !== this.MODE_OPERATION) {
                continue
              }
              if (operation_info.status === 'D' || (operation_info.analysis_status !== 'N' && operation_info.analysis_status !== 'R' && operation_info.analysis_status !== 'E')) {
                log.debug(this.log_prefix, '[requestTranscodingByOperationSeqList] - trans complete pass', operation_info.seq, operation_info.mode, operation_info.status, operation_info.analysis_status)
                continue
              }
              try {
                await this.requestTranscodingForce(operation_info)
              } catch (error) {
                log.error(this.log_prefix, '[requestTranscodingByOperationSeqList]', operation_info.seq, error);
              }
            }
          }
        } catch (error) {
          log.error(this.log_prefix, '[requestTranscodingByOperationSeqList]', operation_seq_list, error);
        }
      }
    )(operation_seq_list)
  }
}

const OperationService = new OperationServiceClass()

export default OperationService
