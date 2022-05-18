import MySQLModel from '../../mysql-model'
import log from '../../../libs/logger'
import logger from "../../../libs/logger";

export default class GroupBoardCommentReCommendModel extends MySQLModel {
  constructor(...args) {
    super(...args)

    this.table_name = 'board_comment_recommend'
    this.log_prefix = '[GroupBoardCommentReCommendModel]'
    this.selectable_fields = ['*']
  }

  getBoardCommentRecommend = async (board_data_seq, member_seq) => {
    return await this.find({ board_data_seq, member_seq })
  }

  getBoardCommentRecommendOne = async (board_comment_seq, board_data_seq, member_seq) => {
    return await this.findOne({ member_seq, board_data_seq, board_comment_seq })
  }

  createBoardCommentReCommend = async (recommend_data) => {
    return await this.create(recommend_data);
  }

  deleteBoardCommentReCommend = async (recommend_seq) => {
    return await this.delete({ seq: recommend_seq })
  }

  setMoveBoardDataToReComment = async (board_data_seq, board_seq) => {
    const params = {
      board_seq,
    }
    const filter = {
      board_data_seq,
    }
    return this.update(filter, params);
  }
}
