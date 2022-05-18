import JsonWrapper from '../json-wrapper'

export default class GroupMemberInfo extends JsonWrapper {
  constructor (data = null, private_keys = []) {
    super(data, private_keys)
  }
}
