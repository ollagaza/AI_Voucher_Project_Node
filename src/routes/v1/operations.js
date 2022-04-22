import { Router } from 'express'
import Wrap from '../../utils/express-async'
import Auth from '../../middlewares/auth.middleware'
import Role from '../../constants/roles'
import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql'
import log from '../../libs/logger'
import GroupService from '../../service/group/GroupService'
import OperationService from '../../service/operation/OperationService'
import OperationDataService from '../../service/operation/OperationDataService'
import OperationClipService from '../../service/operation/OperationClipService'
import OperationMediaService from '../../service/operation/OperationMediaService'
import OperationFileService from '../../service/operation/OperationFileService'
import OperationStorageModel from '../../database/mysql/operation/OperationStorageModel'
import { OperationMetadataModel } from '../../database/mongodb/OperationMetadata'

const routes = Router()

routes.get('/', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { group_seq, group_grade_number, group_member_info, is_group_admin, member_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const operation_info_page = await OperationService.getOperationListByRequest(DBMySQL, group_seq, member_seq, group_member_info, group_grade_number, is_group_admin, req)

  const output = new StdObject()
  output.adds(operation_info_page)
  res.json(output)
}))

// 리스트 by djyu
routes.get('/list', Wrap(async (req, res) => {
  // const { group_seq, group_grade_number, group_member_info, is_group_admin, member_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const operation_info_page = await OperationService.getOperationListByRequest2(DBMySQL, 3, 2, '','','', req)

  const output = new StdObject()
  output.adds(operation_info_page)
  res.json(output)
}))

routes.get('/:operation_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { token_info } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const operation_seq = req.params.operation_seq

  const operation_info = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info, true, true)
  const output = new StdObject()
  output.add('operation_info', operation_info)

  res.json(output)
}))

routes.post('/', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { member_info, group_member_info } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const output = await OperationService.createOperation(DBMySQL, member_info, group_member_info, req.body, null)
  res.json(output)
}))

// 수술영상 등록-내용 저장 부분 by djyu
routes.post('/reg', Wrap(async (req, res) => {
  // const { member_info, group_member_info } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const output = await OperationService.createOperationReg(DBMySQL, req.body, null)
  res.json(output)
}))

routes.post('/copy/list', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { group_seq, member_info } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  OperationService.copyOperation(group_seq, member_info, req.body)
  res.json(new StdObject())
}))

routes.post('/copy/:operation_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { group_seq, member_info } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const operation_seq = req.params.operation_seq
  const copy_result = await OperationService.copyOperationOne(member_info, operation_seq, group_seq, req.body)
  let output
  if (copy_result.success) {
    output = new StdObject()
    output.add('operation_seq', copy_result.operation_seq)
    output.add('origin_operation_seq', copy_result.origin_operation_seq)
    output.add('operation_data_seq', copy_result.operation_data_seq)
    output.add('origin_operation_name', copy_result.origin_operation_name)
    output.add('origin_operation_code', copy_result.origin_operation_code)
  } else {
    output = new StdObject(-1, '수술 복사에 실패하였습니다.')
  }
  res.json(output)
}))

routes.put('/:operation_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { token_info, member_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const operation_seq = req.params.operation_seq

  const operation_info = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info)

  const update_result = await OperationService.updateOperation(DBMySQL, member_seq, operation_info, req.body)
  res.json(update_result)
}))

routes.delete('/:operation_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { token_info } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const operation_seq = req.params.operation_seq
  const delete_result = await OperationService.deleteOperation(DBMySQL, token_info, operation_seq)
  const output = new StdObject()
  output.add('result', delete_result)
  output.add('operation_seq', operation_seq)
  res.json(output)
}))

routes.delete('/delete_operations', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { group_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  OperationService.deleteOperationByList(group_seq, req.body.operations)
  res.json(new StdObject())
}))

routes.get('/:operation_seq(\\d+)/indexes', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const operation_seq = req.params.operation_seq
  const index_list = await OperationService.getVideoIndexList(operation_seq)

  const output = new StdObject()
  output.add('index_info_list', index_list)

  res.json(output)
}))

