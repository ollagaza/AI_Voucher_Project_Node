import MySQLModel from '../../../mysql-model'
import OpenChannelBannerInfo from '../../../../wrapper/open/channel/OpenChannelBannerInfo'

export default class OpenChannelBannerModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'open_channel_banner'
    this.selectable_fields = ['*']
    this.log_prefix = '[OpenChannelBannerModel]'
  }

  getOpenChannelBannerList = async (group_seq) => {
    const result_list = []

    const query_result = await this.find({ group_seq }, null, { name: 'order', direction: 'asc' })
    if (query_result && query_result.length) {
      for (let i = 0; i < query_result.length; i++) {
        result_list.push(new OpenChannelBannerInfo(query_result[i]).setUrl())
      }
    }

    return result_list
  }

  createOpenChannelBannerInfo = async (banner_info) => {
    const banner_seq = await this.create(banner_info.getQueryJson(), 'seq')
    return this.getOpenChannelBannerInfo(banner_seq)
  }

  getOpenChannelBannerInfo = async (banner_seq) => {
    const banner_info = await this.findOne({ seq: banner_seq })
    return new OpenChannelBannerInfo(banner_info).setUrl()
  }

  modifyBannerInfo = async (group_seq, banner_seq, banner_info) => {
    banner_info = banner_info.getQueryJson()
    banner_info.modify_date = this.database.raw('NOW()')
    return this.update({ group_seq, seq: banner_seq }, banner_info)
  }

  modifyBannerOrder = async (group_seq, order_data_list) => {
    if (!order_data_list || !order_data_list.length) return

    let query_str = `
      UPDATE ${this.table_name} O
      JOIN (`

    for (let i = 0; i < order_data_list.length; i++) {
      const order_data = order_data_list[i]
      if (i !== 0) {
        query_str += `
        UNION ALL`
      }
      query_str += `
        SELECT ${order_data.seq} AS banner_seq, ${order_data.order} AS new_order`
    }

    query_str += `
      ) D
        ON O.seq = D.banner_seq
      SET O.order = D.new_order,
        O.modify_date = NOW()
      WHERE O.group_seq = '${group_seq}'
    `

    return this.rawQueryUpdate(query_str)
  }

  deleteOpenChannelBannerInfo = async (group_seq, banner_seq) => {
    return this.delete({ seq: banner_seq, group_seq })
  }
}
