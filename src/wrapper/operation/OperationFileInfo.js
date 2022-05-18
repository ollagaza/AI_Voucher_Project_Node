import JsonWrapper from '../json-wrapper'
import ServiceConfig from '../../service/service-config'
import Util from '../../utils/Util'

export default class OperationFileInfo extends JsonWrapper {
  constructor (data = null, private_keys = []) {
    super(data, private_keys)
    this.setKeys([
      'seq', 'directory', 'file_name', 'file_size', 'file_type', 'width', 'height',
      'url', 'download_url', 'full_path', 'thumbnail_url', 'reg_date', 'type', 'rotation'
    ])
  }

  setUrl = () => {
    const cloud_url = ServiceConfig.get('static_cloud_prefix')
    const static_url = ServiceConfig.get('static_storage_prefix')
    const cdn_url = ServiceConfig.get('cdn_url')
    if (ServiceConfig.isVacs()) {
      this.url = static_url + this.file_path
      this.origin_url = static_url + this.file_path
      this.download_url = static_url + this.file_path
      this.thumbnail_url = static_url + this.thumbnail_path
      if (this.resize_path) {
        this.url = static_url + this.resize_path
      }
    } else {
      this.url = cdn_url + this.file_path
      this.origin_url = cdn_url + this.file_path
      this.download_url = cloud_url + this.file_path
      this.thumbnail_url = cdn_url + this.thumbnail_path
      if (this.resize_path) {
        this.url = cdn_url + this.resize_path
      }
    }
    if (this.directory) {
      this.full_path = this.directory + '/' + this.file_name
    } else {
      this.full_path = this.file_name
    }

    return this
  }

  getByUploadFileInfo = (operation_seq, upload_file_info, directory, media_path) => {
    this.setIgnoreEmpty(true)

    this.setKeys([
      'operation_seq', 'directory', 'file_name', 'file_path', 'file_size', 'thumbnail_path'
    ])

    this.operation_seq = operation_seq
    this.directory = Util.isNull(directory) ? null : directory
    if (upload_file_info) {
      this.file_name = upload_file_info.originalname
      this.file_path = media_path + upload_file_info.new_file_name
      this.file_size = upload_file_info.size
    }

    this.is_empty = false

    return this
  }
}
