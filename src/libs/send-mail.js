import _ from 'lodash'
import Util from '../utils/baseutil'
import ServiceConfig from '../service/service-config'
import StdObject from '../wrapper/std-object'
import logger from '../libs/logger'

export default class SendMail {
  constructor () {
    this.log_prefix = '[SendMail]'
  }

  sendMailHtml = async (mail_to_list, title, body, sender_name = null) => {
    // logger.debug('sendMailHtml');
    return await this.send(mail_to_list, title, body, sender_name)
  }

  sendMailText = async (mail_to_list, title, body, sender_name = null) => {
    return await this.send(mail_to_list, title, body, sender_name)
  }

  send = async (mail_to_list, title, body, sender_name = null) => {
    const recipients = this.getRecipients(mail_to_list)
    if (recipients.length <= 0) {
      throw new StdObject(-1, '수신자 목록이 없습니다.')
    }
    // logger.debug('send 1');
    // 참조: https://apidocs.ncloud.com/ko/ai-application-service/cloud_outbound_mailer/createmailrequest/
    const space = ' '  // 공백
    const new_line = '\n'  // 줄바꿈
    const method = 'POST'  // HTTP 메서드
    const url = '/api/v1/mails'  // 도메인을 제외한 "/" 아래 전체 url (쿼리스트링 포함)
    const timestamp = `${Util.getCurrentTimestamp(true)}`  // 현재 타임스탬프 (epoch, millisecond)
    const access_key = `${ServiceConfig.get('naver_access_key')}`  // access key id (from portal or Sub Account)
    const secret_key = `${ServiceConfig.get('naver_secret_key')}`  // secret key (from portal or Sub Account)
    // logger.debug('send 2');
    const signature_message = `${method}${space}${url}${new_line}${timestamp}${new_line}${access_key}`
    let signature = null
    let send_email_result = null
    try {
      signature = Util.hmac(secret_key, signature_message)
      const request_options = {
        method: 'POST',
        hostname: 'mail.apigw.ntruss.com',
        port: 443,
        path: url,
        headers: {
          'Content-Type': 'application/json',
          'x-ncp-apigw-timestamp': timestamp,
          'x-ncp-iam-access-key': access_key,
          'x-ncp-apigw-signature-v2': signature
        }
      }
      // logger.debug(request_options);
      const mail_info = {
        'senderAddress': 'no_reply@surgstory.com',
        'senderName': 'AIVOUCHER',
        'title': title,
        'body': body,
        'recipients': this.getRecipients(mail_to_list)
      }
      //logger.debug('send 3');
      if (sender_name) {
        mail_info.senderName = `${sender_name} (via)`
      }
      let request_result = await Util.httpRequest(request_options, JSON.stringify(mail_info), true)
      request_result = JSON.parse(request_result)

      send_email_result = new StdObject()
      if (!request_result.requestId) {
        send_email_result.error = -1
        send_email_result.message = '이메일 발송 실패'
        send_email_result.add('request_result', request_result)
        send_email_result.add('mail_info', mail_info)
        throw send_email_result
      }
      // logger.debug('send 4');
    } catch (error) {
      throw error
    }

    return send_email_result
  }

  parseMailAddress = (email_address) => {
    if (!email_address) {
      return null
    }
    const regexp = /^(.+) <(.+)>$/
    email_address = _.trim(email_address)
    if (!email_address) {
      return null
    }

    const result = {
      name: null,
      address: null
    }
    if (regexp.test(email_address)) {
      const match = email_address.match(regexp)
      result.name = match[1]
      result.address = match[2]
    } else {
      result.address = email_address
    }

    return result
  }

  getRecipients = (mail_to_list) => {
    const recipients = []
    for (let i = 0; i < mail_to_list.length; i++) {
      const email_info = this.parseMailAddress(mail_to_list[i])
      if (email_info && email_info.address) {
        const recipient = {
          'address': email_info.address,
          'type': 'R'
        }
        if (email_info.name) {
          recipient.name = email_info.name
        }
        recipients.push(recipient)
      }
    }
    return recipients
  }
}
