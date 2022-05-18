import Util from '../../utils/Util'
import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql'
import log from '../../libs/logger'
import OperationLinkModel from '../../database/mysql/operation/OperationLinkModel'
import OperationService from './OperationService'
// import GroupService from '../group/GroupService'
import OperationMailTemplate from '../../template/mail/operation.template'
import SendMail from '../../libs/send-mail'

const OperationLinkServiceClass = class {
  constructor () {
    this.log_prefix = '[OperationLinkService]'
    this.TYPE_STATIC = 'static'
    this.TYPE_EMAIL = 'email'
    this.LINK_TYPE_EDIT = 'A'
    this.LINK_TYPE_VIEW = 'V'
    this.LINK_TYPE_EMAIL = 'E'
    this.AUTH_WRITE = 'W'
    this.AUTH_READ = 'R'
  }

  getOperationLinkModel = (database = null) => {
    if (database) {
      return new OperationLinkModel(database)
    }
    return new OperationLinkModel(DBMySQL)
  }

  getOperationLink = async (database, operation_seq, link_type, share_email) => {
    const operation_link_model = this.getOperationLinkModel(database)
    return await operation_link_model.getLinkInfoByOperation(operation_seq, link_type, share_email)
  }

  getOperationLinkList = async (database, operation_seq, type) => {
    const operation_link_model = this.getOperationLinkModel(database)
    let link_info_list = []
    if (type === this.TYPE_EMAIL) {
      link_info_list = await operation_link_model.getEmailLinkListByOperation(operation_seq)
    } else if (type === this.TYPE_STATIC) {
      link_info_list = await operation_link_model.getStaticLinkListByOperation(operation_seq)
    }
    return link_info_list
  }

  getOperationLinkBySeq = async (database, link_seq) => {
    const operation_link_model = this.getOperationLinkModel(database)
    return await operation_link_model.getLinkInfoBySeq(link_seq)
  }

  getOperationLinkByCode = async (database, link_code) => {
    let link_info = Util.decrypt(link_code)
    if (!link_info) {
      throw new StdObject(-1, '사용할 수 없는 링크입니다.', 400)
    }
    link_info = JSON.parse(link_info)
    if (!link_info || !link_info.seq || !link_info.key) {
      throw new StdObject(-2, '사용할 수 없는 링크입니다.', 400)
    }

    const operation_link_info = await this.getOperationLinkBySeq(database, link_info.seq)
    if (!operation_link_info || operation_link_info.isEmpty() || operation_link_info.random_key !== link_info.key) {
      throw new StdObject(-3, '사용할 수 없는 링크입니다.', 400)
    }

    if (operation_link_info.expire_date) {
      if (operation_link_info.expire_date < Util.today('yyyy-mm-dd')) {
        throw new StdObject(-4, '만료된 링크입니다.', 400)
      }
    }

    return operation_link_info
  }

  checkOperationLinkByCode = async (database, link_code) => {
    const operation_link_info = await this.getOperationLinkByCode(database, link_code)
    const operation_info = await OperationService.getOperationInfo(database, operation_link_info.operation_seq, null, false, false)
    if (!operation_info || operation_info.isEmpty()) {
      throw new StdObject(-5, '공유된 수술/시술이 없습니다.', 400)
    }
    if (operation_info.status !== 'Y') {
      throw new StdObject(-6, '삭제된 수술/시술 입니다.', 400)
    }
    // const group_info = await GroupService.getGroupInfo(database, operation_info.group_seq)
    // if (group_info.status !== 'Y' && group_info.status !== 'F') {
    //   throw new StdObject(-7, '사용이 중지된 사용자입니다.', 400)
    // }

    return {
      use_password: !Util.isEmpty(operation_link_info.password),
      link_seq: operation_link_info.seq,
      group_name: group_info.group_name,
      operation_name: operation_info.operation_name,
      is_writer: operation_link_info.auth === this.AUTH_WRITE,
      enable_download: operation_link_info.enable_download > 0,
    }
  }

  checkLinkPassword = async (database, link_seq, password) => {
    const operation_link_info = await this.getOperationLinkBySeq(database, link_seq)
    return operation_link_info.password === Util.hash(password)
  }

  createOperationLinkByEmailList = async (operation_seq, member_info, request_body, service_domain) => {
    const operation_info = await OperationService.getOperationInfo(DBMySQL, operation_seq, null, false, false)
    const link_type = this.LINK_TYPE_EMAIL
    const auth = request_body.auth
    const password = request_body.password ? Util.hash(request_body.password) : null
    const expire_date = request_body.expire_date
    const enable_download = request_body.enable_download
    const email_list = request_body.email_list
    const send_message = request_body.send_message
    const success_list = []
    for (let i = 0; i < email_list.length; i++) {
      const share_email = email_list[i]
      try {
        const link_info = await this.createOperationLink(operation_seq, link_type, auth, share_email, password, expire_date, enable_download)
        const link_info_json = link_info.toJSON()
        link_info_json.use_password = !!link_info.password
        success_list.push(link_info_json)
      } catch (error) {
        log.error(this.log_prefix, '[createOperationLinkByEmailList]', error)
      }
    }

    (
      async (link_info_list, operation_info, member_info, send_message, service_domain) => {
        await this.sendEmailList(link_info_list, operation_info, member_info, send_message, service_domain)
      }
    )(success_list, operation_info, member_info, send_message, service_domain)

    return success_list
  }

  sendEmailList = async (link_info_list, operation_info, member_info, send_message, service_domain) => {
    for (let i = 0; i < link_info_list.length; i++) {
      const link_info = link_info_list[i]
      try {
        await this.sendEmail(link_info, operation_info, member_info, send_message, service_domain)
      } catch (error) {
        log.error(this.log_prefix, '[sendEmailList]', link_info, error)
      }
    }
  }
  sendEmail = async (link_info, operation_info, member_info, send_message, service_domain) => {
    const group_info = await GroupService.getGroupInfo(DBMySQL, operation_info.group_seq);
    let user_name = member_info.user_name;
    if (group_info.member_name_used !== 1) {
      user_name = member_info.user_nickname;
    }
    const title = `${user_name}님이 Surgstory에서 "${operation_info.operation_name}" 수술/시술을 공유하였습니다.`
    const template_data = {
      service_domain,
      user_name: user_name,
      operation_name: operation_info.operation_name,
      message: Util.nlToBr(send_message),
      btn_link_url: `${service_domain}/v2/link/operation/${link_info.link_code}`,
      expire_date: link_info.expire_date ? link_info.expire_date : null
    }
    const body = OperationMailTemplate.linkEmail(template_data)
    const send_mail_result = await new SendMail().sendMailHtml([link_info.share_email], title, body)
    if (send_mail_result.isSuccess() === false) {
      log.error(this.log_prefix, '[sendEmail]', link_info, send_mail_result)
    }
  }

  createOperationLinkOne = async (operation_seq, request_body) => {
    const link_type = request_body.link_type
    const share_email = request_body.share_email
    const auth = request_body.auth

    const link_info = await this.createOperationLink(operation_seq, link_type, auth, share_email)
    const link_info_json = link_info.toJSON()
    link_info_json.use_password = !!link_info.password

    return link_info_json
  }

  createOperationLink = async (operation_seq, link_type, auth = null, share_email = null, password = null, expire_date = null, enable_download = false) => {
    let operation_link_info = null
    if (link_type === this.LINK_TYPE_EMAIL && !share_email) {
      throw new StdObject(-1, '잘못된 요청입니다.', 400)
    }
    if (link_type === this.LINK_TYPE_EDIT) {
      auth = this.AUTH_WRITE
    }
    if (!auth) {
      auth = this.AUTH_READ
    }
    let link_seq = null
    operation_link_info = await this.getOperationLink(DBMySQL, operation_seq, link_type, share_email)
    if (operation_link_info && !operation_link_info.isEmpty()) {
      const update_params = {
        auth,
        password,
        expire_date,
        enable_download
      }
      link_seq = operation_link_info.seq
      await this.setLinkOptionBySeq(link_seq, update_params)
    } else {
      await DBMySQL.transaction(async (transaction) => {
        const operation_link_model = this.getOperationLinkModel(transaction)
        link_seq = await operation_link_model.createOperationLink(operation_seq, link_type, auth, share_email, password, expire_date, enable_download)

        const random_key = Util.getRandomString(4)
        const link_code_params = {
          key: random_key,
          seq: link_seq,
        }
        const link_code = Util.encrypt(link_code_params)
        await operation_link_model.setOperationLinkBySeq(link_seq, random_key, link_code)
      })
    }

    return await this.getOperationLinkBySeq(DBMySQL, link_seq)
  }

  deleteOperationLinkBySeq = async (link_seq) => {
    const operation_link_model = this.getOperationLinkModel()
    return await operation_link_model.deleteBySeq(link_seq)
  }

  setLinkOptionBySeq = async (link_seq, request_body) => {
    const auth = request_body.auth
    const password = request_body.password
    const expire_date = request_body.expire_date
    const enable_download = request_body.enable_download
    const change_password = request_body.change_password
    const hash_password = password ? Util.hash(password) : null
    const operation_link_model = this.getOperationLinkModel()
    return await operation_link_model.setLinkOptionBySeq(link_seq, auth, hash_password, expire_date, enable_download, change_password)
  }

  hasLink = async (database, operation_seq) => {
    const link_count = await this.getLinkCount(database, operation_seq)
    const has_link = link_count > 0
    await this.updateOperationLinkState(DBMySQL, operation_seq, has_link)
    return has_link
  }

  getLinkCount = async (database, operation_seq) => {
    const operation_link_model = this.getOperationLinkModel(database)
    return await operation_link_model.getLinkCount(operation_seq)
  }

  updateOperationLinkState = async (database, operation_seq, has_link) => {
    await OperationService.updateLinkState(database, operation_seq, has_link)
  }
}

const operation_link_service = new OperationLinkServiceClass()
export default operation_link_service
