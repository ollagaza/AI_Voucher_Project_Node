import DBMySQL from '../../database/knex-mysql'
import InstantMessageModel from "../../database/mysql/mypage/InstantMessageModel";

const InstantMessageServiceClass = class {
  constructor() {
    this.log_prefix = '[InstantMessageService]'
  }

  getInstantMessageModel = (database = null) => {
    if (database) {
      return new InstantMessageModel(database)
    } else {
      return new InstantMessageModel(DBMySQL)
    }
  }

  createInstantMessage = async (database, member_seq, group_seq = null, message) => {
    const instantMessageModel = this.getInstantMessageModel(database);
    const message_info = {
      member_seq: member_seq,
      group_seq: group_seq,
      message: message,
      type: 'OneMessage'
    }
    return await instantMessageModel.createInstantMessage(message_info);
  }

  getInstantMessageList = async (database, member_seq, group_seq = null) => {
    const instantMessageModel = this.getInstantMessageModel(database);
    return await instantMessageModel.getInstantMessage(member_seq, group_seq);
  }

  deleteInstantMessageList = async (database, message_seq_list) => {
    const instantMessageModel = this.getInstantMessageModel(database);
    return await instantMessageModel.deleteInstantMessageListBySeq(message_seq_list);
  }
}

const InstantMessageService = new InstantMessageServiceClass()

export default InstantMessageService
