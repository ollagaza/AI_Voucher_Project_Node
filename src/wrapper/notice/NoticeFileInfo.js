import JsonWrapper from '../json-wrapper'
import Util from '../../utils/Util'
import ServiceConfig from '../../service/service-config'

export default class NoticeFileInfo extends JsonWrapper {
  constructor (data = null, private_keys = []) {
    super(data, private_keys)
    this.setKeys([
      'seq', 'file_name', 'file_size', 'file_type', 'url', 'reg_date'
    ])
  }

  setUrl = () => {
    const static_url = ServiceConfig.get('static_storage_prefix')
    if (this.file_path) {
      this.url = static_url + this.file_path
    }

    return this
  }

  getByUploadFileInfo = async (notice_seq, upload_file_info, upload_root) => {
    this.setIgnoreEmpty(true)

    this.setKeys([
      'notice_seq', 'file_name', 'file_size', 'file_type', 'file_path'
    ])
    this.notice_seq = notice_seq
    this.file_name = upload_file_info.originalname
    this.file_size = upload_file_info.size
    this.file_path = upload_root + upload_file_info.new_file_name
    this.file_type = await Util.getFileType(upload_file_info.path, this.file_name)

    this.is_empty = false

    return this
  }
}
