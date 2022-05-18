import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql'
import log from '../../libs/logger'
import SendMail from '../../libs/send-mail'
import SendMailModel from '../../database/mysql/etc/SendMailModel'
import logger from "../../libs/logger";
import ServiceConfig from "../service-config";
import Util from "../../utils/Util";

const SendMailServiceClass = class {
  constructor () {
    this.log_prefix = '[ContactUsService]'
  }

  getSendMailModel = (database = null) => {
    if (database) {
      return new SendMailModel(database)
    }
    return new SendMailModel(DBMySQL)
  }

  getSendMailList = async (database, group_seq) => {
    const sendmail_model = this.getSendMailModel()
    return await sendmail_model.getSendMailList(group_seq)
  }

  getSendMailPagingList = async (database, group_seq, req) => {
    const request_body = req.query ? req.query : {}
    const request_paging = request_body.paging ? JSON.parse(request_body.paging) : {}
    const request_order = request_body.order ? JSON.parse(request_body.order) : null

    const paging = {}
    paging.list_count = request_paging.list_count ? request_paging.list_count : 20
    paging.cur_page = request_paging.cur_page ? request_paging.cur_page : 1
    paging.page_count = request_paging.page_count ? request_paging.page_count : 10
    paging.no_paging = 'N'

    const sendmail_model = this.getSendMailModel()
    return await sendmail_model.getSendMailPagingList(group_seq, paging, request_order)
  }

  ThreeMonthsEmailDelete = async () => {
    const sendmail_model = this.getSendMailModel(DBMySQL)
    const mail_info_list = await sendmail_model.getSendMailThreeMonths()
    for (let cnt = 0; cnt < mail_info_list.length; cnt++) {
      await this.deleteMail(DBMySQL, mail_info_list[cnt].seq)
    }
  }

  deleteMail = async (database, mail_seq) => {
    const mail_info = await this.getSendMailOne(database, mail_seq)
    return await this.deleteMailAndFile(database, mail_info);
  }

  deleteMailAndFile = async (database, mail_info) => {
    const sendmail_model = this.getSendMailModel(database)
    const file_list = JSON.parse(mail_info.email_file_list)
    if (!file_list) return await sendmail_model.deleteMail(mail_info.seq);

    for (let cnt = 0; cnt < Object.keys(file_list).length; cnt++) {
      const file_path = `${ServiceConfig.getMediaRoot()}${file_list[0].file_path}${file_list[0].file_name}`
      try {
        await Util.deleteFile(file_path)
      } catch (error) {
        logger.error(this.log_prefix, '[deleteFile]', error)
      }
    }
    await Util.deleteDirectory(`${ServiceConfig.getMediaRoot()}${file_list[0].file_path}`);

    return await sendmail_model.deleteMail(mail_info.seq)
  }

  getSendMailOne = async (database, mail_seq) => {
    const sendmail_model = this.getSendMailModel(database)
    return await sendmail_model.getSendMailFindOne(mail_seq)
  }

  getReservationEmailList = async (database) => {
    const sendmail_model = this.getSendMailModel(database)
    return await sendmail_model.getReservationEmailList()
  }

  createSendMail = async (database, sendmail_data) => {
    const sendmail_model = this.getSendMailModel(database)
    const create_result = await sendmail_model.createSendMail(sendmail_data)

    return create_result
  }

  fileUpdateSendMail = async (database, mail_seq, params) => {
    const sendmail_model = this.getSendMailModel(database)
    return await sendmail_model.fileUpdateSendMail(mail_seq, params)
  }

  sendMail = async (database, mail_seq) => {
    try {
      const mail_info = await this.getSendMailOne(database, mail_seq)
      const result = await new SendMail().sendMailInfo(mail_info);
      if (!result.error) {
        const sendmail_model = this.getSendMailModel(database)
        await sendmail_model.updateSendFlag(mail_seq)
      }
      return result
    } catch (e) {
      await this.SendMailError(database, mail_seq, JSON.parse(e.message))
      throw e
    }
  }

  sendReservationEmail = async (database) => {
    const sendmail_model = this.getSendMailModel(database)
    const mail_list = await this.getReservationEmailList(database)
    for (let cnt = 0; cnt < Object.keys(mail_list).length; cnt++) {
      const result = await new SendMail().sendMailInfo(mail_list[cnt]);
      if (!result.error) {
        await sendmail_model.updateSendFlag(mail_list[cnt].seq)
      }
    }
  }

  uploadFile = async (group_seq, mail_seq, request, response) => {
    logger.debug(this.log_prefix, `{ UPLOAD_ROOT: ${this.UPLOAD_ROOT}, FILE_URL_PREFIX: ${ServiceConfig.get('static_storage_prefix')} }`)
    const mail_info = await this.getSendMailOne(DBMySQL, mail_seq)
    const upload_path = `/email/${mail_info.content_id}/`
    const upload_directory = `${ServiceConfig.getMediaRoot()}/${upload_path}`
    logger.debug(this.log_prefix, '[uploadFile]', `{ mail_seq: ${mail_seq} }`, upload_directory)
    if (!(await Util.fileExists(upload_directory))) {
      await Util.createDirectory(upload_directory)
    }

    const file_field_name = 'sendmail_file'
    await Util.uploadByRequest(request, response, file_field_name, upload_directory)
    const upload_file_info = request.file
    if (Util.isEmpty(upload_file_info)) {
      throw new StdObject(-1, '파일 업로드가 실패하였습니다.', 500)
    }
    const email_file_list = {
      file_path: `${upload_path}`,
      file_original_name: upload_file_info.originalname,
      file_name: request.new_file_name,
      file_size: upload_file_info.size,
      file_type: await Util.getFileType(upload_file_info.path, this.file_name),
      file_url: `${ServiceConfig.get('static_storage_prefix')}${upload_path}/${request.new_file_name}`
    }
    logger.debug(this.log_prefix, '[uploadFile]', `{ mail_seq: ${mail_seq} }`, 'email_file_list', email_file_list)

    let email_file_lists = JSON.parse(mail_info.email_file_list)

    if (!email_file_lists) {
      email_file_lists = []
      email_file_lists.push(email_file_list);
    } else {
      email_file_lists.push(email_file_list);
    }

    const param = {
      email_file_list: JSON.stringify(email_file_lists),
    }

    const result = await this.fileUpdateSendMail(DBMySQL, mail_seq, param)

    return email_file_list
  }

  SendMailError = async (database, seq, e) => {
    const sendmail_model = this.getSendMailModel(database)
    await sendmail_model.updateError(seq, JSON.stringify(e.error))
  }
}

const SendMail_Service = new SendMailServiceClass()

export default SendMail_Service
