import JsonWrapper from '../json-wrapper'
import Util from '../../utils/Util'
import ServiceConfig from "../../service/service-config";

const default_key_list = [
  'seq', 'list_no', 'operation_type', 'operation_code', 'operation_name', 'operation_date', 'folder_seq', 'group_seq', 'member_seq', 'user_name', 'user_nickname', 'user_id'
  , 'patient_age', 'patient_sex', 'hour', 'minute', 'status', 'analysis_status', 'is_favorite', 'mode', 'export_from_project', 'encoding_info'
  , 'reg_date', 'reg_diff_hour', 'media_info', 'content_id', 'progress', 'has_link'
  , 'total_file_size', 'total_file_count', 'clip_count', 'index2_file_count', 'origin_video_count', 'origin_video_size', 'origin_seq', 'trans_video_count', 'modify_date'
  , 'group_name', 'hospital', 'title', 'view_count', 'total_time', 'thumbnail', 'hashtag_list', 'category_list', 'doc_text', 'doc_html'
  , 'type', 'is_complete', 'mento_group_seq', 'is_mento_complete', 'is_open_refer_file', 'is_open_video'
  , 'is_delete_by_admin', 'delete_member_seq', 'delete_user_name', 'delete_user_nickname', 'is_video_download', 'is_file_download'
  , 'download_file_size', 'download_file_count', 'refer_file_size', 'refer_file_count', 'anno_count', 'comment_count'
]

export default class OperationInfoAndData extends JsonWrapper {
  constructor (data = null, private_keys = []) {
    super(data, private_keys)

    this.setKeys(default_key_list)

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

      if (data.hashtag_list && typeof data.hashtag_list === 'string') {
        this.hashtag_list = JSON.parse(data.hashtag_list)
      }
      if (data.category_list && typeof data.category_list === 'string') {
        this.category_list = JSON.parse(data.category_list)
      }
      // if (data.hashtag && typeof data.hashtag === 'string') {
      //   this.hashtag_list = Util.parseHashtag(data.hashtag)
      // }
      this.is_complete = Util.isTrue(data.is_complete)
      this.is_open_refer_file = Util.isTrue(data.is_open_refer_file)
      this.is_open_video = Util.isTrue(data.is_open_video)
      this.is_delete_by_admin = Util.isTrue(data.is_delete_by_admin)
      this.is_video_download = Util.isTrue(data.video_download)
      this.is_file_download = Util.isTrue(data.file_download)
      if (data.encoding_info && typeof data.encoding_info === 'string') this.encoding_info = JSON.parse(data.encoding_info)
      this.setUrl();

      if (this.reg_date) {
        this.reg_diff_hour = Util.hourDifference(this.reg_date, 'Y-m-d')
        this.reg_date = Util.dateFormat(this.reg_date.getTime())
      }
      if (this.modify_date) {
        this.modify_date = Util.dateFormat(this.modify_date.getTime())
      }
    }
  }

  setUrl = () => {
    if (this.thumbnail) {
      if (this.mode === 'file' && !ServiceConfig.isVacs()) {
        if (!this.thumbnail.startsWith('/static/')) {
          this.thumbnail = ServiceConfig.get('static_storage_prefix') + this.thumbnail
        }
      } else {
        this.thumbnail = ServiceConfig.get('static_storage_prefix') + this.thumbnail
      }
    }
  }

  setMediaInfo = (media_info) => {
    this.media_info = media_info
  }
}
