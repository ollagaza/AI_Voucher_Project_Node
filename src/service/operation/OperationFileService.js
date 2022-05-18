import path from 'path'
import ServiceConfig from '../../service/service-config'
import Util from '../../utils/Util'
import DBMySQL from '../../database/knex-mysql'
import log from '../../libs/logger'
import OperationService from '../../service/operation/OperationService'
import CloudFileService from '../../service/cloud/CloudFileService'
import ReferFileModel from '../../database/mysql/file/ReferFileModel'
import VideoFileModel from '../../database/mysql/file/VideoFileModel'
import OperationFileModel from '../../database/mysql/operation/OperationFileModel'
import FileInfo from '../../wrapper/file/FileInfo'
import OperationFileInfo from '../../wrapper/operation/OperationFileInfo'
import Constants from '../../constants/constants'
import StdObject from '../../wrapper/std-object'
import _ from 'lodash'
import NaverObjectStorageService from '../storage/naver-object-storage-service'
// import GroupAlarmService from '../group/GroupAlarmService'

const OperationFileServiceClass = class {
  constructor () {
    this.log_prefix = '[OperationFileService]'
    this.TYPE_VIDEO = 'video'
    this.TYPE_REFER = 'refer'
    this.TYPE_FILE = 'file'
    this.TYPE_ALL = 'all'
    this.DEFAULT_WIDTH = 1920
    this.DEFAULT_HEIGHT = 1080
    this.MAX_DIMENSION = this.DEFAULT_WIDTH * this.DEFAULT_HEIGHT
  }

  getReferFileModel = (database = null) => {
    if (database) {
      return new ReferFileModel(database)
    }
    return new ReferFileModel(DBMySQL)
  }

  getVideoFileModel = (database = null) => {
    if (database) {
      return new VideoFileModel(database)
    }
    return new VideoFileModel(DBMySQL)
  }

  getOperationFileModel = (database = null) => {
    if (database) {
      return new OperationFileModel(database)
    }
    return new OperationFileModel(DBMySQL)
  }

  getFileList = async (database, operation_info, file_type = this.TYPE_REFER, request_query = null) => {
    const result = {}
    if (file_type === this.TYPE_ALL || file_type === this.TYPE_REFER) {
      result.refer_file_list = await this.getReferFileList(database, operation_info.storage_seq)
    }
    if (file_type === this.TYPE_ALL || file_type === this.TYPE_VIDEO) {
      result.video_file_list = await this.getVideoFileList(database, operation_info.storage_seq)
    }
    if (file_type === this.TYPE_ALL || file_type === this.TYPE_FILE) {
      result.operation_file_list = await this.getOperationFileList(database, operation_info.seq, true, request_query)
    }
    return result;
  }

  getReferFileList = async (database, storage_seq, wrap_result = true) => {
    const refer_file_model = this.getReferFileModel(database)
    const result_list = await refer_file_model.getReferFileList(storage_seq)
    return wrap_result ? this.getFileInfoList(result_list) : result_list
  }

  getVideoFileList = async (database, storage_seq) => {
    const video_file_model = this.getVideoFileModel(database)
    const result_list = await video_file_model.getVideoFileList(storage_seq)
    return this.getFileInfoList(result_list)
  }

  getOperationFileList = async (database, operation_seq, wrap_result = true, request_query = null) => {
    let last_seq = null
    let limit = 0
    if (request_query) {
      last_seq = Util.parseInt(request_query.last_seq, null)
      limit = Util.parseInt(request_query.limit, 0)
    }
    const operation_file_model = this.getOperationFileModel(database)
    const result_list = await operation_file_model.getOperationFileList(operation_seq, last_seq, limit)
    if (!wrap_result) {
      return result_list
    }
    const file_list = []
    if (result_list) {
      for (let i = 0; i < result_list.length; i++) {
        file_list.push(new OperationFileInfo(result_list[i]).setUrl())
      }
    }
    return file_list
  }

  getFileInfoList = (result_list) => {
    const file_list = []
    if (result_list) {
      for (let i = 0; i < result_list.length; i++) {
        file_list.push(new FileInfo(result_list[i]).setUrl())
      }
    }
    return file_list
  }

  createReferFileInfo = async (database, operation_info, upload_file_info) => {
    const directory_info = OperationService.getOperationDirectoryInfo(operation_info)
    const refer_file_model = this.getReferFileModel(database)

    const file_info = (await new FileInfo().getByUploadFileInfo(upload_file_info, directory_info.media_refer)).toJSON()
    file_info.storage_seq = operation_info.storage_seq
    file_info.is_moved = false

    return await refer_file_model.createReferFile(file_info)
  }

  copyReferFileInfo = async (database, storage_seq, refer_list, operation_info) => {
    const refer_file_model = this.getReferFileModel(database)

    for (let cnt = 0; cnt < refer_list.length; cnt++) {
      const refer_file = refer_list[cnt]

      delete refer_file.seq
      delete refer_file.url
      refer_file.storage_seq = storage_seq

      if (refer_file.file_path) {
        refer_file.file_path = refer_file.file_path.replace(operation_info.origin_media_path, operation_info.media_path)
      }
      await refer_file_model.createReferData(refer_file)
    }
  }

  copyOperationFileInfo = async (database, operation_seq, operation_file_list) => {
    const operation_file_model = this.getOperationFileModel(database)

    for (let cnt = 0; cnt < operation_file_list.length; cnt++) {
      const operation_file = operation_file_list[cnt]

      delete operation_file.seq
      delete operation_file.reg_date
      operation_file.operation_seq = operation_seq
      await operation_file_model.createOperationFile(operation_file)
    }
  }

  createVideoFileInfo = async (database, operation_info, upload_file_info, create_thumbnail = false) => {
    const directory_info = OperationService.getOperationDirectoryInfo(operation_info)
    const media_info = await Util.getMediaInfo(upload_file_info.path)
    if (media_info.media_type !== Constants.VIDEO) {
      throw new StdObject(1000, '동영상 파일만 업로드 가능합니다.', 400, media_info)
    }

    let thumbnail_path = null
    if (create_thumbnail) {
      const thumbnail_info = await OperationService.createOperationVideoThumbnail(upload_file_info.path, operation_info, 0, media_info.media_info)
      thumbnail_path = thumbnail_info.path
    }

    const file_info = (await new FileInfo().getByUploadFileInfo(upload_file_info, directory_info.media_origin)).toJSON()
    file_info.storage_seq = operation_info.storage_seq
    file_info.thumbnail = thumbnail_path

    const video_file_model = this.getVideoFileModel(database)
    return video_file_model.createVideoFile(file_info)
  }

  createOperationFileInfo = async (database, operation_info, upload_file_info, request_body) => {
    const directory_info = OperationService.getOperationDirectoryInfo(operation_info)
    const file_info = new OperationFileInfo().getByUploadFileInfo(operation_info.seq, upload_file_info, request_body.directory, directory_info.media_file).toJSON()
    if (!file_info.file_name) {
      throw new StdObject(-1, '파일을 업로드에 실패하였습니다.', 400, file_info)
    }
    const media_info = await Util.getMediaInfo(upload_file_info.path)
    if (!media_info || !media_info.media_info.width || !media_info.media_info.height) return false
    if (media_info.media_type === Constants.IMAGE) {
      file_info.width = media_info.media_info.width
      file_info.height = media_info.media_info.height
      const is_rotate = await Util.isImageRotate(upload_file_info.path)
      if (is_rotate) {
        file_info.width = media_info.media_info.height
        file_info.height = media_info.media_info.width
      }

      const upload_file_path = path.parse(upload_file_info.path)
      const image_ext = `${upload_file_path.ext}`.toLowerCase()
      const ext = image_ext === '.png' ? '.png' : '.jpg'
      const image_dimension = file_info.width * file_info.height
      if ((image_ext !== '.png' && image_ext !== '.jpg') || image_dimension > this.MAX_DIMENSION) {
        let resize_ratio = 1
        if (image_dimension > this.MAX_DIMENSION) {
          let w_ratio, h_ratio, width, height
          width = media_info.media_info.width
          height = media_info.media_info.height
          w_ratio = width / this.DEFAULT_WIDTH
          h_ratio = height / this.DEFAULT_HEIGHT
          if (height > width) {
            w_ratio = width / this.DEFAULT_HEIGHT
            h_ratio = height / this.DEFAULT_WIDTH
          }
          resize_ratio = Math.max(w_ratio, h_ratio)
        }

        let resize_width, resize_height
        if (is_rotate) {
          resize_width = media_info.media_info.height / resize_ratio
          resize_height = media_info.media_info.width / resize_ratio
        } else {
          resize_width = media_info.media_info.width / resize_ratio
          resize_height = media_info.media_info.height / resize_ratio
        }
        const resize_image_name = `${upload_file_path.name}_resize${ext}`
        const resize_image_path = `${upload_file_path.dir}/${resize_image_name}`
        const resize_result = await Util.resizeImage(upload_file_info.path, resize_image_path, resize_width, resize_height, media_info, is_rotate)
        if (resize_result.success && (await Util.fileExists(resize_image_path))) {
          file_info.resize_path = directory_info.media_file + resize_image_name
          file_info.width = resize_width
          file_info.height = resize_height
        }
      }

      const thumb_width = Util.parseInt(ServiceConfig.get('thumb_width'), 212)
      const thumb_height = Util.parseInt(ServiceConfig.get('thumb_height'), 160)
      const thumb_file_name = `${upload_file_path.name}_thumb${ext}`
      const thumbnail_image_path = `${upload_file_path.dir}/${thumb_file_name}`
      const thumbnail_result = await Util.getThumbnail(upload_file_info.path, thumbnail_image_path, -1, thumb_width, thumb_height, media_info, is_rotate)

      if (thumbnail_result.success && (await Util.fileExists(thumbnail_image_path))) {
        file_info.thumbnail_path = directory_info.media_file + thumb_file_name
      }
      file_info.file_type = media_info.media_type
    } else {
      return false
    }

    const operation_file_model = this.getOperationFileModel(database)
    return await operation_file_model.createOperationFile(file_info)
  }

  uploadOperationChartPDF = async (database, request, response, operation_info, group_member_info, member_info, upload_id) => {
    const operation_seq = operation_info.seq
    const directory_info = OperationService.getOperationDirectoryInfo(operation_info)
    const file_id = Util.getRandomId()
    const pdf_directory = ServiceConfig.isVacs() ? `${directory_info.file}${file_id}/` : `${directory_info.temp}${file_id}/`
    await Util.createDirectory(pdf_directory)
    await Util.uploadByRequest(request, response, 'target', pdf_directory, null, null, true)
    const upload_file_info = request.file
    if (Util.isEmpty(upload_file_info)) {
      log.error(this.log_prefix, '[createOperationFileInfoByPDF]', `operation_seq: ${operation_seq}`, mime_type, upload_file_info)
      throw new StdObject(3001, '파일 업로드가 실패하였습니다.', 500)
    }
    const mime_type = await Util.getMimeType(upload_file_info.path, upload_file_info.originalname)
    if (mime_type !== 'pdf') {
      await Util.deleteDirectory(pdf_directory)
      log.error(this.log_prefix, '[createOperationFileInfoByPDF]', `operation_seq: ${operation_seq}`, '지원하지 않는 파일 형식입니다.', mime_type, upload_file_info)
      throw new StdObject(3002, '지원하지 않는 파일 형식입니다.', 400)
    }
    this.convertChartPDFToImage(operation_info, group_member_info, member_info, file_id, pdf_directory, upload_file_info.originalname, upload_file_info.path, upload_id)
  }

  convertChartPDFToImage = (operation_info, group_member_info, member_info, file_id, pdf_directory, pdf_file_name, pdf_file_path, upload_id) => {
    const operation_seq = operation_info.seq;
    (
      async () => {
        try {
          const directory_info = OperationService.getOperationDirectoryInfo(operation_info)
          const media_path = `${directory_info.media_file}${file_id}/`;

          const directory = `/${pdf_file_name}`
          const type = 'type_chart'
          const convert_pdf_result = await Util.pdfToImage(pdf_file_path, pdf_directory)
          if (convert_pdf_result && convert_pdf_result.success !== true) {
            await Util.deleteDirectory(pdf_directory)
            log.error(this.log_prefix, '[operationChartPDFToImage]', `operation_seq: ${operation_seq}`, 'PDF파일을 변환할 수 없습니다.', convert_pdf_result)
            throw new StdObject(3012, 'PDF파일을 변환할 수 없습니다.', 400)
          }

          const total_count = convert_pdf_result.file_list.length
          log.debug(this.log_prefix, '[operationChartPDFToImage]', 'convert complete. file list count:', total_count)
          const pad = `${total_count}`.length
          let file_info_list = []
          let batch_size = 100
          let insert_count = 0
          const operation_file_model = this.getOperationFileModel(DBMySQL)
          for (let i = 0; i < total_count; i++) {
            const pdf_data = convert_pdf_result.file_list[i]
            const jpg_file_name = path.parse(pdf_data.file_name).name
            const jpg_file_path = `${pdf_directory}/${pdf_data.file_name}`

            const file_info = new OperationFileInfo().getByUploadFileInfo(operation_info.seq, null, directory, media_path).toJSON()
            file_info.file_name = `Page ${_.padStart(i + 1, pad, '0')}`
            file_info.file_path = `${media_path}${pdf_data.file_name}`
            file_info.file_size = pdf_data.file_size
            file_info.width = pdf_data.width
            file_info.height = pdf_data.height
            file_info.file_type = 'pdf'
            file_info.type = type

            const image_dimension = pdf_data.width * pdf_data.height
            if (image_dimension > this.MAX_DIMENSION) {
              let resize_ratio = 1
              if (image_dimension > this.MAX_DIMENSION) {
                let w_ratio, h_ratio, width, height
                width = pdf_data.width
                height = pdf_data.height
                w_ratio = width / this.DEFAULT_WIDTH
                h_ratio = height / this.DEFAULT_HEIGHT
                if (height > width) {
                  w_ratio = width / this.DEFAULT_HEIGHT
                  h_ratio = height / this.DEFAULT_WIDTH
                }
                resize_ratio = Math.max(w_ratio, h_ratio)
              }

              const resize_width = pdf_data.width / resize_ratio
              const resize_height = pdf_data.height / resize_ratio
              const resize_image_name = `${jpg_file_name}_resize.png`
              const resize_image_path = `${pdf_directory}/${resize_image_name}`
              const resize_result = await Util.resizeImage(jpg_file_path, resize_image_path, resize_width, resize_height, pdf_data)
              if (resize_result.success && (await Util.fileExists(resize_image_path))) {
                file_info.resize_path = media_path + resize_image_name
                file_info.width = resize_width
                file_info.height = resize_height
              }
            }

            const thumb_width = Util.parseInt(ServiceConfig.get('thumb_width'), 212)
            const thumb_height = Util.parseInt(ServiceConfig.get('thumb_height'), 160)
            const thumb_file_name = `${jpg_file_name}_thumb.jpg`
            const thumbnail_image_path = `${pdf_directory}/${thumb_file_name}`
            const thumbnail_result = await Util.getThumbnail(jpg_file_path, thumbnail_image_path, -1, thumb_width, thumb_height, pdf_data, false)
            if (thumbnail_result.success && (await Util.fileExists(thumbnail_image_path))) {
              file_info.thumbnail_path = media_path + thumb_file_name
            }

            file_info_list.push(file_info)

            if (file_info_list.length >= batch_size) {
              await operation_file_model.createOperationFileBatch(file_info_list)
              insert_count += file_info_list.length
              file_info_list = []
              log.debug(this.log_prefix, '[operationChartPDFToImage]', `operation_seq: ${operation_seq}`, 'insert part complete:', insert_count, '/', total_count)
            }
          }
          if (file_info_list.length > 0) {
            await operation_file_model.createOperationFileBatch(file_info_list)
            insert_count += file_info_list.length
            log.debug(this.log_prefix, '[operationChartPDFToImage]', `operation_seq: ${operation_seq}`, 'insert part complete:', insert_count, '/', total_count)
          }
          log.debug(this.log_prefix, '[operationChartPDFToImage]', `operation_seq: ${operation_seq}`, 'insert complete', total_count)
          if (insert_count > 0) {
            if (!ServiceConfig.isVacs()) {
              await NaverObjectStorageService.moveFolder(pdf_directory, media_path)
              log.debug(this.log_prefix, '[operationChartPDFToImage]', `operation_seq: ${operation_seq}`, 'file move complete', total_count)
            }
            await OperationService.updateStorageSize(operation_info)

            const alarm_data = {
              operation_seq: operation_info.seq,
              member_seq: member_info.seq
            }
            const alarm_message = `'{name}'님이 '${operation_info.operation_name}'수술에 ${pdf_file_name} 차트를 등록했습니다.`

            const name = group_member_info.member_name_used ? member_info.user_name : member_info.user_nickname
            const socket_message = {
              title: `'${name}'님이 '${operation_info.operation_name}'수술에 ${pdf_file_name} 차트를 등록했습니다.`
            }
            const socket_data = {
              operation_seq: operation_info.seq,
              upload_id
            }
            // GroupAlarmService.createOperationGroupAlarm(operation_info.group_seq, GroupAlarmService.ALARM_TYPE_OPERTION_CHART, alarm_message, operation_info, member_info, alarm_data, socket_message, socket_data, true)
          }
        } catch (error) {
          log.error(this.log_prefix, '[operationChartPDFToImage]', `operation_seq: ${operation_seq}`, '알수없는 오류.', error)
        }
      }
    )()
  }

  deleteFileList = async (database, operation_info, file_seq_list, file_type = this.TYPE_REFER) => {
    let refer_delete_result = false
    let video_delete_result = false
    if (file_type === this.TYPE_REFER) {
      refer_delete_result = await this.deleteReferFileList(database, operation_info, file_seq_list)
    }
    if (file_type === this.TYPE_VIDEO) {
      video_delete_result = await this.deleteVideoFileList(database, operation_info, file_seq_list)
    }
    if (file_type === this.TYPE_FILE) {
      video_delete_result = await this.deleteOperationFileList(database, operation_info, file_seq_list)
    }

    return {
      refer_delete_result,
      video_delete_result
    }
  }

  deleteReferFileList = async (database, operation_info, file_seq_list) => {
    const refer_file_model = this.getReferFileModel(database)
    const delete_file_list = await refer_file_model.deleteSelectedFiles(file_seq_list)
    if (!delete_file_list) {
      return false
    }
    const directory_info = OperationService.getOperationDirectoryInfo(operation_info)
    const file_base_path = directory_info.media_refer;
    this.deleteFiles(file_base_path, delete_file_list)

    return true
  }

  deleteVideoFileList = async (database, operation_info, file_seq_list) => {
    const video_file_model = this.getVideoFileModel(database)
    const delete_file_list = await video_file_model.deleteSelectedFiles(file_seq_list)

    if (!delete_file_list) {
      return false
    }
    const directory_info = OperationService.getOperationDirectoryInfo(operation_info)
    const file_base_path = directory_info.media_video;
    this.deleteFiles(file_base_path, delete_file_list)

    return true
  }

  deleteOperationFileByOperationSeq = async (database, operation_seq) => {
    const operation_file_model = this.getOperationFileModel(database)
    return operation_file_model.deleteFileByOperationSeq(operation_seq)
  }

  deleteOperationFileList = async (database, operation_info, request_body) => {
    const operation_file_model = this.getOperationFileModel(database)
    const operation_seq = operation_info.seq
    log.debug(this.log_prefix, '[deleteOperationFileList]', request_body)
    if (request_body.is_folder) {
      await operation_file_model.deleteFolder(operation_seq, request_body.directory)
    } else if (request_body.is_file) {
      await operation_file_model.deleteFile(operation_seq, request_body.file_seq)
    } else if (request_body.file_seq_list) {
      await operation_file_model.deleteSelectedFiles(operation_seq, request_body.file_seq_list)
    } else {
      return false
    }

    return true
  }

  deleteFiles = (file_base_path, file_info_list) => {
    if (!file_info_list) return;
    (
      async () => {
        try {
          const media_root = ServiceConfig.getMediaRoot()
          const cloud_file_list = []
          for (let i = 0; i < file_info_list.length; i++) {
            const file_info = file_info_list[i]
            const file_name = Util.getFileName(file_info.file_path)
            const target_path = media_root + file_info.file_path
            await Util.deleteFile(target_path)
            cloud_file_list.push({ 'origin_file_name': file_name })
          }
          if (ServiceConfig.isVacs() === false) {
            await CloudFileService.requestDeleteObjectFileList(file_base_path, cloud_file_list, false)
          }
        } catch (e) {
          log.error(this.log_prefix, '[deleteFiles]', file_base_path, file_info_list, e)
        }
      }
    )()
  }

  changeOperationFileName = async (operation_info, request_body) => {
    const operation_file_model = this.getOperationFileModel()
    const operation_seq = operation_info.seq
    if (!request_body) {
      throw new StdObject(-1, '잘못된 요청입니다.', 400)
    }
    if (request_body.is_file) {
      await operation_file_model.changeFileName(operation_seq, request_body.file_seq, request_body.new_file_name)
    } else if (request_body.is_folder) {
      await operation_file_model.changeFolderName(operation_seq, request_body.directory, request_body.new_file_name)
    } else {
      throw new StdObject(-2, '잘못된 요청입니다.', 400)
    }
  }

  isValidOperationFileName = async (operation_info, request_body) => {
    const operation_file_model = this.getOperationFileModel()
    const operation_seq = operation_info.seq
    if (!request_body) {
      return false
    }
    if (request_body.is_file) {
      return operation_file_model.isValidFileName(operation_seq, request_body.file_seq, request_body.directory, request_body.new_file_name)
    } else if (request_body.is_folder) {
      return operation_file_model.isValidFolderName(operation_seq, request_body.new_file_name)
    }
    return false;
  }

  changeOperationFilesType = async (operation_info, request_body) => {
    if (!request_body || !request_body.data || !operation_info || operation_info.isEmpty() ) {
      return false
    }
    const type = request_body.type ? request_body.type : null
    return this.updateFilesInfoByRequest(operation_info, request_body, { type })
  }

  changeOperationFilesRotation = async (operation_info, request_body) => {
    if (!request_body || !request_body.data || !operation_info || operation_info.isEmpty() ) {
      return false
    }
    const rotation = request_body.rotation
    return this.updateFilesInfoByRequest(operation_info, request_body, { rotation })
  }
  updateFilesInfoByRequest = async (operation_info, request_body, update_data) => {
    const operation_seq = operation_info.seq
    const directory_list = request_body.data.directory_list
    const file_seq_list = request_body.data.file_seq_list
    const current_type = request_body.current_type ? request_body.current_type : null

    if (directory_list || file_seq_list) {
      await DBMySQL.transaction(async (transaction) => {
        const operation_file_model = this.getOperationFileModel(transaction)
        if (directory_list && directory_list.length > 0) {
          for (let i = 0; i < directory_list.length; i++) {
            await operation_file_model.changeFilesInfoByDirectory(operation_seq, update_data, directory_list[i], current_type)
          }
        }
        if (file_seq_list && file_seq_list.length > 0) {
          await operation_file_model.changeFilesInfoByFileSeqList(operation_seq, update_data, file_seq_list)
        }
      })
      return true
    }
    return false;
  }
}

const operation_file_service = new OperationFileServiceClass()
export default operation_file_service
