import { Router } from 'express'
import Auth from '../../../middlewares/auth.middleware'
import Role from '../../../constants/roles'
import Wrap from '../../../utils/express-async'
// import GroupService from '../../../service/group/GroupService'
import DBMySQL from '../../../database/knex-mysql'
import OperationDataService from '../../../service/operation/OperationDataService'
import StdObject from '../../../wrapper/std-object'
import OperationService from '../../../service/operation/OperationService'
import OperationCommentService from '../../../service/operation/OperationCommentService'
import OperationClipService from '../../../service/operation/OperationClipService'
import OperationFileService from '../../../service/operation/OperationFileService'
import Util from '../../../utils/Util'
import OperationLinkService from '../../../service/operation/OperationLinkService'
import MemberService from "../../../service/member/MemberService";

const routes = Router()

const getBaseInfo = async (request, check_auth = false, check_writer = false, import_operation_info = false, check_folder_auth = false) => {
  const api_type = request.params.api_type
  const api_key = request.params.api_key

  if (Util.isEmpty(api_type) || Util.isEmpty(api_key)) {
    throw new StdObject(801, '잘못된 접근입니다.', 400)
  }

  let check_group_auth = false
  if (api_type === 'drive') {
    check_group_auth = true
  }
  // const group_auth = await GroupService.checkGroupAuth(DBMySQL, request, true, check_group_auth, true)
  const comment_seq = request.params.comment_seq
  const clip_id = request.params.clip_id
  const phase_id = request.params.phase_id

  const { token_info, member_seq } = await OperationService.getBaseInfo(DBMySQL, request)
  const member_info = await MemberService.getMemberInfo(DBMySQL, member_seq)

  const result = {
    api_type,
    api_key,
    // ...group_auth,
    member_info,
    operation_data_info: null,
    operation_data_seq: null,
    is_writer: false,
    is_auth: false,
    link_info: null,
    link_code: null,
    is_link: false,
    is_editor_link: false,
    is_download_link: false,
    comment_seq,
    clip_id,
    phase_id,
    operation_seq: null,
    operation_info: null,
    token_info,
  }

  await getDriveInfo(result, api_key)

  // if (api_type === 'mentoring') {
  //   await getMentoringInfo(result, api_key)
  // } else if (api_type === 'link') {
  //   await getLinkInfo(result, api_key)
  // } else if (api_type === 'drive') {
  //   await getDriveInfo(result, api_key, check_folder_auth)
  // } else if (api_type === 'open_video') {
  //   await getOpenVideoInfo(result, api_key)
  // } else if (api_type === 'admin') {
  //   await getAdminInfo(result, api_key)
  // } else if (api_type === 'admin2') {
  //   await getAdminInfo2(result, api_key)
  // } else if (api_type === 'open_channel') {
  //   await getOpenChannelVideoInfo(result, api_key)
  // } else {
  //   throw new StdObject(802, '잘못된 접근입니다.', 400)
  // }

  if (import_operation_info && !result.operation_info) {
    result.operation_info = await OperationService.getOperationInfo(DBMySQL, result.operation_seq, null, false, true)
  }
  if (check_auth && !result.is_auth) {
    // throw new StdObject(803, '접근2 권한이 없습니다.', 403)
  }
  if (check_writer && !result.is_writer) {
    // throw new StdObject(804, '수정2 권한이 없습니다.', 403)
  }

  return result
}

const getAdminInfo = async (result, operation_seq) => {
  if (!result.token_info.isAdmin()) {
    throw new StdObject(805, '접근 권한이 없습니다.', 400)
  }
  const operation_info = await OperationService.getOperationInfo(DBMySQL, operation_seq, null, false, true)
  if (!operation_info || operation_info.isEmpty()) {
    throw new StdObject(806, '등록된 정보가 없습니다.', 400)
  }
  result.operation_seq = operation_info.seq
  result.operation_info = operation_info
  result.is_writer = false
  result.is_auth = true

  const operation_data_info = await OperationDataService.getOperationDataByOperationSeq(DBMySQL, operation_seq)
  if (operation_data_info && !operation_data_info.isEmpty()) {
    result.operation_data_info = operation_data_info
    result.operation_data_seq = operation_data_info.seq
  }
}

