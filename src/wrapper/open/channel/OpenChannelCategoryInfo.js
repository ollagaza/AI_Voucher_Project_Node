import JsonWrapper from '../../json-wrapper'

export default class OpenChannelCategoryInfo extends JsonWrapper {
  constructor (data = null, private_keys = []) {
    super(data, private_keys)
    this.setKeys([
      'seq', 'group_seq', 'category_name', 'order', 'content_count', 'reg_date', 'modify_date'
    ])
  }

  getQueryJson = () => {
    this.setIgnoreEmpty(true)
    return this.toJSON()
  }
}
