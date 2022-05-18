import _ from 'lodash'
import Util from '../../utils/Util'
import log from '../../libs/logger'
import {DynamicModel} from '../../database/mongodb/dynamic'


const DynamicAdminServiceClass = class {
  constructor() {
    this.log_prefix = '[DynamicAdminServiceClass]'
  }

  getDynamicTemplateList = async (page_navigation, field_order, search_keyword, search_option) => {
    const dynamic_count = await DynamicModel.getDynamicTotalCount(search_keyword, search_option)
    page_navigation.list_count = Util.parseInt(page_navigation.list_count)
    page_navigation.cur_page = Util.parseInt(page_navigation.cur_page)
    page_navigation.total_count = dynamic_count
    const sort = JSON.parse(`{ "${field_order.name}": ${field_order.direction === 'desc' ? -1 : 1} }`)
    const dynamic_list = await DynamicModel.getDynamicList(page_navigation, sort, search_keyword, search_option)

    return { dynamic_list, page_navigation }
  }

  getDynamicTemplateOne = async (template_id) => {
    return DynamicModel.findByTemplate_id(template_id)
  }

  createDynamicTemplate = async (data) => {
    const result = await DynamicModel.createDynamic(data)
    return result
  }

  updateDynamicTemplate = async (template_id, data) => {
    const result = await DynamicModel.updateById(template_id, data)
    return result
  }

  daleteDynamicTemplate = async (template_id, data) => {
    const result = await DynamicModel.deleteById(template_id, data)
    return result
  }
}


const dynamic_admin_service = new DynamicAdminServiceClass()

export default dynamic_admin_service
