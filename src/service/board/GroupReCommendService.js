import _ from 'lodash'
import StdObject from '../../wrapper/std-object'
import ServiceConfig from '../service-config'
import DBMySQL from "../../database/knex-mysql";
import Util from "../../utils/Util";
import GroupBoardReCommendModel from "../../database/mysql/board/GroupBoardReCommendModel";
import GroupBoardCommentReCommendModel from "../../database/mysql/board/GroupBoardCommentReCommendModel";

const GroupReCommendServiceClass = class {
  constructor() {
    this.log_prefix = '[GroupBoardDataService]'
  }

  getGroupBoardReCommendModel = (database) => {
    if (database) {
      return new GroupBoardReCommendModel(database)
    }
    return new GroupBoardReCommendModel(DBMySQL)
  }

  getGroupBoardCommentReCommendModel = (database) => {
    if (database) {
      return new GroupBoardCommentReCommendModel(database)
    }
    return new GroupBoardCommentReCommendModel(DBMySQL)
  }

  getBoardRecommend = async (database, board_data_seq, member_seq) => {
    const model = this.getGroupBoardReCommendModel(database)
    return await model.getBoardRecommend(board_data_seq, member_seq)
  }

  getBoardCommentRecommend = async (database, board_data_seq, member_seq) => {
    const model = this.getGroupBoardCommentReCommendModel(database)
    return await model.getBoardCommentRecommend(board_data_seq, member_seq)
  }

  getBoardCommentRecommendOne = async (database, comment_seq, board_data_seq, member_seq) => {
    const model = this.getGroupBoardCommentReCommendModel(database)
    return await model.getBoardCommentRecommendOne(comment_seq, board_data_seq, member_seq)
  }

  createBoardRecommend = async (database, recommend_data) => {
    const model = this.getGroupBoardReCommendModel(database)
    return await model.createBoardReCommend(recommend_data)
  }

  createBoardCommentReCommend = async (database, recommend_data) => {
    const model = this.getGroupBoardCommentReCommendModel(database)
    return await model.createBoardCommentReCommend(recommend_data)
  }

  deleteBoardRecommend = async (database, recommend_seq) => {
    const model = this.getGroupBoardReCommendModel(database)
    return await model.deleteBoardReCommend(recommend_seq)
  }

  deleteBoardCommentRecommend = async (database, recommend_seq) => {
    const model = this.getGroupBoardCommentReCommendModel(database)
    return await model.deleteBoardCommentReCommend(recommend_seq)
  }

  setMoveBoardDataToReCommend = async (database, board_data_seq, board_seq) => {
    const board_coment_recoment_model = this.getGroupBoardCommentReCommendModel(database)
    const board_recoment_model = this.getGroupBoardReCommendModel(database)
    await board_recoment_model.setMoveBoardDataToBoardReComment(board_data_seq, board_seq)
    return await board_coment_recoment_model.setMoveBoardDataToReComment(board_data_seq, board_seq)
  }
}

const GroupReCommendService = new GroupReCommendServiceClass()

export default GroupReCommendService
