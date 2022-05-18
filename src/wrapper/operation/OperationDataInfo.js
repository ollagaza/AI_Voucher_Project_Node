import JsonWrapper from '../json-wrapper'
import Util from '../../utils/Util'
import ServiceConfig from '../../service/service-config'
import log from '../../libs/logger'

const default_key_list = [
  'seq', 'operation_seq', 'group_seq', 'group_name', 'hospital', 'title', 'view_count', 'total_time',
  'thumbnail', 'hashtag_list', 'category_list', 'doc_text', 'doc_html',
  'type', 'status', 'is_complete', 'mento_group_seq',
  'is_mento_complete', 'is_open_refer_file', 'is_open_video', 'video_download', 'file_download', 'template_grade',
  'reg_date', 'modify_date',
]

export default class OperationDataInfo extends JsonWrapper {
  constructor (data = null, private_keys = []) {
    super(data, private_keys)

    this.setKeys(default_key_list)

    if (data) {
      if (data.hashtag_list && typeof data.hashtag_list === 'string') {
        this.hashtag_list = JSON.parse(data.hashtag_list)
      }
      if (data.category_list && typeof data.category_list === 'string') {
        this.category_list = JSON.parse(data.category_list)
      }
      if (data.template_grade && typeof data.template_grade === 'string') {
        this.template_grade = JSON.parse(data.template_grade)
      }
      if (data.hashtag && typeof data.hashtag === 'string') {
        this.hashtag_list = Util.parseHashtag(data.hashtag)
      }
      this.is_complete = Util.isTrue(data.is_complete)
      this.is_open_refer_file = Util.isTrue(data.is_open_refer_file)
      this.is_open_video = Util.isTrue(data.is_open_video)
      this.video_download = Util.isTrue(data.video_download)
      this.file_download = Util.isTrue(data.file_download)
    }
  }

  setUrl = (prefix) => {
    if (this.thumbnail) {
      this.thumbnail = prefix + this.thumbnail
    }
  }
}
