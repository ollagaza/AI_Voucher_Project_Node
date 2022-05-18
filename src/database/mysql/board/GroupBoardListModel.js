import MySQLModel from '../../mysql-model'
import log from '../../../libs/logger'
import Util from "../../../utils/Util";

export default class GroupBoardListModel extends MySQLModel {
  constructor (...args) {
    super(...args)

    this.table_name = 'group_board_list'
    this.log_prefix = '[GroupBoardListModel]'
    this.selectable_fields = ['*']
  }

  getGroupBoardList = async (group_seq) => {
    return this.find({ group_seq }, this.selectable_fields, { name: 'sort', direction: 'asc' })
  }

  getGroupBoardLastUpdate = async (group_seq) => {
    return await this.findOne({ group_seq }, ['modify_date'], {
      name: 'modify_date',
      direction: 'desc'
    })
  }

  getGroupBoardListOne = async (group_seq, board_seq) => {
    return this.findOne({ group_seq, seq: board_seq }, this.selectable_fields, { name: 'sort', direction: 'asc' })
  }

  getBoardListCount = async (group_seq) => {
    return this.getTotalCount({ group_seq })
  }

  createGroupBoard = async (board_info) => {
    return this.create(board_info, 'seq')
  }

  updateGroupBoard = async (board_seq, board_info) => {
    return this.update({ seq: board_seq }, board_info)
  }

  delGroupBoardList = async (group_seq, menu_seq) => {
    return this.delete( { seq: menu_seq, group_seq })
  }
}
