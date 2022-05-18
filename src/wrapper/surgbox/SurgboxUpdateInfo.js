import JsonWrapper from '../json-wrapper'
import Util from '../../utils/Util'

export default class SurgboxUpdateInfo extends JsonWrapper {
  constructor (data = null, private_keys = []) {
    super(data, private_keys)
    this.ignore_empty = true
    this.setKeys([
      'version', 'file_count', 'file_size', 'is_force', 'is_hide', 'title', 'desc', 'user_id', 'user_name', 'user_nickname', 'reg_date', 'modify_date'
    ])
    if (data) {
      this.is_force = Util.isTrue(data.is_force)
      this.is_hide = Util.isTrue(data.is_hide)
    }
  }

  getByRequestBody = (request_body) => {
    this.setKeys([
      'version', 'type', 'v1', 'v2', 'v3', 'v4', 'is_force', 'is_hide', 'title', 'desc'
    ])

    this.setIgnoreEmpty(true)

    if (request_body != null) {
      // if (!request_body.type) request_body.type = 'box'
      this.json_keys.forEach((key) => {
        if (!Util.isEmpty(request_body[key])) {
          this[key] = request_body[key]
        }
      })
      if (this.version) {
        const version_array = `${this.version}`.split('.')
        this.v1 = -Util.parseInt(version_array[0], 0)
        this.v2 = -Util.parseInt(version_array[1], 0)
        this.v3 = -Util.parseInt(version_array[2], 0)
        this.v4 = -Util.parseInt(version_array[3], 0)
      }
      this.is_force = Util.isTrue(this.is_force) ? 1 : 0
      this.is_hide = Util.isTrue(this.is_hide) ? 1 : 0

      this.is_empty = false
    }

    return this
  }
}
