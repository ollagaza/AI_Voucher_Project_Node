import JsonWrapper from '../json-wrapper'
import Util from '../../utils/Util'

export default class OperationInfo extends JsonWrapper {
  constructor (data = null, private_keys = []) {
    super(data, private_keys)

    this.setKeys([
      'seq', 'list_no', 'operation_type', 'operation_code', 'operation_name', 'operation_date', 'folder_seq', 'group_seq', 'member_seq', 'user_name'
      , 'patient_age', 'patient_sex', 'hour', 'minute', 'status', 'analysis_status', 'is_favorite'
      , 'reg_date', 'reg_diff_hour', 'media_info', 'content_id', 'progress', 'has_link', 'mode', 'export_from_project', 'encoding_info'
      , 'total_file_size', 'total_file_count', 'clip_count', 'index2_file_count', 'origin_video_count', 'trans_video_count', 'modify_date'
    ])

    if (data) {
      if (data._no) {
        this.list_no = data._no
      }
      if (data.is_favorite != null) {
        this.is_favorite = parseInt(data.is_favorite) > 0
      }
      if (data.created_by_user != null) {
        this.created_by_user = parseInt(data.created_by_user) > 0
      }
      if (data.is_analysis_complete != null) {
        this.is_analysis_complete = parseInt(data.is_analysis_complete) > 0
      }
      if (data.encoding_info && typeof data.encoding_info === 'string') this.encoding_info = JSON.parse(data.encoding_info)

      if (this.reg_date) {
        this.reg_diff_hour = Util.hourDifference(this.reg_date, 'Y-m-d')
        this.reg_date = Util.dateFormat(this.reg_date.getTime())
      }
      if (this.modify_date) {
        this.modify_date = Util.dateFormat(this.modify_date.getTime())
      }
    }
  }

  getByRequestBody = (body) => {
    this.setKeys([
      'operation_type', 'operation_code', 'operation_name', 'operation_date', 'folder_seq'
      , 'patient_age', 'patient_sex', 'hour', 'minute', 'media_path', 'mode', 'analysis_status'
    ])

    this.setIgnoreEmpty(true)

    if (body != null) {
      this.json_keys.forEach((key) => {
        if (!Util.isEmpty(body[key], true)) {
          this[key] = body[key]
        }
      })

      this.is_empty = false
    }

    return this
  }

  setMediaInfo = (media_info) => {
    this.media_info = media_info
  }
}
