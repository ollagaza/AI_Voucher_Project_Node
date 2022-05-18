import JsonWrapper from '../json-wrapper'
import Util from '../../utils/Util'

/**
 * @swagger
 * definitions:
 *  ClipSeqInfo:
 *    type: "object"
 *    description: "클립 시퀀스 정보"
 *    required:
 *    - "seq_id"
 *    - "clip_num"
 *    - "seq_num"
 *    - "unique_id"
 *    - "start_time"
 *    - "end_time"
 *    - "desc"
 *    properties:
 *      seq_id:
 *        type: "string"
 *        description: "클립 시퀀스의 고유 아이디"
 *      clip_num:
 *        type: "string"
 *        description: "클립 큐레이션 일련 번호"
 *      seq_num:
 *        type: "string"
 *        description: "클립 시퀀스 일련 번호"
 *      unique_id:
 *        type: "string"
 *        description: "클립 인덱스의 고유 아이디"
 *      original_url:
 *        type: "string"
 *        description: "클립 인덱스 이미지의 URL (원본크기)"
 *      thumbnail_url:
 *        type: "string"
 *        description: "클립 인덱스 이미지의 URL (작은크기)"
 *      start_time:
 *        type: "integer"
 *        description: "원본 영상에서 시퀀스 시작 시간"
 *      end_time:
 *        type: "integer"
 *        description: "원본 영상에서 시퀀스 종료 시간"
 *      dest:
 *        type: "string"
 *        description: "시퀀스 동영상 URL"
 *      desc:
 *        type: "string"
 *        description: "시퀀스 설명 문구"
 *
 */


const dest_rename_regex = /^[\w]+\\([\w]+)\.([\w]+)$/i

export default class ClipSeqInfo extends JsonWrapper {
  constructor (data = null, private_keys = []) {
    super(data, private_keys)

    this.setKeys(['seq_id', 'clip_num', 'seq_num', 'unique_id', 'original_url', 'thumbnail_url', 'start_time', 'end_time', 'dest', 'desc'])
  }

  getFromXML = (xml_info, clip_info) => {
    if (!xml_info) {
      return this
    }

    this.seq_id = this.getXmlText(xml_info.SeqId)
    this.clip_num = clip_info.clip_num
    this.seq_num = xml_info._
    this.unique_id = clip_info.unique_id
    this.original_url = clip_info.original_url
    this.thumbnail_url = clip_info.thumbnail_url
    this.start_time = Util.timeStrToSecond(this.getXmlText(xml_info.StartTime))
    this.end_time = Util.timeStrToSecond(this.getXmlText(xml_info.EndTime))
    this.dest = clip_info.url_prefix + this.getXmlText(xml_info.Dest).replace('\\', '/')
    this.desc = this.getXmlText(xml_info.Desc)

    this.is_empty = false

    return this
  }

  setDest = (source, fps) => {
    const start_frame = Math.round(this.start_time * fps)
    const end_frame = Math.round(this.end_time * fps)
    this.dest = source.replace(dest_rename_regex, 'Clip\\$1_' + start_frame + '_' + end_frame + '.$2')
  }

  getXmlJson = () => {
    return {
      '_': this.seq_num,
      'StartTime': [Util.secondToTimeStr(this.start_time)],
      'EndTime': [Util.secondToTimeStr(this.end_time)],
      'Dest': [this.dest],
      'Desc': [this.desc],
      'SeqId': [this.seq_id]
    }
  }
}
