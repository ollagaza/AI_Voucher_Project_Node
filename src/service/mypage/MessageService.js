import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql'
import GroupMessageModel from "../../database/mysql/mypage/GroupMessageModel";
import MessageModel from '../../database/mysql/mypage/MessageModel'
import socketManager from '../socket-manager'
import MemberLogService from '../member/MemberLogService'
import NotifyService from '../etc/NotifyService'
import data from "../../routes/v1/data";
import message from "../../routes/v1/message";
import group from "../../routes/admin/group";

const MessageServiceClass = class {
  constructor () {
    this.log_prefix = '[MessageService]'
  }

  getMessageModel = (database = null) => {
    if (database) {
      return new MessageModel(database)
    } else {
      return new MessageModel(DBMySQL)
    }
  }

  getInstantMessageModel = (database = null) => {
    if (database) {
      return new InstantMessageModel(database)
    } else {
      return new InstantMessageModel(DBMySQL)
    }
  }

  getGroupMessageModel = (database = null) => {
    if (database) {
      return new GroupMessageModel(database)
    } else {
      return new GroupMessageModel(DBMySQL)
    }
  }

  getReceiveCount = async (database, member_seq) => {
    try {
      const msgModel = this.getMessageModel(database)
      return await msgModel.getReceiveCount(member_seq)
    } catch (e) {
      throw e
    }
  }

  getReceiveLists = async (database, member_seq, params, page_navigation) => {
    try {
      const output = new StdObject()
      const msgModel = this.getMessageModel(database)

      const searchObj = {
        query: {
          is_new: true,
          query: [
            { receive_seq: member_seq },
            { is_receive_del: 0 },
          ],
        },
        order: {
          name: 'regist_date',
          direction: 'desc',
        }
      }

      if (params.searchText !== null) {
        const searchParam = {
          $or: [
            { user_id: ['like', params.searchText] },
            { group_name: ['like', params.searchText] },
            { desc: ['like', params.searchText] },
          ],
        }
        searchObj.query.query.push(searchParam)
      }

      output.add('receiveList', await msgModel.getReceiveList(searchObj, page_navigation))

      return output
    } catch (e) {
      throw e
    }
  }

  getSendLists = async (database, member_seq, params, page_navigation) => {
    try {
      const output = new StdObject()
      const msgModel = this.getMessageModel(database)

      const searchObj = {
        query: {
          is_new: true,
          query: [
            { send_seq: member_seq },
            { is_send_del: 0 },
          ],
        },
        order: {
          name: 'regist_date',
          direction: 'desc',
        }
      }

      if (params.searchText !== null) {
        const searchParam = {
          $or: [
            { user_id: ['like', params.searchText] },
            { group_name: ['like', params.searchText] },
            { desc: ['like', params.searchText] },
          ],
        }
        searchObj.query.query.push(searchParam)
      }

      output.add('sendList', await msgModel.getSendList(searchObj, page_navigation))

      return output
    } catch (e) {
      throw e
    }
  }

  setViewMessage = async (database, seq) => {
    try {
      const msgModel = this.getMessageModel(database)
      const result = await msgModel.setViewMessage(seq)

      return result
    } catch (e) {
      throw e
    }
  }

  sendMessage = async (database, group_seq, message_info) => {
    try {
      const msgModel = this.getMessageModel(database)
      const result = await msgModel.sendMessage(message_info)
      message_info.title = '쪽지가 도착했습니다.';
      message_info.info = message_info;
      const notifyinfo = await NotifyService.rtnSendMessage(database, message_info, null)

      const send_socket_message_info = {
        message_info: {
          title: '쪽지가 도착하였습니다.',
          message: '쪽지',
          notice_type: '',
          type: 'pushNotice',
        },
        notifyinfo: notifyinfo.toJSON(),
        data: {
          type: null,
          action_type: null
        }
      }
      await socketManager.sendToFrontOne(message_info.receive_seq, send_socket_message_info)
      send_socket_message_info.message_info.title = '쪽지가 발송되었습니다.'
      delete send_socket_message_info.notifyinfo;
      await socketManager.sendToFrontOne(message_info.send_seq, send_socket_message_info)
      await MemberLogService.createMemberLog(DBMySQL, group_seq, null, null, '1003', null, '', 0, 0, 1)

      return result
    } catch (e) {
      throw e
    }
  }

  deleteMessage = async (database, seq, flag) => {
    try {
      const msgModel = this.getMessageModel(database)
      const result = await msgModel.deleteMessage(seq, flag)

      return result
    } catch (e) {
      throw e
    }
  }

  getGroupMessage = async (database, group_seq, message_seq) => {
    const groupmsgModel = this.getGroupMessageModel(database)
    const result = await groupmsgModel.getGroupMessageOne(group_seq, message_seq)
    return result;
  }

  getGroupMessageList = async (database, group_seq, req) => {
    const request_body = req.query ? req.query : {}
    const request_paging = request_body.paging ? JSON.parse(request_body.paging) : {}
    let request_order = request_body.order ? JSON.parse(request_body.order) : null

    if (!request_order) {
      request_order = {name: 'regist_date', direction: 'desc'}
    }

    const paging = {}
    paging.list_count = request_paging.list_count ? request_paging.list_count : 20
    paging.cur_page = request_paging.cur_page ? request_paging.cur_page : 1
    paging.page_count = request_paging.page_count ? request_paging.page_count : 10
    paging.no_paging = 'N'

    const groupmsgModel = this.getGroupMessageModel(database)
    return await groupmsgModel.getGroupMessageList(group_seq, paging, request_order)
  }

  sendGroupMessage = async (database, member_seq, message_info) => {
    try {
      const groupmsgModel = this.getGroupMessageModel(database)
      const params = {
        send_seq: message_info.send_seq,
        send_name: message_info.send_name,
        receive_seq: JSON.stringify(message_info.receive_seq),
        receive_names: JSON.stringify(message_info.receive_names),
        desc: message_info.desc,
        reservation_datetime: message_info.reservation_datetime
      }
      const group_message_seq = await groupmsgModel.sendMessage(params)

      for (let cnt = 0; cnt < message_info.receive_seq.length; cnt++) {
        const param = {
          group_seq: message_info.send_seq,
          send_seq: member_seq,
          receive_seq: message_info.receive_seq[cnt],
          desc: message_info.desc,
          group_message_seq: group_message_seq,
        }
        await MessageService.sendMessage(database, message_info.send_seq, param)
      }

      return group_message_seq
    } catch (e) {
      throw e
    }
  }

  updateGroupViewCount = async (database, group_message_seq, member_seq) => {
    const groupmsgModel = this.getGroupMessageModel(database)
    return groupmsgModel.updateGroupViewCount(group_message_seq, member_seq)
  }

  deleteGroupMessage = async (database, message_seq) => {
    try {
      const groupmsgModel = this.getGroupMessageModel(database)
      const result = await groupmsgModel.delMessage(message_seq)
      return result
    } catch (e) {
      throw e
    }
  }

  getReceiveAllCountWithMemberSeq = async (database, member_seq) => {
    try {
      const msgModel = this.getMessageModel(database)
      return await msgModel.getReceiveAllCountWithMemberSeq(member_seq)
    } catch (e) {
      throw e
    }
  }

}

const MessageService = new MessageServiceClass()

export default MessageService
