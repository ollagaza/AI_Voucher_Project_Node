import Util from '../../utils/Util'
import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql'
import log from '../../libs/logger'
import SyncService from './SyncService'
import OperationService from '../operation/OperationService'
import OperationMediaService from '../operation/OperationMediaService'
import ServiceErrorModel from '../../database/mysql/service-error-model'
import Constants from '../../constants/constants'

const TranscoderSyncServiceClass = class {
  constructor () {
    this.log_prefix = '[TranscoderSyncService]'
  }

  getOperationInfoByContentId = async (database, content_id) => {
    return await OperationService.getOperationInfoByContentId(database, content_id)
  }

  onTranscodingComplete = async (content_id, log_id, video_file_name, smil_file_name, request) => {
    if (Util.isEmpty(content_id) || Util.isEmpty(video_file_name) || Util.isEmpty(smil_file_name)) {
      throw new StdObject(801, '잘못된 파라미터', 400, { log_id, content_id, video_file_name, smil_file_name })
    }

    const { operation_info } = await this.getOperationInfoByContentId(DBMySQL, content_id)
    if (!operation_info || operation_info.isEmpty()) {
      throw new StdObject(802, '등록된 컨텐츠가 없습니다.', 400, { log_id, content_id, video_file_name, smil_file_name })
    }
    this.updateTranscodingComplete(operation_info, log_id, video_file_name, smil_file_name, request)
  }

  updateTranscodingComplete = (operation_info, log_id, video_file_name, smil_file_name, request) => {
    (
      async (operation_info, video_file_name, smil_file_name, request) => {
        log.debug(this.log_prefix, '[onTranscodingComplete]', log_id, operation_info.seq, operation_info.content_id, video_file_name)
        try {
          await OperationMediaService.updateTranscodingComplete(DBMySQL, log_id, operation_info, video_file_name, smil_file_name)
          await OperationService.updateAnalysisStatus(DBMySQL, operation_info, 'T')
          this.onTranscodingSuccess(operation_info, log_id)
        } catch (error) {
          log.error(this.log_prefix, '[onTranscodingComplete]', log_id, error)
          let error_str = null
          if (error.toJSON) {
            error_str = JSON.stringify(error.toJSON())
          } else if (error.stack) {
            error_str = JSON.stringify(error.stack)
          } else if (error.message) {
            error_str = error.message
          } else {
            error_str = error.toString()
          }
          await this.onTranscodingError(operation_info.content_id, error_str, request)
        }

      }
    )(operation_info, video_file_name, smil_file_name, request)
  }

  onTranscodingSuccess = (operation_info, log_id) => {
    (
      async () => {
        try {
          await SyncService.onAnalysisComplete(operation_info, log_id)
        } catch (error) {
          const encoding_info = {
            is_error: true,
            message: '동영상 인코딩 완료 후 처리가 정상적으로 완료되지 않았습니다.',
            is_trans_success: true,
            video_file_list: [],
            next: Constants.ENCODING_PROCESS_TRANSCODING_COMPLETE,
            error
          }
          await OperationService.updateAnalysisStatus(DBMySQL, operation_info, 'E', encoding_info)
        }
      }
    )()
  }

  onTranscodingError = async (content_id, log_id, message, request) => {
    if (Util.isEmpty(content_id)) {
      throw new StdObject(803, '잘못된 파라미터', 400, { log_id })
    }
    message = `[${log_id}] ${message}`
    const { operation_info } = await this.getOperationInfoByContentId(DBMySQL, content_id)
    const service_error_model = new ServiceErrorModel(DBMySQL)
    if (operation_info.isEmpty()) {
      await service_error_model.createServiceError('trans', null, content_id, message, request)
    } else {
      const encoding_info = {
        is_error: true,
        message: '동영상 인코딩이 정상적으로 완료되지 않았습니다.',
        is_trans_success: false,
        is_trans_coding_error: true,
        video_file_list: [],
        next: Constants.ENCODING_PROCESS_REQUEST_TRANSCODING,
        error: message
      }
      await OperationService.updateAnalysisStatus(DBMySQL, operation_info, 'E', encoding_info)
      await service_error_model.createServiceError('trans', operation_info.seq, content_id, message, request)
    }
  }
}

const transcoder_sync_service = new TranscoderSyncServiceClass()
export default transcoder_sync_service
