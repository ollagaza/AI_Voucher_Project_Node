import DBMySQL from '../../database/knex-mysql'
import Util from '../../utils/Util'
import log from '../../libs/logger'

import { OperationClipModel } from '../../database/mongodb/OperationClip'
import OperationStorageModel from '../../database/mysql/operation/OperationStorageModel'
import OperationCommentService from './OperationCommentService'
import GroupAlarmService from '../group/GroupAlarmService'
// import GroupService from '../group/GroupService'
import Constants from '../../constants/constants'
import OperationDataService from "./OperationDataService";

const OperationClipServiceClass = class {
  constructor () {
    this.log_prefix = '[OperationClipService]'
  }

  updateClipCount = async (operation_info, clip_count) => {
    try {
      await new OperationStorageModel(DBMySQL).updateClipCount(operation_info.storage_seq, clip_count)
    } catch (error) {
      log.error(this.log_prefix, '[updateClipCount]', error)
    }
  }

  createClip = async (operation_info, member_info, request_body, update_clip_count = true, group_member_info = null, create_alarm = false) => {
    const clip_info = request_body.clip_info
    const clip_count = request_body.clip_count

    const create_result = await OperationClipModel.createOperationClip(operation_info, member_info, clip_info)
    if (update_clip_count) {
      await this.updateClipCount(operation_info, 1)
      await OperationDataService.increaseAnnoCount(DBMySQL, operation_info)
      // if (group_member_info) {
      //   GroupService.onChangeGroupMemberContentCount(group_member_info.group_seq, member_info.seq, 'anno', Constants.UP);
      // }
    }

    if (create_alarm) {
      const alarm_data = {
        operation_seq: operation_info.seq,
        clip_id: create_result._id,
        member_seq: member_info.seq
      }
      const name = member_info.user_name

      const alarm_message = `'${name}'님이 '${operation_info.operation_name}'수술에 클립을 추가하였습니다.`
      const socket_message = {
        title: `'${operation_info.operation_name}' 수술에 클립이 추가되었습니다.`,
        message: `${name}님이 '${operation_info.operation_name}' 수술에 클립을 추가하였습니다.<br/>확인하려면 클릭하세요.`
      }
      const socket_data = {
        clip_info: create_result,
        member_seq: member_info.seq,
        message: `${name}님이 클립을 추가하였습니다.`
      }
      GroupAlarmService.createOperationGroupAlarm(member_info.seq, GroupAlarmService.ALARM_TYPE_CLIP, alarm_message, operation_info, member_info, alarm_data, socket_message, socket_data)
    }

    return create_result
  }

  updateClip = async (clip_id, clip_info, tag_list = null) => {
    let update_result = await OperationClipModel.updateOperationClip(clip_id, clip_info, tag_list)
    if (update_result) {
      update_result = update_result.toJSON()
      delete update_result.content_id
      delete update_result.operation_seq
      delete update_result.__v
      delete update_result.tag_list
      await OperationCommentService.changeClipInfo(clip_id, update_result)
    }

    return update_result
  }

  deleteById = async (clip_id, operation_info, request_body, group_member_info = null) => {
    const delete_result = await OperationClipModel.deleteById(clip_id)

    const clip_count = request_body.clip_count
    await this.updateClipCount(operation_info, -1)
    await OperationDataService.decreaseAnnoCount(DBMySQL, operation_info)

    if (request_body.remove_phase === true) {
      await this.deletePhase(operation_info.seq, request_body.phase_id)
    }

    await OperationCommentService.deleteClipInfo(clip_id)

    // if (group_member_info) {
    //   GroupService.onChangeGroupMemberContentCount(group_member_info.group_seq, group_member_info.member_seq, 'anno', Constants.DOWN);
    // }

    return delete_result
  }

  findByOperationSeq = async (operation_seq) => {
    return await OperationClipModel.findByOperationSeq(operation_seq, '-content_id -operation_seq -tag_list -__v')
  }

  findByMemberSeq = async (member_seq) => {
    return await OperationClipModel.findByMemberSeq(member_seq)
  }

  findByGroupSeq = async (group_seq) => {
    return await OperationClipModel.findByGroupSeq(group_seq)
  }

  createPhase = async (operation_info, request_body) => {
    const phase_info = await OperationClipModel.createPhase(operation_info, request_body.phase_desc, request_body.phase_type)
    const phase_id = phase_info._id
    await this.setPhase(phase_id, request_body)
    return {
      phase_info,
      phase_id
    }
  }

  updatePhase = async (phase_id, phase_desc) => {
    return await OperationClipModel.updatePhase(phase_id, phase_desc)
  }

  deletePhase = async (operation_seq, phase_id) => {
    const delete_result = await OperationClipModel.deletePhase(operation_seq, phase_id)
    await this.unsetPhase(operation_seq, phase_id)
    return delete_result
  }

  setPhase = async (phase_id, request_body) => {
    const clip_id_list = request_body.clip_id_list
    if (!clip_id_list) {
      return true
    }
    return await OperationClipModel.setPhase(phase_id, clip_id_list)
  }

  unsetPhase = async (operation_seq, phase_id) => {
    return await OperationClipModel.unsetPhase(operation_seq, phase_id)
  }

  unsetPhaseOne = async (operation_seq, phase_id, request_body) => {
    const clip_id = request_body.clip_id

    const result = await OperationClipModel.unsetPhaseOne(clip_id, operation_seq, phase_id)

    if (request_body.remove_phase === true) {
      await this.deletePhase(operation_seq, phase_id)
    }
    return result
  }

  migrationGroupSeq = async (member_seq, group_seq) => {
    await OperationClipModel.migrationGroupSeq(member_seq, group_seq)
  }

  migrationGroupSeqByOperation = async (operation_seq, group_seq) => {
    await OperationClipModel.migrationGroupSeqByOperation(operation_seq, group_seq)
  }

  copyClipByOperation = async (origin_operation_seq, operation_info) => {
    try {
      const operation_clip_list = await this.findByOperationSeq(origin_operation_seq)
      if (!operation_clip_list || !operation_clip_list.length) return true

      const phase_map = {}
      const clip_list = []
      for (let i = 0; i < operation_clip_list.length; i++) {
        const clip_info = operation_clip_list[i]
        if (clip_info.is_phase) {
          const phase_info = await this.createPhase(operation_info, { phase_desc: clip_info.desc, phase_type: clip_info.type })
          phase_map[clip_info._id] = phase_info.phase_id
        } else {
          clip_list.push(clip_info)
        }
      }

      for (let i = 0; i < clip_list.length; i++) {
        const clip_info = clip_list[i]
        const phase_id = clip_info.phase_id
        clip_info.phase_id = phase_id ? phase_map[phase_id] : null
        if (clip_info.type !== 'file' && clip_info.thumbnail_url) {
          clip_info.thumbnail_url = clip_info.thumbnail_url.replace(operation_info.origin_media_path, operation_info.media_path)
        }
        const member_info = {
          seq: clip_info.member_seq,
          user_name: clip_info.user_name,
          user_nickname: clip_info.user_nickname
        }
        await this.createClip(operation_info, member_info, { clip_info }, false )
      }
      return true
    } catch (e) {
      log.error(this.log_prefix, '[copyClipByOperation]', origin_operation_seq, operation_info, e)
    }
    return false
  }

  findByMemberSeqAndGroupSeq = async (member_seq, group_seq) => {
    return await OperationClipModel.findByMemberSeqAndGroupSeq(member_seq, group_seq)
  }

  getOperationClipCounts = async () => {
    return await OperationClipModel.getOperationClipCounts()
  }
}

const operation_clip_service = new OperationClipServiceClass()
export default operation_clip_service
