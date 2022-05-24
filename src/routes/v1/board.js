import { Router } from 'express'
import Wrap from '../../utils/express-async'
import Util from '../../utils/baseutil'
import StdObject from '../../wrapper/std-object'
import BoardService from "../../service/board/BoardService"
import MemberLogService from "../../service/member/MemberLogService"
import Auth from '../../middlewares/auth.middleware'
import Role from '../../constants/roles'
import DBMySQL from '../../database/knex-mysql'

const routes = Router()

routes.post('/create', Auth.isAuthenticated(Role.ADMIN), async (req, res) => {
  const request_body = req.body ? req.body : null;
  let result = null;
  if (request_body.user_id) {
    result = await BoardService.createUser(request_body);
    if (result.error === 0){
      MemberLogService.createMemberLog(req, result.seq, '1001', 'ok');
    } else {
      MemberLogService.createMemberLog(req, result.seq, '9998', result.message);
    }
    res.json(result);
  } else {
    const out = new StdObject(-1, '등록된 값이 없습니다.', 404);
    res.json(out);
  }
});

routes.post('/:board_seq(\\d+)/update', Auth.isAuthenticated(Role.ADMIN), async (req, res) => {
  const board_seq = Util.parseInt(req.params.board_seq)
  if (board_seq < 0) {
    const out = new StdObject(-1, '잘못된 게시물 입니다.', 404);
    MemberLogService.createMemberLog(req, result.seq, '9998', '잘못된 게시물 입니다.');
    res.json(out);
    return;
  }
  const request_body = req.body ? req.body : null;
  let result = null;
  if (request_body.user_id) {
    result = await BoardService.updateUser(board_seq, request_body);
    MemberLogService.createMemberLog(req, board_seq, '1002', result.message);
    res.json(result);
  } else {
    const out = new StdObject(-1, '등록된 값이 없습니다.', 404);
    res.json(out);
  }
});

routes.get('/list', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const token_info = req.token_info
  const board_code = req.query.board_code
  const search_keyword = req.query.search_keyword
  const board_info = await BoardService.getBoardList(DBMySQL, req, board_code, search_keyword)

  const output = new StdObject()
  output.adds(board_info)
  res.json(output)
}))

routes.get('/:board_seq(\\d+)/data', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const token_info = req.token_info
  const board_seq = Util.parseInt(req.params.board_seq)
  if (!BoardService.checkMyToken(token_info, board_seq)) {
    throw new StdObject(-1, '잘못된 요청입니다.', 403)
  }

  const board_data = await BoardService.getMemberInfoWithModel(DBMySQL, board_seq)
  // const user_data = {data:"data"}
  const output = new StdObject()
  output.add('board_data', board_data.board_info)
  res.json(output)
}))


routes.post('/setstatus',  Auth.isAuthenticated(Role.ADMIN), Wrap(async (req, res) => {
  req.accepts('application/json')

  const req_body = req.body ? req.body : {};
  const output = new StdObject(0, 'data', 200);
  const result = await BoardService.updateStatus(DBMySQL, req_body);

  const token_info = req.token_info
  const mod_member_seq = token_info.id

  let seq = ''
  for (const key of Object.keys(req.body.params.boards)) {
    seq += `${req.body.params.boards[key]}/`;
  }
  seq += `board change=${req.body.params.used}`

  MemberLogService.createMemberLog(req, mod_member_seq, '1002', `${ seq }`);

  if (result.error !== 0){
    output.error = result.error
    output.message = result.message
  }
  res.json(output)
}));



export default routes
