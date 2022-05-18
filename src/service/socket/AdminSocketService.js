import SocketManager from "../socket-manager";

const AdminSocketServiceClass = class {
  constructor() {
    this.log_prefix = '[AdminSocketServiceClass]'
  }

  onGeneralAdminNotice = async (type, action_type = null, sub_type = null, message_info = null, extra_data = null) => {
    const data = {
      type,
      group_seq: 'admin',
      ...extra_data
    }
    if (sub_type) data.sub_type = sub_type
    if (action_type) data.action_type = action_type

    await this.sendToFrontMulti('admin', data, message_info)
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

const admin_socket_service = new AdminSocketServiceClass()
export default admin_socket_service
