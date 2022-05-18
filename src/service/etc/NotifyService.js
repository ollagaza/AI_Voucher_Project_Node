import NotifyInfo from '../../wrapper/common/NotifyInfo'
// import GroupInfoService from '../group/GroupService'
import Util from '../../utils/Util'
import ServiceConfig from '../service-config'

const NotifyServiceClass = class {
  constructor () {
    this.log_prefix = '[NotifyServiceClass]'
  }

  rtnSendMessage = async (database, message_info, memberlog_seq) => {
    // const member_info = GroupInfoService.getGroupSeqByMemberInfo(database, message_info.send_seq)
    const notifyInfo = new NotifyInfo()
    notifyInfo.notify_type = 'message'
    notifyInfo.text = message_info.title
    notifyInfo.profile_image = Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), member_info.profile_image_path)
    notifyInfo.seq = memberlog_seq
    notifyInfo.regist_datetime = new Date()

    return notifyInfo
  }
}

const notifyinfo_service = new NotifyServiceClass()

export default notifyinfo_service
