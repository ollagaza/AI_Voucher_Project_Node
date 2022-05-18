import JsonWrapper from '../json-wrapper'

export default class GroupInfo extends JsonWrapper {
  constructor (data = null, private_keys = []) {
    super(data, private_keys)
  }
}
