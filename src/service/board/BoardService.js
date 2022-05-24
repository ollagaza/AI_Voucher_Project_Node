import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql'
import BoardModel from '../../database/mysql/board/BoardModel'
import Util from '../../utils/baseutil'
import ServiceConfig from '../../service/service-config'
import JsonWrapper from '../../wrapper/json-wrapper'
import logger from '../../libs/logger'

const BoardServiceClass = class {
  constructor() {

  }
  getBoardModel = (database = null) => {
    if (database) {
      return new BoardModel(database)
    }
    return new BoardModel(DBMySQL)
  }

  getBoardInfoById = async (database, board_seq) => {
    const board_model = this.getBoardModel(database)
    return await board_model.getBoardInfoById(board_seq)
  }

  createBoard = async (req_body) => {
    const board_model = this.getBoardModel(DBMySQL)
    const result = await board_model.createBoard(req_body);
    return result;
  }

  updateBoard = async (member_seq, req_body) => {
    // logger.debug(req_body);
    const board_model = this.getBoardModel(DBMySQL)
    const result = await board_model.updateBooard(board_seq, req_body);
    return result;
  }

  updateStauts = async (database, board_seq, req_body) => {
    const board_model = this.getBoardModel(database)
    const result = await board_model.updateStuats(board_seq, req_body);
    return result;
  }

  getBoardInfo = async (database, board_seq) => {
    const { board_info } = await this.getBoardInfoWithModel(database, board_seq)
    return board_info
  }

  getBoardStateError = (board_info) => {
    const output = new StdObject()
    if (!this.isActiveMember(member_info)) {
      output.error = -1
      output.message = '등록된 회원이 아닙니다.'
      output.httpStatusCode = 403
    } else if (member_info.used === 0) {
      output.error = -2
      output.message = '회원가입 승인이 완료되지 않았습니다.'
      output.httpStatusCode = 403
    } else if (member_info.used === 2) {
      output.error = -3
      output.message = '탈퇴처리된 계정입니다.'
      output.httpStatusCode = 403
    } else if (member_info.used === 3) {
      output.error = -4
      output.message = '휴면처리된 계정입니다.'
      output.httpStatusCode = 403
    } else if (member_info.used === 4) {
      output.error = -5
      output.message = '사용중지된 계정입니다.'
      output.httpStatusCode = 403
    } else if (member_info.used === 5) {
      output.error = -6
      output.message = '사용제제된 계정입니다.'
      output.httpStatusCode = 403
    }
    return output
  }


  getBoardInfoWithModel = async (database, board_seq) => {
    const board_model = this.getBoardModel(database)
    const board_info = await board_model.getBoardInfo(board_seq)
    if (board_info.isEmpty() || !board_info.seq) {
      throw new StdObject(-1, '게시물정보가 존재하지 않습니다.', 400)
    }

    return {
      board_model,
      board_info
    }
  }

  BoardCount = async (database) => {
    const board_model = this.getBoardModel(database)
    const result = await board_model.getMembercount();
    logger.debug(result);
    return result;
  }

  getBoardList = async (database, req, board_code, search_keyword) => {
    const board_model = this.getBoardModel(database)

    const request_query = req.query ? req.query : {}
    const page = Util.parseInt(request_query.page, 1)
    const limit = Util.parseInt(request_query.limit, 20)

    const search_options = {
      page,
      limit,
    }
    const board_info = await board_model.getBoardList(search_options, board_code, search_keyword)

    return board_info
  }

  updateStatus = async (database, req_body) => {
    const arr_board_seq = req_body.params.boards;
    const used = req_body.params.boards;
    // _logger2.default.debug('updateUsersUsed 1', req_body.params.used, used);
    // let reason = req_body.params.reason;
    const params = {};
    params.used = used;
    // if (reason === undefined) {
    //   reason = '';
    // }
    // params.reason = reason;

    const board_model = this.getBoardModel(database);
    const result = await board_model.updateStatus(params, arr_board_seq);

    return result;
  };
}


const board_service = new BoardServiceClass()

export default board_service