routes.get('/:operation_seq(\\d+)/clip/list', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const operation_seq = req.params.operation_seq
  const clip_list = await OperationClipService.findByOperationSeq(operation_seq)

  const output = new StdObject()
  output.add('clip_list', clip_list)

  res.json(output)
}))

routes.put('/:operation_seq(\\d+)/clip/phase/:phase_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const phase_id = req.params.phase_id
  const result = await OperationClipService.setPhase(phase_id, req.body)

  const output = new StdObject()
  output.add('result', result)
  res.json(output)
}))
routes.delete('/:operation_seq(\\d+)/clip/phase/:phase_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const operation_seq = req.params.operation_seq
  const phase_id = req.params.phase_id

  const result = await OperationClipService.unsetPhaseOne(operation_seq, phase_id, req.body)

  const output = new StdObject()
  output.add('result', result)
  res.json(output)
}))

routes.post('/:operation_seq(\\d+)/clip', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  if (!req.body) {
    throw new StdObject(-1, '잘못된 요청입니다.', 400)
  }
  const token_info = req.token_info
  const operation_seq = req.params.operation_seq
  const operation_info = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info)

  const create_result = await OperationClipService.createClip(operation_info, req.body)
  await new OperationStorageModel(DBMySQL).updateClipCount(operation_info.storage_seq, req.body.clip_count)
  const output = new StdObject()
  output.add('result', create_result)
  res.json(output)
}))

routes.put('/:operation_seq(\\d+)/clip/:clip_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  if (!req.body) {
    throw new StdObject(-1, '잘못된 요청입니다.', 400)
  }
  const clip_id = req.params.clip_id

  const update_result = await OperationClipService.updateClip(clip_id, req.body)

  const output = new StdObject()
  output.add('result', update_result)
  res.json(output)
}))

routes.delete('/:operation_seq(\\d+)/clip/:clip_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const token_info = req.token_info
  const clip_id = req.params.clip_id
  const operation_seq = req.params.operation_seq
  const operation_info = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info)

  const delete_result = await OperationClipService.deleteById(clip_id, operation_info, req.body)

  const output = new StdObject()
  output.add('result', delete_result)
  res.json(output)
}))

routes.post('/:operation_seq(\\d+)/phase', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  if (!req.body) {
    throw new StdObject(-1, '잘못된 요청입니다.', 400)
  }

  const token_info = req.token_info
  const operation_seq = req.params.operation_seq
  const operation_info = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info)

  const create_result = await OperationClipService.createPhase(operation_info, req.body)
  const output = new StdObject()
  output.add('phase', create_result.phase_info)
  output.add('phase_id', create_result.phase_id)
  res.json(output)
}))

routes.put('/:operation_seq(\\d+)/phase/:phase_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  // const operation_seq = req.params.operation_seq;
  const phase_id = req.params.phase_id
  const phase_desc = req.body.phase_desc

  log.d(req, phase_id, phase_desc)
  const update_result = await OperationClipService.updatePhase(phase_id, phase_desc)

  const output = new StdObject()
  output.add('result', update_result)
  res.json(output)
}))

routes.delete('/:operation_seq(\\d+)/phase/:phase_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const operation_seq = req.params.operation_seq
  const phase_id = req.params.phase_id
  const delete_result = await OperationClipService.deletePhase(operation_seq, phase_id)
  const output = new StdObject()
  output.add('result', delete_result)
  res.json(output)
}))

routes.post('/:operation_seq(\\d+)/request/analysis', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const { member_info, group_member_info, token_info } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const operation_seq = req.params.operation_seq
  OperationService.requestAnalysis(DBMySQL, token_info, operation_seq, group_member_info, member_info)

  res.json(new StdObject())
}))

// by djyu
routes.post('/:operation_seq(\\d+)/request/analysis2', Wrap(async (req, res) => {
  const operation_seq = req.params.operation_seq
  OperationService.requestAnalysis2(DBMySQL,  operation_seq)

  res.json(new StdObject())
}))

