export default class NotifyInfo {
  constructor () {
    this.seq = null
    this.notify_type = ''
    this.profile_image = null
    this.text = ''
    this.regist_datetime = null
  }

  toJSON = () => {
    return {
      'seq': this.seq,
      'type': this.notify_type,
      'profile_image': this.profile_image,
      'text': this.text,
      'regist_datetime': this.regist_datetime,
    }
  }
}
