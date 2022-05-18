import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql'
import log from '../../libs/logger'
import ContactUsModel from '../../database/mysql/etc/ContactUsModel'
import SendMail from '../../libs/send-mail'
import ServiceConfig from '../service-config'

const ContactUsServiceClass = class {
  constructor () {
    this.log_prefix = '[ContactUsService]'
  }

  getContactUsModel = (database = null) => {
    if (database) {
      return new ContactUsModel(database)
    }
    return new ContactUsModel(DBMySQL)
  }

  createContactUs = async (contact_us_info) => {
    if (!contact_us_info.name) {
      throw new StdObject(-1, '이름을 입력해 주세요.', 400)
    }
    if (!contact_us_info.email) {
      throw new StdObject(-1, '이메일을 입력해 주세요.', 400)
    }
    if (!contact_us_info.question) {
      throw new StdObject(-1, '문의사항을 선택해 주세요.', 400)
    }
    if (!contact_us_info.message) {
      throw new StdObject(-1, '문의내용을 입력해 주세요.', 400)
    }
    const contact_us_model = this.getContactUsModel()
    const create_result = await contact_us_model.createContactUs(contact_us_info)
    if (!create_result) {
      throw new StdObject(-1, '문의사항이 등록되지 않았습니다.', 400)
    }

    (
      async () => {
        const supporter_email_list = ServiceConfig.supporterEmailList()
        if (!supporter_email_list || supporter_email_list.length <= 0) {
          return
        }
        let body = ''
        body += `이름: ${contact_us_info.name}\n`
        body += `이메일: ${contact_us_info.email}\n`
        body += `문의사항: ${contact_us_info.question}\n`
        body += `문의내용: ${contact_us_info.message}\n`
        try {
          await new SendMail().sendMailText(ServiceConfig.supporterEmailList(), 'Surgstory.com 문의메일', body)
        } catch (e) {
          log.error(this.log_prefix, 'send email', supporter_email_list, e)
        }
      }
    )()

    return create_result > 0
  }
}

const contact_us_service = new ContactUsServiceClass()

export default contact_us_service