// admin 정보 by djyu
const getAdminInfo2 = async (result, operation_seq) => {
  if (!result.token_info.isAdmin()) {
    throw new StdObject(805, '접근 권한이 없습니다.', 400)
  }
  const operation_info = await OperationService.getOperationInfo(DBMySQL, operation_seq, null, false, true)
  if (!operation_info || operation_info.isEmpty()) {
    throw new StdObject(806, '등록된 정보가 없습니다.', 400)
  }
  result.operation_seq = operation_info.seq
  result.operation_info = operation_info
  result.is_writer = false
  result.is_auth = true

  const operation_data_info = await OperationDataService.getOperationDataByOperationSeq(DBMySQL, operation_seq)
  if (operation_data_info && !operation_data_info.isEmpty()) {
    result.operation_data_info = operation_data_info
    result.operation_data_seq = operation_data_info.seq
  }
}

const getDriveInfo = async (result, operation_seq) => {
  const group_seq = result.group_seq
  const operation_info = await OperationService.getOperationInfo(DBMySQL, operation_seq, null, false, true)
  if (!operation_info || operation_info.isEmpty()) {
    throw new StdObject(807, '등록된 정보가 없습니다.', 400)
  }
  if (operation_info.group_seq !== group_seq) {
    // throw new StdObject(808, '접근권한이 없습니다.', 400)
  }

  // if (check_folder_auth) {
  //   const folder_grade = await OperationService.getFolderGrade(operation_seq)
  //   if (folder_grade > result.group_grade_number) {
  //     throw new StdObject(809, '접근권한이 없습니다.', 400)
  //   }
  // }

  const is_writer = operation_info.group_seq === group_seq
  const is_auth = operation_info.group_seq === group_seq

  result.operation_seq = operation_info.seq
  result.operation_info = operation_info
  result.is_writer = is_writer
  result.is_auth = is_auth

  const operation_data_info = await OperationDataService.getOperationDataByOperationSeq(DBMySQL, operation_seq)
  if (operation_data_info && !operation_data_info.isEmpty()) {
    result.operation_data_info = operation_data_info
    result.operation_data_seq = operation_data_info.seq
  }
}

// const getLinkInfo = async (result, link_code) => {
//   const link_info = await OperationLinkService.getOperationLinkByCode(DBMySQL, link_code)
//   if (!link_info || link_info.isEmpty()) {
//     throw new StdObject(810, '등록된 정보가 없습니다.', 400)
//   }
//
//   const is_editor_link = link_info.auth === OperationLinkService.AUTH_WRITE
//   const is_download_link = link_info.enable_download === 1
//   result.operation_seq = link_info.operation_seq
//   result.link_info = link_info
//   result.link_code = link_code
//   result.is_writer = is_editor_link
//   result.is_auth = true
//   result.is_link = true
//   result.is_editor_link = is_editor_link
//   result.is_download_link = is_download_link
// }
//
// const getMentoringInfo = async (result, operation_data_seq) => {
//   const group_seq = result.group_seq
//   const operation_data_info = await OperationDataService.getOperationData(DBMySQL, operation_data_seq)
//   if (!operation_data_info || operation_data_info.isEmpty()) {
//     throw new StdObject(811, '등록된 정보가 없습니다.', 400)
//   }
//   if (operation_data_info.type !== 'M') {
//     throw new StdObject(812, '잘못된 접근입니다.', 403)
//   }
//
//   const is_writer = operation_data_info.group_seq === group_seq
//   const is_auth = operation_data_info.mento_group_seq === group_seq || operation_data_info.group_seq === group_seq
//
//   result.operation_seq = operation_data_info.operation_seq
//   result.operation_data_info = operation_data_info
//   result.operation_data_seq = operation_data_seq
//   result.is_writer = is_writer
//   result.is_auth = is_auth
// }
//
// const getOpenVideoInfo = async (result, operation_data_seq) => {
//   const group_seq = result.group_seq
//   const operation_data_info = await OperationDataService.getOperationData(DBMySQL, operation_data_seq)
//   if (!operation_data_info || operation_data_info.isEmpty()) {
//     throw new StdObject(813, '등록된 정보가 없습니다.', 400)
//   }
//   if (!operation_data_info.is_open_video) {
//     throw new StdObject(814, '잘못된 접근입니다.', 403)
//   }
//
//   const is_writer = operation_data_info.group_seq === group_seq
//
//   result.operation_seq = operation_data_info.operation_seq
//   result.operation_data_info = operation_data_info
//   result.operation_data_seq = operation_data_seq
//   result.is_writer = is_writer
//   result.is_auth = true
// }
//
// const getOpenChannelVideoInfo = async (result, api_key) => {
//   // const group_seq = result.group_seq
//   // const operation_data_info = await OperationDataService.getOperationData(DBMySQL, operation_data_seq)
//   // if (!operation_data_info || operation_data_info.isEmpty()) {
//   //   throw new StdObject(100, '등록된 정보가 없습니다.', 400)
//   // }
//   // if (!operation_data_info.is_open_video) {
//   //   throw new StdObject(-3, '잘못된 접근입니다.', 403)
//   // }
//   //
//   // const is_writer = operation_data_info.group_seq === group_seq
//   //
//   // result.operation_seq = operation_data_info.operation_seq
//   // result.operation_data_info = operation_data_info
//   // result.operation_data_seq = operation_data_seq
//   // result.is_writer = is_writer
//   // result.is_auth = true
//   //
//   // const operation_data_info = await OperationDataService.getOperationDataByOperationSeq(DBMySQL, operation_seq)
//   // if (operation_data_info && !operation_data_info.isEmpty()) {
//   //   result.operation_data_info = operation_data_info
//   //   result.operation_data_seq = operation_data_info.seq
//   // }
// }

