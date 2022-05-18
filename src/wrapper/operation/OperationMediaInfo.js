import JsonWrapper from '../json-wrapper'
import Util from '../../utils/Util'
import ServiceConfig from '../../service/service-config'
import OperationService from '../../service/operation/OperationService'
import logger from '../../libs/logger'

export default class OperationMediaInfo extends JsonWrapper {
  constructor (data = null, private_keys = []) {
    super(data, private_keys)

    this.setKeys([
      'video_file_name', 'fps', 'width', 'height', 'total_frame', 'total_time',
      'video_name', ' is_trans_complete',
      'hls_streaming_url', 'dash_streaming_url', 'proxy_max_height', 'streaming_url', 'thumbnail_url'
    ])

    this.is_trans_complete = false
    if (data) {
      this.is_trans_complete = parseInt(data.is_trans_complete) > 0
    }
  }

  setUrl = (operation_info, start_time = null, end_time = null) => {
    if (this.is_trans_complete) {
      // const url_prefix = operation_info.url_prefix;
      const directory_info = OperationService.getOperationDirectoryInfo(operation_info)
      const proxy_file_name = Util.isEmpty(this.proxy_file_name) ? this.video_file_name : this.proxy_file_name

      this.video_name = directory_info.content_video + this.video_file_name
      this.thumbnail_url = ServiceConfig.get('static_storage_prefix') + this.thumbnail

      const media_video = operation_info.origin_seq ? directory_info.media_video_origin : directory_info.media_video
      // logger.debug('[OperationMediaInfo]', 'media_video', media_video, directory_info.media_video, directory_info.media_video_origin)
      if (ServiceConfig.isVacs()) {
        this.streaming_url = ServiceConfig.get('static_storage_prefix') + media_video + this.video_file_name
        this.download_url = ServiceConfig.get('static_storage_prefix') + media_video + this.video_file_name
      } else {
        // if (Util.isEmpty(this.stream_url)) {
        //   this.hls_streaming_url = ServiceConfig.get('hls_streaming_url') + media_video + proxy_file_name + '/master.m3u8'
        //   this.dash_streaming_url = ServiceConfig.get('dash_streaming_url') + media_video + proxy_file_name + '/manifest.mpd'
        // } else {
        //   this.hls_streaming_url = ServiceConfig.get('hls_streaming_url') + media_video + this.stream_url + '/master.m3u8'
        //   this.dash_streaming_url = ServiceConfig.get('dash_streaming_url') + media_video + this.stream_url + '/manifest.mpd'
        // }
        let prefix = ''
        start_time = Util.parseInt(start_time, 0);
        end_time = Util.parseInt(end_time, 0);
        if (start_time || end_time) {
          prefix = `/vodStart/${start_time}/vodEnd/${end_time}`
        }
        logger.debug(start_time, end_time, prefix);
        this.hls_streaming_url = ServiceConfig.get('hls_streaming_url') + prefix + media_video + this.video_file_name + '/master.m3u8'
        this.dash_streaming_url = ServiceConfig.get('dash_streaming_url') + prefix + media_video + this.video_file_name + '/manifest.mpd'
        this.streaming_url = ServiceConfig.get('cdn_url') + media_video + this.video_file_name
        this.download_url = ServiceConfig.get('cdn_url') + media_video + this.video_file_name
      }
    }
  }
}
