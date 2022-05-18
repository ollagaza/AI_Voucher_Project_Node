import MySQLModel from '../../mysql-model'
import log from '../../../libs/logger'
import logger from "../../../libs/logger";

export default class GroupBoardReCommendModel extends MySQLModel {
  constructor(...args) {
    super(...args)

    this.table_name = 'board_recommend'
    this.log_prefix = '[GroupBoardReCommendModel]'
    this.selectable_fields = ['*']
  }

  getBoardRecommend = async (board_data_seq, member_seq) => {
    return await this.findOne({ board_data_seq, member_seq })
  }

  createBoardReCommend = async (recommend_data) => {
    return await this.create(recommend_data);
  }

  deleteBoardReCommend = async (recommend_seq) => {
    return await this.delete({ seq: recommend_seq })
  }

  setMoveBoardDataToBoardReComment = async (board_data_seq, board_seq) => {
    const params = {
      board_seq,
    }
    const filter = {
      board_data_seq,
    }
    return this.update(filter, params);
  }
}