routes.get('/admin', Auth.isAuthenticated(Role.ADMIN), Wrap(async (req, res) => {
  req.accepts('application/json')
  // getOperationListByRequest = async (database, group_seq, member_seq, group_member_info, group_grade_number, is_group_admin, request, is_admin = false)
  const operation_info_page = await OperationService.getOperationListByRequest(null, null, null, null, null, false, req, true)
  const output = new StdObject()
  output.adds(operation_info_page)
  res.json(output)
}))

routes.get('/:api_type/:api_key/view', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const base_info = await getBaseInfo(req, true, false, false, true)
  const output = await OperationService.getOperationDataView(req.params.api_key, 3)
  output.add('is_link', true)
  output.add('is_editor_link', true)
  output.add('is_download_link', true)
  res.json(output)
}))

// // 동영상 1개 정보 가져오기 by djyu
// routes.get('/:api_type/:api_key/view2', Wrap(async (req, res) => {
//   req.accepts('application/json')
//   // const base_info = await getBaseInfo(req, true, false, false, true)
//   const output = await OperationService.getOperationDataView(req.params.api_key, 3)
//   output.add('is_link', true)
//   output.add('is_editor_link', true)
//   output.add('is_download_link', true)
//   res.json(output)
// }))

routes.get('/:api_type/:api_key/view/file', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const base_info = await getBaseInfo(req, true, false, false, true)

  const output = await OperationService.getOperationDataViewFile(base_info.operation_seq, base_info.group_seq)
  output.add('is_link', base_info.is_link)
  output.add('is_editor_link', base_info.is_editor_link)
  output.add('is_download_link', base_info.is_download_link)
  res.json(output)
}))

routes.get('/:api_type/:api_key/mode', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const base_info = await getBaseInfo(req, false, false, true)
  const mode_info = await OperationService.getOperationMode(base_info.operation_seq)
  const output = new StdObject()
  output.adds(mode_info)
  res.json(output)
}))

routes.delete('/:api_type/:api_key', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const base_info = await getBaseInfo(req, true)

  let is_admin = false
  // const is_admin = req.body.is_admin
  if (base_info.token_info.getRole() === Role.ADMIN) {
    is_admin = true
  }
  const result = await OperationService.updateStatusTrash(DBMySQL,{ seq_list: [base_info.operation_seq] }, false, is_admin, base_info.member_info.seq)

  const output = new StdObject()
  output.add('result', result)

  res.json(output)
}))

routes.post('/:api_type/:api_key/info', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const base_info = await getBaseInfo(req, true)
  const output = await OperationService.getOperationDataInfo(base_info.operation_seq, base_info.group_seq, req.body)
  output.add('is_link', base_info.is_link)
  output.add('is_editor_link', base_info.is_editor_link)
  output.add('is_download_link', base_info.is_download_link)
  res.json(output)
}))

