import jwt from 'jsonwebtoken'
import StdObject from '../wrapper/std-object'
import TokenInfo from '../wrapper/token-info'
import Role from '../constants/roles'
import Config from '../config/config'
import Constants from '../constants/constants'
import Util from '../utils/Util'
import logger from '../libs/logger'

const IS_DEV = Config.isDev()

const TOKEN_SECRET = Constants.TOKEN_SECRET
const HOUR = 60 * 60
const LOG_PREFIX = '[auth.middleware]'

const setResponseHeader = (res, token_info) => {
  if (!res || !token_info) {
    return
  }
  res.setHeader('authorization', 'Bearer ' + token_info.getToken())
  res.setHeader('auth-expire', '' + token_info.getExpireTime())
  res.setHeader('auth-role', '' + token_info.getRole())
}

const getToken = (req) => {
  // log.debug('req.headers.authorization')
  // log.debug(req.headers)
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    return req.headers.authorization.split(' ')[1]
  } else if (req.query && req.query.access_token) {
    return req.query.access_token
  }
  return null
}

const getSecret = (request, timestamp) => {
  const agent = Util.trim(request.headers && request.headers['user-agent'] ? request.headers['user-agent'] : 'aivoucher')
  const timestamp_str = `${timestamp}`.toString()
  const last_number = Util.parseInt(timestamp_str[timestamp_str.length - 1])
  const secret = Util.hash(timestamp_str.slice(-5) +  agent.toString()).substr(last_number, 10)
  logger.debug(LOG_PREFIX, '[getSecret]', agent, timestamp_str, last_number, secret)
  return secret
}
const generateTokenByMemberInfo = (request, member_info, un_limit = false) => {
  const expire = Util.getCurrentTimestamp() + (un_limit ? Number.MAX_VALUE : 24 * HOUR)
  const token_info = new TokenInfo()
  token_info.setTokenByMemberInfo(member_info)

  const token = jwt.sign({ 'info': token_info }, TOKEN_SECRET, {
    algorithm: 'HS256',
    expiresIn: expire
  })

  token_info.token = token

  const timestamp = Util.getCurrentTimestamp()
  const secret = getSecret(request, timestamp)
  const refresh_token = Util.encrypt({ id: token_info.getId(), t: timestamp, a: request.headers['user-agent'] })
  logger.debug('generateTokenByMemberInfo',  refresh_token, secret)

  return {
    'token_info': token_info,
    'token': token,
    'expire': expire,
    refresh_token,
    secret
  }
}

const isAuthenticated = (require_roles) => {
  return async (req, res, next) => {
    // log.debug('isAuthenticated')
    // log.debug(req)
    // log.debug('res')
    // log.debug(res)
    const token = getToken(req)
    if (!token && (require_roles == null || require_roles === Role.ALL)) {
      return next()
    }

    const verify_result = await verifyToken(req, require_roles)
    // log.debug(verify_result)
    if (verify_result.isSuccess()) {
      const token_info = verify_result.get('token_info')
      token_info.setLang(getLanguage(req))
      const group_seq = getGroupSeq(req)
      if (group_seq) {
        token_info.setGroupSeq(group_seq)
      }
      token_info.setServiceDomain(getServiceDomain(req))
      req.token_info = token_info

      next()
    } else {
      return res.status(verify_result.httpStatusCode).send(verify_result)
    }
    // log.debug('isAuthenticated end')
  }
}

const verifyToken = async (req, require_roles = null) => {
  const token = getToken(req)
  return await verifyTokenByString(token, require_roles)
}

const verifyTokenByString = async (token, require_roles = null) => {
  if (!token) {
    return new StdObject(-1, '로그인 후 이용 가능합니다.', 401)
  }

  const output = new StdObject(-1, '', 403)
  try {
    const verify_result = await jwt.verify(token, TOKEN_SECRET)
    const expire = verify_result.exp * 1000
    const now = Date.now()
    const remain_time = Math.floor((expire - now) / 1000)

    const token_info = verify_result.info
    const role = token_info.role

    if (remain_time <= 0) {
      if (IS_DEV) {
        output.stack = { 'tokenExp': expire, 'now': now }
        output.setMessage('토큰 유효기간 만료')
      }
      return output
    }

    if (remain_time <= 0) {
      if (IS_DEV) {
        output.stack = { 'tokenExp': expire, 'now': now }
        output.setMessage('토큰 유효기간 만료')
      }
      return output
    }

    let has_role = true
    if (require_roles != null) {
      if (Array.isArray(require_roles)) {
        has_role = require_roles.find(require_role => require_role === role)
      } else {
        has_role = role >= require_roles
      }

      if (!has_role) {
        output.setMessage('사용 권한이 없습니다.')
        if (IS_DEV) {
          output.stack = { 'userRole': role, 'roles': require_roles }
        }
        return output
      }
    }

    output.error = 0
    output.httpStatusCode = 200
    output.add('token_info', new TokenInfo(token_info, token, remain_time))
  } catch (error) {
    output.error = -1
    output.httpStatusCode = 403
    if (IS_DEV) {
      output.stack = error
      output.setMessage(error.message)
    }
  }

  return output
}

