import DBMySQL from "../../database/knex-mysql";
import SocketManager from "../socket-manager";
import log from "../../libs/logger";
import GroupService from "../group/GroupService";

const GroupSocketServiceClass = class {
  constructor() {
    this.log_prefix = '[GroupSocketServiceClass]'
  }

  noticeGroupAdmin = async (group_seq, action_type = null, message_info = null) => {
    const admin_id_list = await this.getAdminGroupMemberSeqList(DBMySQL, group_seq)
    if (!admin_id_list || !admin_id_list.length) {
      return
    }
    const data = {
      type: 'groupMemberStateChange',
      group_seq
    }
    if (action_type) data.action_type = action_type

    await this.sendToFrontMulti(admin_id_list, data, message_info)
  }

  onGroupMemberStateChange = (group_seq, group_member_seq, message_info = null, type = 'groupMemberStateChange', action_type = 'groupSelect') => {
    (
      async () => {
        try {
          const group_member_model = GroupService.getGroupMemberModel(DBMySQL)
          const member_seq = await group_member_model.getMemberSeqByGroupMemberSeq(group_member_seq)
          if (!member_seq) {
            return
          }
          const data = {
            type,
            action_type
          }
          const socket_data = {
            data
          }
          if (message_info) {
            message_info.type = 'pushNotice'
            socket_data.message_info = message_info
          }
          if (group_seq) {
            data.group_seq = group_seq
            await SocketManager.sendToFrontGroupOne(group_seq, member_seq, socket_data)
          } else {
            await SocketManager.sendToFrontOne(member_seq, socket_data)
          }
        } catch (error) {
          log.error(this.log_prefix, '[onGroupMemberStateChange]', group_seq, group_member_seq, message_info, type, action_type, error)
        }
      }
    )()
  }

  onGroupStateChange = async (group_seq, sub_type = null, action_type = null, message_info = null) => {
    const data = {
      type: 'groupStorageInfoChange',
      group_seq
    }
    if (sub_type) data.sub_type = sub_type
    if (action_type) data.action_type = action_type

    await this.sendToFrontMulti(group_seq, data, message_info)
  }

  onGeneralGroupNotice = async (group_seq, type, action_type = null, sub_type = null, message_info = null, extra_data = null) => {
    const data = {
      type,
      group_seq,
      ...extra_data
    }
    if (sub_type) data.sub_type = sub_type
    if (action_type) data.action_type = action_type

    await this.sendToFrontMulti(group_seq, data, message_info)
  }

  sendToFrontMulti = async (group_seq, data, message_info) => {
    const socket_data = {
      data
    }
    if (message_info) {
      message_info.type = 'pushNotice'
      socket_data.message_info = message_info
    }
    await SocketManager.sendToFrontGroup(group_seq, socket_data)
  }
}

const group_socket_service = new GroupSocketServiceClass()
export default group_socket_service