routes.put('/:api_type/:api_key/modify', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { operation_info, member_seq } = await getBaseInfo(req, true, true, true)
  const output = await OperationService.updateOperation(member_seq, operation_info, req.body)
  res.json(output)
}))

routes.put('/:api_type/:api_key/doc', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { operation_data_seq } = await getBaseInfo(req, true, true)
  const result = await OperationDataService.changeDocument(operation_data_seq, req.body)
  const output = new StdObject()
  output.add('result', result)
  res.json(output)
}))

routes.put('/:api_type/:api_key/open_video', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { operation_data_seq, group_seq } = await getBaseInfo(req, true, true)
  const result = await OperationDataService.changeOpenVideo(DBMySQL, group_seq, operation_data_seq, req.body)
  const output = new StdObject()
  output.add('result', result)
  res.json(output)
}))

routes.get('/:api_type/:api_key/comment', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { operation_data_seq } = await getBaseInfo(req, false)
  const comment_list = await OperationCommentService.getCommentList(DBMySQL, operation_data_seq, req.query)

  const output = new StdObject()
  output.add('comment_list', comment_list)

  if (req.query && req.query.with_count === 'y') {
    const comment_count = await OperationCommentService.getCommentCount(DBMySQL, operation_data_seq, req.query.parent_seq)
    output.add('comment_count', comment_count)
  }

  res.json(output)
}))

routes.post('/:api_type/:api_key/comment', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { member_info, operation_data_seq, operation_info } = await getBaseInfo(req, true, false, true)
  const create_result = await OperationCommentService.createComment(DBMySQL, member_info, operation_info, operation_data_seq, req.body)

  const output = new StdObject()
  output.adds(create_result)
  res.json(output)
}))

routes.get('/:api_type/:api_key/comment/count', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { operation_data_seq } = await getBaseInfo(req, false)
  const comment_count = await OperationCommentService.getCommentCount(DBMySQL, operation_data_seq, req.query.parent_seq)

  const output = new StdObject()
  output.add('comment_count', comment_count)
  res.json(output)
}))

routes.get('/:api_type/:api_key/comment/:comment_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { operation_data_seq, comment_seq } = await getBaseInfo(req, false)
  const comment_info = await OperationCommentService.getComment(DBMySQL, operation_data_seq, comment_seq)

  const output = new StdObject()
  output.add('comment_info', comment_info)

  if (req.query && req.query.with_count === 'y') {
    const comment_count = await OperationCommentService.getCommentCount(DBMySQL, operation_data_seq, req.query.parent_seq)
    output.add('comment_count', comment_count)
  }

  res.json(output)
}))

routes.put('/:api_type/:api_key/comment/:comment_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { operation_data_seq, comment_seq } = await getBaseInfo(req, true)
  const comment_info = await OperationCommentService.changeComment(DBMySQL, operation_data_seq, comment_seq, req.body)

  const output = new StdObject()
  output.add('comment_info', comment_info)
  res.json(output)
}))

routes.delete('/:api_type/:api_key/comment/:comment_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { operation_seq, operation_data_seq, comment_seq } = await getBaseInfo(req, true)
  const delete_result = await OperationCommentService.deleteComment(operation_seq, operation_data_seq, comment_seq, req.body)

  const output = new StdObject()
  output.adds(delete_result)

  res.json(output)
}))

routes.put('/:api_type/:api_key/comment/:comment_seq(\\d+)/like', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { comment_seq, member_info } = await getBaseInfo(req, true)
  const like_result = await OperationCommentService.setCommentLike(DBMySQL, comment_seq, true, member_info)

  const output = new StdObject()
  output.adds(like_result)
  res.json(output)
}))

routes.delete('/:api_type/:api_key/comment/:comment_seq(\\d+)/like', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { comment_seq, member_info } = await getBaseInfo(req, true)
  const like_result = await OperationCommentService.setCommentLike(DBMySQL, comment_seq, false, member_info)

  const output = new StdObject()
  output.adds(like_result)
  res.json(output)
}))

