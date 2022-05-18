import JsonWrapper from '../../json-wrapper'
import ServiceConfig from '../../../service/service-config'

export default class OpenChannelBannerInfo extends JsonWrapper {
  constructor (data = null, private_keys = []) {
    super(data, private_keys)
    this.setKeys([
      'seq', 'url', 'link', 'text', 'order', 'reg_date', 'modify_date'
    ])
  }

  setUrl = () => {
    const static_url = ServiceConfig.get('static_storage_prefix')
    const cdn_url = ServiceConfig.get('cdn_url')
    if (ServiceConfig.isVacs()) {
      this.url = static_url + this.image_path
    } else {
      this.url = cdn_url + this.image_path
    }

    return this
  }

  getByUploadFileInfo = (group_seq, upload_file_info, media_path) => {
    this.setIgnoreEmpty(true)

    this.setKeys([
      'group_seq', 'image_path', 'link', 'text', 'order', 'reg_date', 'modify_date'
    ])

    if (upload_file_info) {
      this.group_seq = group_seq
      this.image_path = media_path + upload_file_info.new_file_name
      this.is_empty = false
    }

    return this
  }

  getQueryJson = () => {
    this.setKeys([
      'seq', 'group_seq', 'image_path', 'link', 'text', 'order', 'reg_date', 'modify_date'
    ])
    this.setIgnoreEmpty(true)
    return this.toJSON()
  }
}
