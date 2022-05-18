import mongoose from 'mongoose'
import Util from '../../utils/Util'
import log from '../../libs/logger'

const Schema = mongoose.Schema
const log_prefix = '[MongoDB - OperationClip]'

const getFieldInfos = () => {
  return {
    operation_seq: { type: Number, index: true, require: true, message: '수술 아이디가 없습니다.' },
    group_seq: { type: Number, index: true, require: false, message: '그룹 아이디가 없습니다.' },
    member_seq: { type: Number, index: true, require: false, message: '사용자 아이디가 없습니다.' },
    content_id: { type: String, index: true, require: false, message: '콘텐츠 아이디가 없습니다.' },
    user_name: { type: String, index: false, require: false, message: '사용자 이름이 없습니다.' },
    user_nickname: { type: String, index: false, require: false, message: '사용자 닉네임이 없습니다.' },
    start_time: { type: Number, default: 0, index: false, require: false, message: '시작 시간이 없습니다.' },
    end_time: { type: Number, default: 0, index: false, require: false, message: '종료 시간이 없습니다.' },
    desc: { type: String, default: '', index: false, require: false, message: '설명 문구가 없습니다.' },
    thumbnail_url: { type: String, default: '', index: false, require: false, message: '썸네일 정보가 없습니다.' },
    phase_id: { type: String, default: null, index: false, require: false, message: '썸네일 정보가 없습니다.' },
    is_phase: { type: Boolean, default: false, index: false, require: false, message: '썸네일 정보가 없습니다.' },
    tag_list: { type: [String], default: [], require: false, message: '태그 목록이 없습니다.' },
    is_shape: { type: Boolean, default: false, index: false, require: false, message: '마킹 정보가 없습니다.' },
    shape_info_list: { type: [Object], default: null, require: false, message: '마킹 정보가 없습니다.' },
    comment_count: { type: Number, default: 0, require: false, message: '댓글 개수가 없습니다.' },
    type: { type: String, default: 'operation', require: false, message: '클립 유형이 없습니다.' },
    full_path: { type: String, default: null, require: false, message: '파일 경로가 없습니다.' },
    directory: { type: String, default: null, require: false, message: '파일 경로가 없습니다.' },
    file_name: { type: String, default: null, require: false, message: '파일 경로가 없습니다.' },
    file_seq: { type: Number, default: null, require: false, message: '파일 경로가 없습니다.' },
    created_date: { type: Date, default: Date.now, require: false, message: '생성 일자가 없습니다.' },
    modify_date: { type: Date, default: Date.now, require: false, message: '수정 일자가 없습니다.' }
  }
}

const schema_field_infos = getFieldInfos()
schema_field_infos.operation_seq.require = true
schema_field_infos.group_seq.require = true
schema_field_infos.member_seq.require = true
schema_field_infos.content_id.require = true
schema_field_infos.desc.require = true

const operation_clip_schema = new Schema(schema_field_infos, { strict: false })

operation_clip_schema.indexes()
operation_clip_schema.index({ group_seq: 1, is_phase: 1 })
operation_clip_schema.index({ operation_seq: 1 })

operation_clip_schema.statics.createOperationClip = function (operation_info, member_info, clip_info) {
  clip_info.operation_seq = operation_info.seq
  clip_info.group_seq = operation_info.group_seq
  clip_info.content_id = operation_info.content_id
  clip_info.member_seq = member_info.seq
  clip_info.user_name = member_info.user_name
  clip_info.user_nickname = member_info.user_nickname
  clip_info.is_shape = clip_info.is_shape === true
  if (clip_info.is_shape) {
    clip_info.shape_info_list = clip_info.shape_info_list ? clip_info.shape_info_list : null
  } else {
    clip_info.shape_info_list = null
  }
  const payload = Util.getPayload(clip_info, getFieldInfos())
  const model = new this(payload)
  return model.save()
}

operation_clip_schema.statics.createOperationClipByList = function (operation_info, clip_info_list) {
  const data_list = []
  for (let i = 0; i < clip_info_list.length; i++) {
    const clip_info = clip_info_list[i]
    clip_info.operation_seq = operation_info.seq
    clip_info.group_seq = operation_info.group_seq
    clip_info.member_seq = operation_info.member_seq
    clip_info.content_id = operation_info.content_id
    const payload = Util.getPayload(clip_info, getFieldInfos())
    data_list.push(payload)
  }
  return this.insertMany(data_list)
}

operation_clip_schema.statics.updateOperationClip = function (clip_id, clip_info, tag_list = null) {
  const update = {
    desc: clip_info.desc,
    modify_date: Date.now()
  }
  if (clip_info.start_time === 0 || clip_info.start_time) update.start_time = clip_info.start_time
  if (clip_info.end_time === 0 || clip_info.end_time) update.end_time = clip_info.end_time
  if (clip_info.directory) update.directory = clip_info.directory
  if (clip_info.file_name) update.file_name = clip_info.file_name
  if (clip_info.file_seq) update.file_seq = clip_info.file_seq
  if (clip_info.full_path) update.full_path = clip_info.full_path
  if (clip_info.thumbnail_url) update.thumbnail_url = clip_info.thumbnail_url
  if (tag_list) {
    update.tag_list = tag_list
  }
  if (clip_info.is_shape) {
    update.is_shape = true;
    update.shape_info_list = clip_info.shape_info_list ? clip_info.shape_info_list : null
  } else {
    update.shape_info_list = null
  }
  log.debug(log_prefix, '[operation_clip_schema.statics.updateOperationClip]', update)
  return this.findByIdAndUpdate(clip_id, update, { 'new': true })
}

