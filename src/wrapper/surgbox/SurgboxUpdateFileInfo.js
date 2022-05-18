import JsonWrapper from '../json-wrapper'
import Util from '../../utils/Util'
import ServiceConfig from '../../service/service-config'

export default class SurgboxUpdateFileInfo extends JsonWrapper {
  constructor (data = null, private_keys = []) {
    super(data, private_keys)
    this.setKeys([
      'seq', 'file_name', 'file_size', 'url', 'reg_date'
    ])
  }

  getByUploadFileInfo = (surgbox_update_seq, upload_file_info) => {
    this.setIgnoreEmpty(true)

    this.setKeys([
      'surgbox_update_seq', 'file_name', 'file_size', 'file_path'
    ])
    this.surgbox_update_seq = surgbox_update_seq
    this.file_name = upload_file_info.originalname
    this.file_size = upload_file_info.size

    this.is_empty = false

    return this
  }
}
