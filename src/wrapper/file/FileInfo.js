import JsonWrapper from '../json-wrapper'
import Util from '../../utils/Util'
import ServiceConfig from '../../service/service-config'

export default class FileInfo extends JsonWrapper {
  constructor (data = null, private_keys = []) {
    super(data, private_keys)
    this.setKeys([
      'seq', 'storage_seq', 'file_name', 'file_size', 'file_type', 'url', 'thumbnail_url'
    ])
  }

  setUrl = () => {
    const cloud_url = ServiceConfig.get('static_cloud_prefix')
    const static_url = ServiceConfig.get('static_storage_prefix')
    if (this.file_path) {
      if (!ServiceConfig.isVacs() && this.is_moved) {
        this.url = cloud_url + this.file_path
      } else {
        this.url = static_url + this.file_path
      }
      this.download_url = ServiceConfig.get('service_url') + this.url
    }
    if (this.thumbnail) {
      this.thumbnail_url = static_url + this.thumbnail
    }

    return this
  }

  getByUploadFileInfo = async (upload_file_info, media_path) => {
    this.setIgnoreEmpty(true)

    this.setKeys([
      'file_name', 'file_size', 'file_type', 'file_path', 'is_moved'
    ])

    this.file_name = upload_file_info.originalname
    this.file_size = upload_file_info.size
    this.file_path = media_path + upload_file_info.new_file_name
    this.file_type = await Util.getFileType(upload_file_info.path, this.file_name)
    if (upload_file_info.is_moved) {
      this.is_moved = 1
    }

    this.is_empty = false

    return this
  }

  getByFilePath = async (absolute_file_path, media_path, file_name) => {
    this.setIgnoreEmpty(true)

    this.setKeys([
      'file_name', 'file_size', 'file_type', 'file_path'
    ])

    const file_size = await Util.getFileSize(absolute_file_path)

    this.full_path = absolute_file_path
    this.file_name = file_name
    this.file_size = file_size
    this.file_path = media_path + '/' + this.file_name

    this.file_type = await Util.getFileType(absolute_file_path, file_name)

    this.is_empty = false

    return this
  }
}