routes.post('/:api_type/:api_key/clip', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { operation_info, member_info, group_member_info } = await getBaseInfo(req, true, true, true)

  const create_result = await OperationClipService.createClip(operation_info, member_info, req.body, true, group_member_info, true)
  const output = new StdObject()
  output.add('result', create_result)
  res.json(output)
}))

routes.put('/:api_type/:api_key/clip/:clip_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { clip_id } = await getBaseInfo(req, true, true)

  const update_result = await OperationClipService.updateClip(clip_id, req.body)
  const output = new StdObject()
  output.add('result', update_result)
  res.json(output)
}))

routes.delete('/:api_type/:api_key/clip/:clip_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { clip_id, operation_info, group_member_info } = await getBaseInfo(req, true, true, true)

  const delete_result = await OperationClipService.deleteById(clip_id, operation_info, req.body, group_member_info)
  const output = new StdObject()
  output.add('result', delete_result)
  res.json(output)
}))

routes.delete('/:api_type/:api_key/clip/phase/:phase_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { phase_id, operation_seq } = await getBaseInfo(req, true, true)
  const result = await OperationClipService.unsetPhaseOne(operation_seq, phase_id, req.body)
  const output = new StdObject()
  output.add('result', result)
  res.json(output)
}))

routes.post('/:api_type/:api_key/phase', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { operation_info } = await getBaseInfo(req, true, true, true)

  const create_result = await OperationClipService.createPhase(operation_info, req.body)
  const output = new StdObject()
  output.add('phase', create_result.phase_info)
  output.add('phase_id', create_result.phase_id)
  res.json(output)
}))

routes.put('/:api_type/:api_key/phase/:phase_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { phase_id } = await getBaseInfo(req, true, true)

  const phase_desc = req.body.phase_desc
  const update_result = await OperationClipService.updatePhase(phase_id, phase_desc)
  const output = new StdObject()
  output.add('result', update_result)
  res.json(output)
}))

routes.put('/:api_type/:api_key/phase/:phase_id/clips', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { phase_id } = await getBaseInfo(req, true, true)

  const result = await OperationClipService.setPhase(phase_id, req.body)
  const output = new StdObject()
  output.add('result', result)
  res.json(output)
}))

routes.delete('/:api_type/:api_key/phase/:phase_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { phase_id, operation_seq } = await getBaseInfo(req, true, true)

  const delete_result = await OperationClipService.deletePhase(operation_seq, phase_id)
  const output = new StdObject()
  output.add('result', delete_result)
  res.json(output)
}))

routes.put('/:api_type/:api_key/thumbnail', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { operation_seq } = await getBaseInfo(req, true, true)
  const thumbnail_url = await OperationDataService.setThumbnailImage(operation_seq, req, res)

  const output = new StdObject()
  output.add('thumbnail_url', thumbnail_url)

  res.json(output)
}))

routes.get('/:api_type/:api_key/files/:file_type', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { operation_info } = await getBaseInfo(req, true, false, true)
  const file_type = req.params.file_type
  const file_list = await OperationFileService.getFileList(DBMySQL, operation_info, file_type, req.query)
  const output = new StdObject()
  output.adds(file_list)
  res.json(output)
}))

routes.post('/:api_type/:api_key/files/:file_type', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { operation_info } = await getBaseInfo(req, true, true, true)
  const file_type = req.params.file_type
  const upload_seq = await OperationService.uploadOperationFile(DBMySQL, req, res, operation_info, file_type)

  const output = new StdObject()
  output.add('upload_seq', upload_seq)
  res.json(output)
}))

routes.delete('/:api_type/:api_key/files/:file_type', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { operation_info } = await getBaseInfo(req, true, true, true)
  const file_type = req.params.file_type
  await OperationService.deleteFileInfo(operation_info, file_type, req.body)
  const output = new StdObject()
  res.json(output)
}))

routes.put('/:api_type/:api_key/files/upload/complete', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { operation_info } = await getBaseInfo(req, true, true, true)
  await OperationService.onUploadComplete(operation_info, false)
  const output = new StdObject()
  res.json(output)
}))

routes.get('/:api_type/:api_key/video/url', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { operation_info } = await getBaseInfo(req, true, false, true)
  const download_url = OperationService.getVideoDownloadURL(operation_info)
  const output = new StdObject()
  output.add('download_url', download_url)
  res.json(output)
}))