const verifyRefreshToken = (request) => {
  const result = {
    is_verify: false,
    id: null
  }
  const cookies = request && request.cookies ? request.cookies : null
  logger.debug(LOG_PREFIX, 1, cookies)
  if (!cookies) {
    return result
  }
  const refresh_token = Util.trim(cookies.refresh_token)
  const secret = Util.trim(cookies.secret)
  logger.debug(LOG_PREFIX, 2, refresh_token, secret)
  if (!refresh_token || !secret) {
    return result
  }
  let refresh_token_info = Util.decrypt(refresh_token)
  logger.debug(LOG_PREFIX, 3, refresh_token_info)
  if (!refresh_token_info) {
    return result
  }
  refresh_token_info = JSON.parse(refresh_token_info)
  const id = refresh_token_info.id
  const timestamp = refresh_token_info.t
  logger.debug(LOG_PREFIX, 4, refresh_token_info, request.headers['user-agent'], getSecret(request, timestamp), getSecret(request, timestamp) === secret)
  if (id && getSecret(request, timestamp) === secret) {
    result.is_verify = true
    result.id = id
  }

  return result
}

const getTokenResult = async (req, res, member_info, role, un_limit = false) => {

  member_info.role = role

  const token_result = generateTokenByMemberInfo(req, member_info, un_limit)
  const output = new StdObject()
  if (token_result != null && token_result.token != null) {
    output.add('token', token_result.token)
    output.add('refresh_token', token_result.refresh_token)
    output.add('secret', token_result.secret)
    output.add('expire', token_result.expire)
    output.add('member_seq', member_info.seq)
    output.add('role', token_result.token_info.getRole())
    setResponseHeader(res, token_result.token_info)

    // console.log(token_result.token_info);
  } else {
    output.setError(-1)
    output.setMessage('인증토큰 생성 실패')
    output.httpStatusCode = 500
  }

  return output
}

const getLanguage = (req) => {
  let lang = req.headers.lang

  if (lang === undefined || lang === '') {
    lang = 'kor'
  }

  return lang
}

const getGroupSeq = (req) => {
  return Util.parseInt(req.headers.group_seq, 0)
}

const getServiceDomain = (req) => {
  return req.headers.service_domain
}

const getTokenByRole = async (request, info, role) => {
  info.role = role
  const token_result = generateTokenByMemberInfo(request, info, true)

  const output = new StdObject()
  if (token_result.token !== null) {
    output.add('token', `Bearer ${token_result.token}`)
    output.add('expire', token_result.expire)
  } else {
    output.setError(-1)
    output.setMessage('인증토큰 생성 실패')
    output.httpStatusCode = 500
  }

  return output
}

const getMachineTokenResult = async (machine_info) => {
  // logger.debug('getMachineTokenResult');
  machine_info.role = Role.BOX
  const token_result = await generateTokenByMemberInfo(machine_info, true)

  const output = new StdObject()
  if (token_result != null && token_result.token != null) {
    output.add('token', `Bearer ${token_result.token}`)
    output.add('expire', token_result.expire)
    output.add('group_seq', machine_info.group_seq)
  } else {
    output.setError(-1)
    output.setMessage('인증토큰 생성 실패')
    output.httpStatusCode = 500
  }

  return output
}

export default {
  'setResponseHeader': setResponseHeader,
  'generateTokenByMemberInfo': generateTokenByMemberInfo,
  'isAuthenticated': isAuthenticated,
  'verifyToken': verifyToken,
  'verifyTokenByString': verifyTokenByString,
  'verifyRefreshToken': verifyRefreshToken,
  'getTokenResult': getTokenResult,
  'getMachineTokenResult': getMachineTokenResult,
  'getTokenByRole': getTokenByRole,
  'getLanguage': getLanguage,
  'getGroupSeq': getGroupSeq
}
