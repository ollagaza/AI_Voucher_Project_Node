import _ from 'lodash'
import JsonWrapper from '../json-wrapper'
import Util from '../../utils/Util'

/**
 * @swagger
 * definitions:
 *  VideoInfo:
 *    type: "object"
 *    description: "비디오의 메타 데이터"
 *    properties:
 *      video_name:
 *        type: "string"
 *        description: "비디오 파일 명"
 *      fps:
 *        type: "number"
 *        description: "비디오 프레임 레이트"
 *      width:
 *        type: "number"
 *        description: "비디오 폭 (px)"
 *      height:
 *        type: "number"
 *        description: "비디오 높이 (px)"
 *      total_time:
 *        type: "string"
 *        description: "비디오의 총 재생 시간 (sec)"
 *      total_frame:
 *        type: "string"
 *        description: "비디오의 총 프레임 수"
 *
 */

export default class VideoInfo extends JsonWrapper {
  constructor (data = null, private_keys = []) {
    super(data, private_keys)
    this.setKeys(['video_name', 'fps', 'width', 'height', 'total_time', 'total_frame'])
  }

  getFromXML = (media_xml_info) => {
    if (!media_xml_info) {
      return this
    }

    if (_.isArray(media_xml_info)) {
      media_xml_info = media_xml_info[0]
    }

    this.video_name = Util.getXmlText(media_xml_info)
    this.fps = media_xml_info.$.FPS
    this.width = media_xml_info.$.Width
    this.height = media_xml_info.$.Height
    this.total_time = media_xml_info.$.RunTime
    this.total_frame = media_xml_info.$.FrameNo

    this.is_empty = false

    return this
  }

  getFromHawkEyeXML = (hawkeye_xml_info) => {
    if (!hawkeye_xml_info || !hawkeye_xml_info.errorreport || !hawkeye_xml_info.errorreport.mediainfo) {
      return this
    }

    let media_xml_info = hawkeye_xml_info.errorreport.mediainfo
    if (_.isArray(media_xml_info)) {
      media_xml_info = media_xml_info[0]
    }

    const state = Util.getXmlText(media_xml_info.state)
    let progress = Util.getXmlText(media_xml_info.progress)
    progress = Util.isNumber(progress) ? parseInt(progress, 10) : progress

    if (Util.isNumber(state) && parseInt(state, 10) <= 6 && progress >= 100) {
      const total_time = Util.getXmlText(media_xml_info.totaltime)
      const total_frame = Util.getXmlText(media_xml_info.totalframe)
      const width = Util.getXmlText(media_xml_info.videowidth)
      const height = Util.getXmlText(media_xml_info.videoheight)
      this.video_name = Util.getXmlText(media_xml_info.title)
      this.fps = Util.getXmlText(media_xml_info.videoframerate)
      if (media_xml_info.framerate) {
        this.fps = parseFloat(Util.getXmlText(media_xml_info.framerate))
      } else {
        this.fps = parseFloat(Util.getXmlText(media_xml_info.videoframerate))
      }
      this.total_time = parseFloat(Util.isEmpty(total_time) ? 0 : total_time)
      this.total_frame = parseInt(Util.isEmpty(total_frame) ? 0 : total_frame, 10)
      this.width = parseFloat(Util.isEmpty(width) ? 0 : width)
      this.height = parseFloat(Util.isEmpty(height) ? 0 : height)

      this.is_empty = false
    } else {
      this.error_code = state
      this.message = `progress: ${progress}, msg: ${Util.getXmlText(media_xml_info.msg)}`
    }

    return this
  }

  getXmlJson = () => {
    return {
      '_': this.video_name,
      '$': {
        'FPS': this.fps,
        'Width': this.width,
        'Height': this.height,
        'RunTime': this.total_time,
        'FrameNo': this.total_frame
      }
    }
  }
}
