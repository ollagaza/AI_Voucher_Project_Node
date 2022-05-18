import MySQLModel from '../../mysql-model'
import JsonWrapper from '../../../wrapper/json-wrapper'
import log from '../../../libs/logger'

export default class OperationLinkModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'operation_link'
    this.selectable_fields = ['*']
    this.log_prefix = '[OperationLinkModel]'
    this.default_private_key = ['operation_seq', 'random_key', 'password', 'reg_date']
  }

  createOperationLink = async (operation_seq, link_type, auth, share_email = null, password = null, expire_date = null, enable_download = false) => {
    const create_params = {
      operation_seq,
      link_type,
      auth,
      password,
      share_email,
      expire_date,
      enable_download
    }
    return await this.create(create_params, 'seq')
  }

  setOperationLinkBySeq = async (link_seq, random_key, link_code) => {
    await this.update({ seq: link_seq }, { random_key, link_code })
  }

  getLinkInfoByOperation = async (operation_seq, link_type, share_email = null) => {
    const filter = {
      operation_seq: operation_seq,
      link_type
    }
    if (share_email) {
      filter.share_email = share_email
    }
    const find_result = await this.findOne(filter)
    return new JsonWrapper(find_result, this.default_private_key)
  }

  getEmailLinkListByOperation = async (operation_seq) => {
    const filter = {
      operation_seq: operation_seq,
      link_type: 'E'
    }
    const query_result = await this.find(filter)
    return this.getLinkList(query_result)
  }

  getStaticLinkListByOperation = async (operation_seq) => {
    const query = this.database.select(this.selectable_fields)
    query.from(this.table_name)
    query.where('operation_seq', operation_seq)
    query.whereIn('link_type', ['A', 'V'])
    const query_result = await query
    return this.getLinkList(query_result)
  }
  getLinkList = (query_result) => {
    const result_list = []
    if (!query_result || !query_result.length) {
      return result_list
    }
    for (let i = 0; i < query_result.length; i++) {
      const link_info = new JsonWrapper(query_result[i], this.default_private_key)
      const link_info_json = link_info.toJSON()
      link_info_json.use_password = !!link_info.password
      result_list.push(link_info_json)
    }
    return result_list
  }

  getLinkInfoBySeq = async (link_seq) => {
    const find_result = await this.findOne({ seq: link_seq })
    return new JsonWrapper(find_result, this.default_private_key)
  }

  deleteBySeq = async (link_seq) => {
    return await this.delete({ seq: link_seq })
  }

  setLinkOptionBySeq = async (link_seq, auth, password = null, expire_date = null, enable_download = false, change_password = true) => {
    const update_params = {
      auth,
      expire_date: expire_date ? expire_date : null,
      enable_download: enable_download === true ? 1 : 0,
      modify_date: this.database.raw('NOW()')
    }
    if (change_password) {
      update_params.password = password
    }
    return await this.update({ seq: link_seq }, update_params)
  }

  getLinkCount = async (operation_seq) => {
    const where = { operation_seq }
    try {
      const total_count = await this.getTotalCount(where)
      return total_count
    } catch (error) {
      log.error(this.log_prefix, '[getLinkCount]', error)
      return 0
    }
  }
}
