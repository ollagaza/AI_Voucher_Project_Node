import _ from 'lodash'
import Util from '../../utils/Util'
import DBMySQL from '../../database/knex-mysql'
import log from '../../libs/logger'
import {DynamicModel} from '../../database/mongodb/dynamic'
import {DynamicResultModel} from "../../database/mongodb/dynamic_result";
// import GroupAlarmService from "../group/GroupAlarmService";
import OperationService from "../operation/OperationService";

const DynamicServiceClass = class {
  constructor() {
    this.log_prefix = '[DynamicServiceClass]'
  }

  getDynamicTemplateList = async (template_type) => {
    const dynamic_list = await DynamicModel.getDynamicTemplateTypeList(template_type)
    return dynamic_list
  }

  getDynamicResult = async (result_id) => {
    return DynamicResultModel.findByResultId(result_id)
  }

  getDynamicResultList = async (result_seq) => {
    const result_list = await DynamicResultModel.getDynamicResultList(result_seq)
    return result_list
  }

  saveTemplateResult = async (group_auth, request) => {
    const api_type = request.params.api_type
    const api_key = request.params.api_key
    const request_body = request.body
    const result = await DynamicResultModel.createDynamicResult(request_body)
    this.setGroupAlarm(api_type, api_key, request_body, group_auth, true)
    return result
  }

  updateTemplateResult = async (group_auth, request) => {
    const api_type = request.params.api_type
    const api_key = request.params.api_key
    const request_body = request.body
    const result_seq = request.params.id
    const result = await DynamicResultModel.updateById(result_seq, request_body)
    this.setGroupAlarm(api_type, api_key, request_body, group_auth, false)
    return result
  }

  deleteTemplateResult = async (result_seq, data) => {
    const result = await DynamicResultModel.deleteById(result_seq, data)
    return result
  }

  setJsonTemplateData = () => {
    const json_file_list = require.context('../../data/dynamic_template', true, /\/[^.]+\.json$/)
    if (json_file_list && json_file_list.keys()) {
      json_file_list.keys().forEach((key) => {
        (
          async (key) => {
            const data_json = json_file_list(key)
            log.debug(this.log_prefix, key, data_json)

            const template = await DynamicModel.findByTemplate_id(data_json.template_id)
            log.debug(this.log_prefix, key, template)
            if (template && template._doc && template._doc.version < data_json.version) {
              log.debug(this.log_prefix, 'setJsonTemplateData', data_json, data_json.template_id, template._doc.version, data_json.version);
              await DynamicModel.updateByTemplate_id(data_json)
            } else if (!template || !template._doc.version) {
              await DynamicModel.createDynamic(data_json)
            }
          }
        )(key)
      })
    }
  }

  setGroupAlarm = async (api_type, api_key, template_result, group_auth, is_create = true) => {
    const operation_info = await OperationService.getOperationInfo(DBMySQL, api_key, null, false, false)
    const alarm_message = `'{name}'님이 '${operation_info.operation_name}'수술에 ${template_result.title}를 ${is_create ? '등록' : '작성'}했습니다.`
    const name = group_auth.group_member_info.member_name_used ? group_auth.member_info.user_name : group_auth.member_info.user_nickname
    const socket_message = {
      title: `'${name}'님이 '${operation_info.operation_name}'수술에 '${template_result.title}'를 ${is_create ? '등록' : '작성'}했습니다.`
    }
    const socket_data = {
      operation_seq: operation_info.seq
    }
    const alarm_data = {
      operation_seq: operation_info.seq,
      member_seq: group_auth.member_info.seq
    }
    // GroupAlarmService.createOperationGroupAlarm(operation_info.group_seq, GroupAlarmService.ALARM_TYPE_OPERATION, alarm_message, operation_info, group_auth.member_info, alarm_data, socket_message, socket_data, false)
  }
}


const dynamic_service = new DynamicServiceClass()

export default dynamic_service
