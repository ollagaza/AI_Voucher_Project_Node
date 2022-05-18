import JsonWrapper from '../json-wrapper'

export default class MemberInfoSub extends JsonWrapper {
  constructor (data = null, private_keys = []) {
    super(data, private_keys)
  }
}
