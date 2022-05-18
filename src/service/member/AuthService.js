import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql'
import ServiceConfig from '../../service/service-config'
import MemberService from '../../service/member/MemberService'
import Auth from '../../middlewares/auth.middleware'
import Role from '../../constants/roles'
// import log from '../../libs/logger'
import logger from "../../libs/logger";


const AuthServiceClass = class {
  constructor() {
    this.log_prefix = '[AuthServiceClass]'
  }

  login = async (database, req) => {
    const result = new StdObject()
    const req_body = req.body
    if (!req_body || !req_body.user_id || !req_body.password) {
      throw new StdObject(-1, '아이디 비밀번호를 확인해 주세요...', 400)
    }
    const user_id = req_body.user_id
    const password = req_body.password
    const admin = req_body.admin

    const member_info = await MemberService.getMemberInfoById(database, user_id)
    if (member_info == null || member_info.user_id !== user_id) {
      throw new StdObject(-1, '등록된 회원 정보가 없습니다.', 400)
    }
    await MemberService.checkPassword(database, member_info, req_body.password, true)
    // await MemberService.updateLastLogin(DBMySQL, member_info.seq);
    switch (member_info.used) {
      case 0:
        if (member_info.user_type === 'P') {
          throw new StdObject(-101.1, '회원 가입 승인이 완료되지 않았습니다.  승인이 완료되어야 로그인이 가능합니다.', 400)
        }
      case 2:
        throw new StdObject(-102, '관리자에 의하여 강제 탈퇴 되었습니다.', 400)
      case 3:
        throw new StdObject(-103, '탈퇴한 회원입니다.', 400)
      case 4:
        throw new StdObject(-104, '현재 휴면 상태 입니다.', 400)
      case 5:
        throw new StdObject(-105, '현재 사용 중지 중입니다.', 400)
      case 6:
        throw new StdObject(-106, '회원 가입 승인이 거절 되었습니다.<br/>상세한 사항은 이메일을 확인 하여 주시기 바랍니다.', 400)
      default:
        break
    }
    // logger.debug(member_info);
    return member_info;
  }

  authByToken = async (req, res) => {
    const result = new StdObject()

    const auth_token_info = req.token_info
    const member_seq = auth_token_info.getId()

    const member_info = await MemberService.getMemberInfo(DBMySQL, member_seq)
    if (member_info && member_info.seq) {
      const token_info = await Auth.getTokenResult(req, res, member_info, member_info.used_admin !== 'A' ? Role.MEMBER : Role.ADMIN)
      if (token_info.error === 0) {
        result.add('is_verify', true)
        result.add('member_info', member_info)
        result.adds(token_info.variables)
      }
    }

    return result
  }

  authByCookie = async (req, res) => {
    const result = new StdObject()
    const verify_result = Auth.verifyRefreshToken(req)
    if (verify_result.is_verify) {
      const member_info = await MemberService.getMemberInfo(null, verify_result.id)
      if (member_info && member_info.seq) {
        const token_info = await Auth.getTokenResult(req, res, member_info, Role.MEMBER)
        logger.debug(this.log_prefix, '[authByCookie]', 'token_info', token_info.toJSON())
        if (token_info.error === 0) {
          result.add('is_verify', verify_result.is_verify)
          result.add('member_info', member_info)
          result.adds(token_info.variables)
        }
      }
    }
    logger.debug(this.log_prefix, '[authByCookie]', result.toJSON())
    return result
  }
}

const auth_service = new AuthServiceClass()

export default auth_service