operation_clip_schema.statics.findOneById = function (id, projection = null) {
  return this.findById(id, projection)
}

operation_clip_schema.statics.findByOperationSeq = function (operation_seq, projection = null) {
  return this.find({ operation_seq: operation_seq }, projection)
}

operation_clip_schema.statics.findOneByContentId = function (content_id, projection = null) {
  return this.find({ content_id: content_id }, projection)
}

operation_clip_schema.statics.findByMemberSeq = function (member_seq, projection = null) {
  return this.find({ member_seq: member_seq, is_phase: { $ne: true } }, projection)
}

operation_clip_schema.statics.findByGroupSeq = function (group_seq, projection = null) {
  return this.find({ group_seq: group_seq, is_phase: { $ne: true } }, projection)
}

operation_clip_schema.statics.deleteById = function (id) {
  return this.findByIdAndDelete(id)
}

operation_clip_schema.statics.deleteByOperationSeq = function (operation_seq) {
  return this.deleteMany({ operation_seq: operation_seq }, { 'multi': true })
}

operation_clip_schema.statics.createPhase = function (operation_info, phase_desc, phase_type = null) {
  const payload = {
    operation_seq: operation_info.seq,
    group_seq: operation_info.group_seq,
    member_seq: operation_info.member_seq,
    content_id: operation_info.content_id,
    desc: phase_desc,
    is_phase: true,
    created_date: Date.now(),
    modify_date: Date.now()
  }
  if (phase_type) {
    payload.type = phase_type
  }
  const model = new this(payload)
  return model.save()
}

operation_clip_schema.statics.copyClipList = function (operation_clip_list, operation_info) {
  const replace_regex = new RegExp(operation_info.origin_content_id, 'gi')

  if (operation_clip_list) {
    for (let cnt = 0; cnt < operation_clip_list.length; cnt++) {
      operation_clip_list[cnt].operation_seq = operation_info.seq
      operation_clip_list[cnt].content_id = operation_info.content_id
      const copy_clip = Util.getPayload(operation_clip_list[cnt], getFieldInfos())
      if (copy_clip.thumbnail_url) {
        copy_clip.thumbnail_url = copy_clip.thumbnail_url.replace(replace_regex, operation_info.content_id)
      }
      log.debug(log_prefix, '[copyClipList]', copy_clip)
      const model = new this(copy_clip)
      model.save()
    }
  }
}

operation_clip_schema.statics.deletePhase = function (operation_seq, phase_id) {
  return this.deleteOne({ _id: phase_id, operation_seq })
}

operation_clip_schema.statics.updatePhase = function (phase_id, phase_desc) {
  const update = {
    desc: phase_desc,
    modify_date: Date.now()
  }
  return this.findByIdAndUpdate(phase_id, update, { 'new': true })
}

operation_clip_schema.statics.setPhase = function (phase_id, id_list) {
  const update = {
    phase_id,
    is_phase: false,
    modify_date: Date.now()
  }
  return this.updateMany({ _id: { $in: id_list } }, update, { 'multi': true })
}

operation_clip_schema.statics.unsetPhase = function (operation_seq, phase_id) {
  const update = {
    phase_id: null,
    is_phase: false,
    modify_date: Date.now()
  }
  return this.updateMany({ operation_seq, phase_id }, update, { 'multi': true })
}

operation_clip_schema.statics.unsetPhaseOne = function (clip_id, operation_seq, phase_id) {
  const update = {
    phase_id: null,
    is_phase: false,
    modify_date: Date.now()
  }
  return this.updateOne({ _id: clip_id, operation_seq, phase_id }, update)
}

operation_clip_schema.statics.updateCommentCount = function (clip_id, comment_count) {
  const update = {
    comment_count
  }
  log.debug(log_prefix, '[updateCommentCount]', clip_id, comment_count)
  return this.updateOne({ _id: clip_id }, update)
}

operation_clip_schema.statics.getGroupSeqCount = function () {
  return this.aggregate([{ $project: { 'group_seq': 1 }},
    { $group: { _id: '$group_seq', count: { $sum: 1 }}},
    { $sort: { count: -1 }}])
}
operation_clip_schema.statics.getGroupMemberSeqCount = function () {
  return this.aggregate([{ $project: { 'group_seq': 1, 'member_seq': 1 }},
    { $group: { _id: { 'group_seq': '$group_seq', 'member_seq': '$member_seq' }, count: { $sum: 1 }}},
    { $sort: { count: -1 }}])
}

operation_clip_schema.statics.findByMemberSeqAndGroupSeq = function (member_seq, group_seq, projection = null) {
  return this.find({ member_seq: member_seq, group_seq: group_seq }, projection)
}

operation_clip_schema.statics.getOperationClipCounts = function () {
  return this.aggregate().group({ _id: '$operation_seq', 'count': { '$sum': 1 } })
}

const operation_clip_model = mongoose.model('OperationClip', operation_clip_schema)

export const OperationClipModel = operation_clip_model
export const OperationClipField = getFieldInfos
