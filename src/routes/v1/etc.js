import { Router } from 'express'
import Wrap from '../../utils/express-async'
import Auth from '../../middlewares/auth.middleware'
import Role from '../../constants/roles'
import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql'
import Util from '../../utils/Util'
import ServiceConfig from '../../service/service-config'
import GroupService from '../../service/group/GroupService'
import ContactUsService from '../../service/etc/ContactUsService'
import EditorService from '../../service/etc/EditorService'
import SendMailService from "../../service/etc/SendMailService";

const routes = Router()

routes.get('/sendmaillist', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  try {
    const { group_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, false)
    const result = await SendMailService.getSendMailPagingList(DBMySQL, group_seq, req)
    const output = new StdObject()
    output.adds(result)
    res.json(output)
  } catch (e) {
    throw new StdObject(-1, e, 400)
  }
}))

routes.get('/getsendmail/:mail_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  try {
    const { group_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, false)
    const mail_seq = req.params.mail_seq
    const result = await SendMailService.getSendMailOne(DBMySQL, mail_seq)
    const output = new StdObject()
    output.add('result', result)
    res.json(output)
  } catch (e) {
    throw new StdObject(-1, e, 400)
  }
}))

routes.delete('/sendmail', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  try {
    await GroupService.checkGroupAuth(DBMySQL, req, true, true, false)
    const mail_seq = req.body
    const output = new StdObject();
    for (let cnt = 0; cnt < Object.keys(mail_seq).length; cnt++) {
      const result = await SendMailService.deleteMail(DBMySQL, mail_seq[cnt])
      output.add('result', result);
    }
    res.json(output)
  } catch (e) {
    throw new StdObject(-1, e, 400)
  }
}))

routes.get('/sendmail/:mail_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  try {
    const { group_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, false)
    const mail_seq = req.params.mail_seq
    const result = await SendMailService.sendMail(DBMySQL, mail_seq)
    res.json(result)
  } catch (e) {
    throw new StdObject(-1, e, 400)
  }
}))

routes.post('/upload_mail', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  try {
    const { group_seq, member_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, false)
    const mail_params = req.body;
    mail_params.group_seq = group_seq;
    mail_params.member_seq = member_seq;
    mail_params.content_id = Util.getContentId();
    const mail_seq = await SendMailService.createSendMail(DBMySQL, mail_params)
    const result = new StdObject()
    result.add('result', mail_seq)
    res.json(result)
  } catch (e) {
    throw new StdObject(-1, e, 400)
  }
}))

routes.post('/:group_seq(\\d+)/:mail_seq(\\d+)/file', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const group_seq = req.params.group_seq
  const mail_seq = req.params.mail_seq
  const email_file_list = await SendMailService.uploadFile(group_seq, mail_seq, req, res)
  const output = new StdObject()
  output.add('email_file_list', email_file_list)
  res.json(output)
}))

routes.put('/editorimage/:contentid', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  try {
    const token_info = req.token_info
    const group_seq = token_info.getGroupSeq()
    const group_info = await GroupService.getGroupInfo(DBMySQL, group_seq)
    const output = new StdObject()
    const result = await EditorService.uploadEditorImage(group_info.media_path, req, res)
    output.add('result', result)
    output.add('path', Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), `${group_info.media_path}/editor/${result.filename}`))
    res.json(output)
  } catch (e) {
    throw new StdObject(-1, e, 400)
  }
}))

// editor image upload by djyu
routes.put('/editorimage2/:contentid', Wrap(async (req, res) => {
  try {
    const token_info = req.token_info
    // const group_seq = token_info.getGroupSeq()
    const group_info = await GroupService.getGroupInfo(DBMySQL, 3)
    const output = new StdObject()
    const result = await EditorService.uploadEditorImage(group_info.media_path, req, res)
    output.add('result', result)
    output.add('path', Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), `${group_info.media_path}/editor/${result.filename}`))
    res.json(output)
  } catch (e) {
    throw new StdObject(-1, e, 400)
  }
}))

routes.put('/editor/file/:contentid', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  try {
    const token_info = req.token_info
    const group_seq = token_info.getGroupSeq()
    const group_info = await GroupService.getGroupInfo(DBMySQL, group_seq)
    const output = new StdObject()
    const { url, upload_file_info } = await EditorService.uploadEditorFile(group_info.media_path, req, res)
    output.add('result', upload_file_info)
    output.add('path', url)
    res.json(output)
  } catch (e) {
    throw new StdObject(-1, e, 400)
  }
}))

routes.post('/checkeditorimage', Wrap(async (req, res) => {
  try {
    const contentid = req.body.contentid
    const arrImages = req.body.arrImages
    const output = new StdObject()
    const result = await EditorService.checkImageFiles(contentid, arrImages)
    output.add('result', result)
    res.json(output)
  } catch (e) {
    throw new StdObject(-1, e, 400)
  }
}))

routes.post('/deletecontentdirectory', Wrap(async (req, res) => {
  try {
    const contentid = req.body.contentid
    const output = new StdObject()
    const result = await EditorService.deleteContentDirectory(contentid)
    output.add('result', result)
    res.json(output)
  } catch (e) {
    throw new StdObject(-1, e, 400)
  }
}))

routes.post('/contact_us', Wrap(async (req, res, next) => {
  const is_success = await ContactUsService.createContactUs(req.body)
  const result = new StdObject()
  result.add('result', is_success)
  res.json(result)
}))

export default routes
