import Role from '../constants/roles'
import Util from '../utils/Util'

export default class TokenInfo {
  constructor (token_info, token, expire_time) {
    this.group_seq = null
    this.machine_id = null
    this.service_domain = null
    if (token_info != null) {
      this.id = Util.parseInt(token_info.id) // member table seq
      this.role = Util.parseInt(token_info.role, Role.NONE) // 권한 코드. 나중에 쓸지도 모름.
      this.token = token
      this.expire_time = expire_time
      if (Util.isNumber(token_info.group_seq)) {
        this.group_seq = Util.parseInt(token_info.group_seq, 0) // group seq
      }
      if (token_info.machine_id) {
        this.machine_id = token_info.machine_id // machine id
      }
    }
  }

  toJSON = () => {
    const token_info = {
      id: this.id,
      role: this.role,
      expire_time: this.expire_time
    }
    if (Util.isNumber(this.group_seq)) {
      token_info.group_seq = this.group_seq
    }
    if (this.machine_id) {
      token_info.machine_id = this.machine_id
    }
    if (this.service_domain) {
      token_info.service_domain = this.service_domain
    }
    if (this.token) {
      token_info.token = this.token
    }

    return token_info
  }

  setTokenByMemberInfo (member_info) {
    this.id = Util.parseInt(member_info.seq, 0) // member table seq
    this.role = Util.parseInt(member_info.role, Role.NONE) // 권한 코드. 나중에 쓸지도 모름.
    if (Util.isNumber(member_info.group_seq)) {
      this.group_seq = Util.parseInt(member_info.group_seq, 0) // group seq
    }
    if (member_info.machine_id) {
      this.machine_id = member_info.machine_id // machine id
    }
  }

  getId () {
    return this.id
  }

  getRole () {
    return this.role
  }

  getToken () {
    return this.token
  }

  getExpireTime () {
    return this.expire_time
  }

  isAdmin = () => {
    return this.getRole() === Role.ADMIN
  }

  isMember = () => {
    return this.getRole() === Role.MEMBER
  }

  getLang = () => {
    return this.lang
  }
  setLang = (lang) => {
    this.lang = lang
  }

  getGroupSeq = () => {
    return this.group_seq
  }
  setGroupSeq = (group_seq) => {
    this.group_seq = group_seq
  }

  getMachineId = () => {
    return this.machine_id
  }
  setMachineId = (machine_id) => {
    this.machine_id = machine_id
  }

  getServiceDomain = () => {
    return this.service_domain
  }
  setServiceDomain = (service_domain) => {
    this.service_domain = service_domain
  }
}