routes.put('/trash', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { group_seq, member_seq, is_group_admin } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  req.accepts('application/json')
  const seq_list = req.body.seq_list

  // updateStatusTrash = async (database, group_seq, operation_seq_list, is_delete = false, is_delete_by_admin, delete_member_seq)
  const result = await OperationService.updateStatusTrash(DBMySQL, group_seq, req.body, false, is_group_admin, member_seq)

  const output = new StdObject()
  output.add('result', result)
  output.add('status', 'T')
  res.json(output)
}))

routes.delete('/trash', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { group_seq, member_seq, is_group_admin } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  req.accepts('application/json')
  const seq_list = req.body.seq_list
  log.d(req, seq_list)

  const result = await OperationService.updateStatusTrash(DBMySQL, group_seq, req.body, true, is_group_admin, member_seq)

  const output = new StdObject()
  output.add('result', result)
  output.add('status', 'Y')
  res.json(output)
}))

routes.put('/:operation_seq(\\d+)/favorite', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const operation_seq = req.params.operation_seq

  const result = await OperationService.updateStatusFavorite(DBMySQL, operation_seq, false)

  const output = new StdObject()
  output.add('result', result)
  res.json(output)
}))

routes.delete('/:operation_seq(\\d+)/favorite', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const operation_seq = req.params.operation_seq

  const result = await OperationService.updateStatusFavorite(DBMySQL, operation_seq, true)

  const output = new StdObject()
  output.add('result', result)
  res.json(output)
}))

routes.post('/verify/operation_code', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const token_info = req.token_info
  req.accepts('application/json')
  const operation_code = req.body.operation_code
  const is_duplicate = await OperationService.isDuplicateOperationCode(DBMySQL, token_info.getGroupSeq(), token_info.getId(), operation_code)

  const output = new StdObject()
  output.add('verify', !is_duplicate)

  res.json(output)
}))

routes.get('/:operation_seq(\\d+)/video/url', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const token_info = req.token_info
  const operation_seq = req.params.operation_seq

  const operation_info = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info, true, true)
  const download_url = OperationService.getVideoDownloadURL(operation_info)
  const output = new StdObject()
  output.add('download_url', download_url)
  res.json(output)
}))

routes.get('/:operation_seq(\\d+)/files', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const token_info = req.token_info
  const operation_seq = req.params.operation_seq

  const operation_info = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info)
  const { refer_file_list } = await OperationFileService.getFileList(DBMySQL, operation_info, OperationFileService.TYPE_REFER)
  const output = new StdObject()
  output.add('refer_files', refer_file_list)

  res.json(output)
}))

routes.put('/:operation_seq(\\d+)/thumbnail', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const operation_seq = req.params.operation_seq
  const thumbnail_url = await OperationDataService.setThumbnailImage(operation_seq, req, res)

  const output = new StdObject()
  output.add('thumbnail_url', thumbnail_url)

  res.json(output)
}))

// 대표 썸네일 등록 by djyu
routes.put('/:operation_seq(\\d+)/thumbnail2', Wrap(async (req, res) => {
  const operation_seq = req.params.operation_seq
  const thumbnail_url = await OperationDataService.setThumbnailImage(operation_seq, req, res)

  const output = new StdObject()
  output.add('thumbnail_url', thumbnail_url)

  res.json(output)
}))

routes.post('/:operation_seq(\\d+)/files/:file_type', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const token_info = req.token_info
  const operation_seq = req.params.operation_seq
  const operation_info = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info)
  const file_type = req.params.file_type
  const upload_seq = await OperationService.uploadOperationFile(DBMySQL, req, res, operation_info, file_type)

  const output = new StdObject()
  output.add('upload_seq', upload_seq)

  res.json(output)
}))

