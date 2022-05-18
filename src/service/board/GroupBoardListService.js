import _ from 'lodash'
import StdObject from '../../wrapper/std-object'
import Util from '../../utils/Util'
import ServiceConfig from '../service-config'
import DBMySQL from "../../database/knex-mysql";
import GroupBoardListModel from "../../database/mysql/board/GroupBoardListModel";

const GroupBoardListServiceClass = class {
  constructor () {
    this.log_prefix = '[GroupBoardListService]'
  }

  getGroupBoardModel = (database) => {
    if (database) {
      return new GroupBoardListModel(database)
    }
    return new GroupBoardListModel(DBMySQL)
  }

  getGroupBoardList = async (database, group_seq) => {
    const model = this.getGroupBoardModel(database)
    return await model.getGroupBoardList(group_seq)
  }

  getGroupBoardLastUpdate = async (database, group_seq) => {
    const model = this.getGroupBoardModel(database)
    const query_result = await model.getGroupBoardLastUpdate(group_seq)
    return query_result ? query_result.modify_date : null
  }

  getGroupBoardListOne = async (database, group_seq, board_seq) => {
    const model = this.getGroupBoardModel(database)
    return await model.getGroupBoardListOne(group_seq, board_seq)
  }

  getBoardListCount = async (database, group_seq) => {
    const model = this.getGroupBoardModel(database)
    return await model.getBoardListCount(group_seq)
  }

  createDefaultGroupBoard = async (database, group_seq) => {
    const model = this.getGroupBoardModel(database)

    const board_info = {
      group_seq,
      board_name: 'Note',
      sort: 0,
    }

    return await model.createGroupBoard(board_info)
  }

  createGroupBoard = async (database, board_info) => {
    const model = this.getGroupBoardModel(database)

    if (board_info.seq) delete board_info.seq
    if (board_info.change_bool) delete board_info.change_bool
    if (board_info.header_list && typeof board_info.header_list === 'object') {
      board_info.header_list = JSON.stringify(board_info.header_list)
    }
    if (board_info.access_list && typeof board_info.access_list === 'object') {
      board_info.access_list = JSON.stringify(board_info.access_list)
    }

    if (board_info.reg_date) delete board_info.reg_date
    if (board_info.modify_date) delete board_info.modify_date

    return await model.createGroupBoard(board_info)
  }

  updateGroupBoard = async (database, board_info) => {
    const model = this.getGroupBoardModel(database)
    const seq = board_info.seq.toString()

    if (board_info.seq) delete board_info.seq
    if (board_info.change_bool) delete board_info.change_bool
    if (board_info.header_list && typeof board_info.header_list === 'object') {
      board_info.header_list = JSON.stringify(board_info.header_list)
    }
    if (board_info.access_list && typeof board_info.access_list === 'object') {
      board_info.access_list = JSON.stringify(board_info.access_list)
    }

    board_info.modify_date = database.raw('NOW()')

    return await model.updateGroupBoard(seq, board_info)
  }

  delGroupBoardList = async (database, group_seq, menu_seq) => {
    const model = this.getGroupBoardModel(database)
    return await model.delGroupBoardList(group_seq, menu_seq)
  }
}

const GroupBoardListService = new GroupBoardListServiceClass()

export default GroupBoardListService