routes.put('/:api_type/:api_key/operation/files/name', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { operation_info } = await getBaseInfo(req, true, true, true)
  await OperationFileService.changeOperationFileName(operation_info, req.body)
  const output = new StdObject()
  res.json(output)
}))

routes.post('/:api_type/:api_key/operation/files/name/validation', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { operation_info } = await getBaseInfo(req, true, true, true)
  const is_valid = await OperationFileService.isValidOperationFileName(operation_info, req.body)
  const output = new StdObject()
  output.add('is_valid', is_valid);
  res.json(output)
}))

routes.put('/:api_type/:api_key/operation/files/type', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { operation_info } = await getBaseInfo(req, true, true, true)
  const success = await OperationFileService.changeOperationFilesType(operation_info, req.body)
  const output = new StdObject()
  output.add('success', success);
  res.json(output)
}))

routes.put('/:api_type/:api_key/operation/files/rotation', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { operation_info } = await getBaseInfo(req, true, true, true)
  const success = await OperationFileService.changeOperationFilesRotation(operation_info, req.body)
  const output = new StdObject()
  output.add('success', success);
  res.json(output)
}))

routes.post('/:api_type/:api_key/operation/files/chart/pdf/:upload_id', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { operation_info, member_info, group_member_info } = await getBaseInfo(req, true, true, true)
  const upload_id = req.params.upload_id
  const pdf_info = await OperationFileService.uploadOperationChartPDF(DBMySQL, req, res, operation_info, group_member_info, member_info, upload_id)
  const output = new StdObject()
  output.add('pdf_info', pdf_info)
  res.json(output)
}))

routes.post('/:api_type/:api_key/operation/process/check', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const token_info = req.token_info
  const check_auth = !token_info.isAdmin()
  const { operation_info } = await getBaseInfo(req, check_auth, check_auth, true)
  res.json(await OperationService.checkOperationStatus(operation_info))
}))

routes.post('/:api_type/:api_key/operation/process/continue', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const token_info = req.token_info
  const check_auth = !token_info.isAdmin()
  const { operation_info } = await getBaseInfo(req, check_auth, check_auth, true)
  res.json(await OperationService.continueProcessForce(operation_info))
}))

routes.post('/:api_type/:api_key/operation/process/trans/request', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const token_info = req.token_info
  const check_auth = !token_info.isAdmin()
  const { operation_info } = await getBaseInfo(req, check_auth, check_auth, true)
  res.json(await OperationService.requestTranscodingForce(operation_info))
}))

routes.post('/:api_type/:api_key/operation/process/trans/complete', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const token_info = req.token_info
  const check_auth = !token_info.isAdmin()
  const { operation_info } = await getBaseInfo(req, check_auth, check_auth, true)
  res.json(await OperationService.transcodingCompleteForce(operation_info))
}))

routes.post('/:api_type/:api_key/operation/process/file/move', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const token_info = req.token_info
  const check_auth = !token_info.isAdmin()
  const { operation_info } = await getBaseInfo(req, check_auth, check_auth, true)
  res.json(await OperationService.requestFileMoveForce(operation_info))
}))

routes.post('/:api_type/:api_key/operation/process/file/move', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const token_info = req.token_info
  const check_auth = !token_info.isAdmin()
  const { operation_info } = await getBaseInfo(req, check_auth, check_auth, true)
  res.json(await OperationService.requestFileMoveForce(operation_info))
}))

routes.post('/:api_type/operation/process/trans/request/list', Auth.isAuthenticated(Role.ADMIN), Wrap(async (req, res) => {
  req.accepts('application/json')
  res.json(await OperationService.requestTranscodingList(req.body))
}))

routes.post('/:api_type/:api_key/template_grade', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const baseinfo = await getBaseInfo(req, true, false, true)
  const operation_seq = req.params.api_key

  if (baseinfo.is_group_manager || baseinfo.is_group_admin || baseinfo.operation_info.is_writer) {
    res.json(await OperationDataService.setTemplateGrade(operation_seq, req.body))
  } else {
    res.json(new StdObject(-1, '사용 권한이 없습니다.', 403))
  }
}))

export default routes