// 영상 업로드 by djyu
routes.post('/:operation_seq(\\d+)/files2/:file_type', Wrap(async (req, res) => {
  const token_info = req.token_info
  const operation_seq = req.params.operation_seq
  const operation_info = await OperationService.getOperationInfo2(DBMySQL, operation_seq, token_info)
  const file_type = req.params.file_type
  const upload_seq = await OperationService.uploadOperationFile(DBMySQL, req, res, operation_info, file_type)

  const output = new StdObject()
  output.add('upload_seq', upload_seq)

  res.json(output)
}))

routes.put('/:operation_seq(\\d+)/files/upload/complete', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { token_info } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const operation_seq = req.params.operation_seq
  const operation_info = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info)
  await OperationService.onUploadComplete(operation_info, req.body && req.body.on_create === true)

  const output = new StdObject()
  res.json(output)
}))

// 파일 업로드 완료 처리 by djyu
routes.put('/:operation_seq(\\d+)/files2/upload/complete', Wrap(async (req, res) => {
  // const { token_info } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const operation_seq = req.params.operation_seq
  const operation_info = await OperationService.getOperationInfo2(DBMySQL, operation_seq, '')
  await OperationService.onUploadComplete(operation_info, req.body && req.body.on_create === true)

  const output = new StdObject()
  res.json(output)
}))

routes.delete('/:operation_seq(\\d+)/files/:file_type', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const token_info = req.token_info
  const operation_seq = req.params.operation_seq
  const file_type = req.params.file_type
  const file_seq_list = req.body.file_seq_list

  if (!file_seq_list || file_seq_list.length <= 0) {
    throw new StdObject(-1, '대상파일 정보가 없습니다', 400)
  }

  const output = new StdObject()

  const operation_info = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info)
  await OperationFileService.deleteFileList(DBMySQL, operation_info, file_seq_list, file_type)
  await OperationService.updateStorageSize(operation_info)

  res.json(output)
}))

routes.get('/:operation_seq(\\d+)/media_info', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const token_info = req.token_info
  const operation_seq = req.params.operation_seq

  const operation_info = await OperationService.getOperationInfo(DBMySQL, operation_seq, token_info)
  const operation_media_info = await OperationMediaService.getOperationMediaInfo(DBMySQL, operation_info)

  const output = new StdObject()
  output.add('operation_media_info', operation_media_info)

  res.json(output)
}))

routes.get('/:operation_seq(\\d+)/metadata', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const operation_seq = req.params.operation_seq
  const operation_metadata = await OperationMetadataModel.findByOperationSeq(operation_seq)

  const output = new StdObject()
  output.add('operation_metadata', operation_metadata)

  res.json(output)
}))

routes.get('/:operation_seq(\\d+)/data', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const operation_seq = req.params.operation_seq
  const operation_data = await OperationDataService.getOperationDataByOperationSeq(DBMySQL, operation_seq)

  const output = new StdObject()
  output.add('operation_data', operation_data)

  res.json(output)
}))

routes.get('/clips/:member_seq(\\d+)?', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const token_info = req.token_info
  let member_seq = req.params.member_seq
  if (member_seq && member_seq !== token_info.getId()) {
    if (token_info.getRole() !== Role.ADMIN) {
      throw new StdObject(-99, '권한이 없습니다.', 403)
    }
  }

  const clip_list = await OperationClipService.findByGroupSeq(token_info.group_seq)

  const output = new StdObject()
  output.add('clip_list', clip_list)
  res.json(output)
}))

routes.get('/:operation_seq(\\d+)/active', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const { group_seq, group_grade_number, is_group_admin } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const operation_seq = req.params.operation_seq
  const output = await OperationService.isOperationActive(operation_seq, group_seq, is_group_admin, group_grade_number)
  res.json(output)
}))

routes.get('/:operation_seq(\\d+)/able/restore', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { group_seq, group_grade_number, is_group_admin } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const operation_seq = req.params.operation_seq

  const is_able = await OperationService.isOperationAbleRestore(operation_seq, group_seq, group_grade_number, is_group_admin)
  const output = new StdObject()
  output.add('is_able', is_able)

  res.json(output)
}))

export default routes
