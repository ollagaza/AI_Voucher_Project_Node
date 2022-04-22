import { Router } from 'express'
import Wrap from '../../utils/express-async'
import Util from '../../utils/baseutil'
import StdObject from '../../wrapper/std-object'
import MemberService from "../../service/member/MemberService"
import MemberLogService from "../../service/member/MemberLogService"
import Auth from '../../middlewares/auth.middleware'
import Role from '../../constants/roles'
import DBMySQL from '../../database/knex-mysql'

const routes = Router()

routes.get('/verify/:user_id', async (req, res) => {
  const user_id = req.params.user_id;
  const result = await MemberService.verify(user_id);
  res.json(result);
});

routes.post('/createuser', async (req, res) => {
  const request_body = req.body ? req.body : null;
  let result = null;
  if (request_body.user_id) {
    result = await MemberService.createUser(request_body);
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

routes.post('/:member_seq(\\d+)/updateUser', async (req, res) => {
  const member_seq = Util.parseInt(req.params.member_seq)
  if (member_seq < 0) {
    const out = new StdObject(-1, '잘못된 사용자 입니다.', 404);
    MemberLogService.createMemberLog(req, result.seq, '9998', '잘못된 사용자 입니다.');
    res.json(out);
    return;
  }
  const request_body = req.body ? req.body : null;
  let result = null;
  if (request_body.user_id) {
    result = await MemberService.updateUser(member_seq, request_body);
    MemberLogService.createMemberLog(req, member_seq, '1002', result.message);
    res.json(result);
  } else {
    const out = new StdObject(-1, '등록된 값이 없습니다.', 404);
    res.json(out);
  }
});

routes.get('/:member_seq(\\d+)/data', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const token_info = req.token_info
  const member_seq = Util.parseInt(req.params.member_seq)
  if (!MemberService.checkMyToken(token_info, member_seq)) {
    throw new StdObject(-1, '잘못된 요청입니다.', 403)
  }

  // const user_data = await MemberService.getMemberMetadata(member_seq)
  const user_data = {data:"data"}
  const output = new StdObject()
  output.add('user_data', user_data)
  res.json(output)
}))

routes.get('/me', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const lang = Auth.getLanguage(req)
  const token_info = req.token_info
  const member_seq = token_info.getId()
  const group_seq = token_info.getGroupSeq()
  const member_info = await MemberService.getMemberInfoWithSub(DBMySQL, member_seq, lang)

  const output = new StdObject()
  output.add('member_info', member_info.member_info)
  output.add('member_sub_info', member_info.member_sub_info)

  res.json(output)
}))

routes.post('/find/id', Wrap(async (req, res) => {
  req.accepts('application/json')

  const output = await MemberService.findMemberId(DBMySQL, req.body)
  res.json(output)
}))

routes.post('/send_auth_code', Wrap(async (req, res) => {
  req.accepts('application/json')

  const output = await MemberService.sendAuthCode(DBMySQL, req.body)
  res.json(output)
}))

routes.post('/reset_password', Wrap(async (req, res) => {
  req.accepts('application/json')

  const output = await MemberService.resetPassword(DBMySQL, req.body)
  res.json(output)
}))

routes.post('/check_auth_code', Wrap(async (req, res) => {
  req.accepts('application/json')

  const output = await MemberService.checkAuthCode(DBMySQL, req.body)
  res.json(output)
}))

routes.post('/changePassword/:member_seq', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')

  const token_info = req.token_info
  const member_seq = Util.parseInt(req.params.member_seq)

  if (!MemberService.checkMyToken(token_info, member_seq)) {
    throw new StdObject(-1, '잘못된 요청입니다.', 403)
  }
  const output = new StdObject()
  const is_change = await MemberService.changePassword(DBMySQL, member_seq, req.body, token_info.isAdmin())
  output.add('is_change', is_change)
  res.json(output)
}))


export default routes
