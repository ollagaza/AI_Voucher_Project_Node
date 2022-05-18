import mongoose from 'mongoose'
import Util from '../../utils/Util'

const Schema = mongoose.Schema

const getIndexFieldInfos = () => {
  return {
    unique_id: { type: String, require: true },
    creator: { type: String, require: true },
    thumbnail_url: { type: String, require: true, default: null },
    start_time: { type: Number, require: true, default: 0 },
    end_time: { type: Number, require: true, default: 0 },
    start_frame: { type: Number, require: true, default: 0 },
    end_frame: { type: Number, require: true, default: 0 },
    tags: { type: [String], require: false, default: [] },
    created_date: { type: Date, default: Date.now, require: false, message: '생성 일자가 없습니다.' },
    modify_date: { type: Date, default: Date.now, require: false, message: '수정 일자가 없습니다.' }
  }
}
const index_schema_field_infos = getIndexFieldInfos()
const index_info_schema = new Schema(index_schema_field_infos, { _id: false })
const index_info_model = mongoose.model('IndexInfo', index_info_schema)

const getFieldInfos = () => {
  return {
    member_seq: { type: Number, index: true, require: false, message: '사용자 아이디가 없습니다.' },
    operation_seq: { type: Number, index: true, require: false, message: '수술번호가 없습니다.' },
    index_list: { type: [index_info_schema], require: false, default: [], message: '인덱스 목록이 없습니다.' },
    index_count: { type: Number, require: false, default: 0, message: '인덱스 개수가 없습니다.' },
    tags: { type: [String], require: false, default: [], message: '태그 목록이 없습니다.' },
    created_date: { type: Date, default: Date.now, require: false, message: '생성 일자가 없습니다.' },
    modify_date: { type: Date, default: Date.now, require: false, message: '수정 일자가 없습니다.' }
  }
}

const schema_field_infos = getFieldInfos()
schema_field_infos.member_seq.require = true
schema_field_infos.operation_seq.require = true

const video_index_info_schema = new Schema(schema_field_infos)

video_index_info_schema.indexes()
video_index_info_schema.index({ operation_seq: 1, member_seq: 1 })
video_index_info_schema.index({ member_seq: 1, tags: 1 })

const getIndexModelList = (index_list) => {
  const index_model_list = []
  if (!index_list) {
    return index_model_list
  }
  const index_info_fields = getIndexFieldInfos()
  for (let i = 0; i < index_list.length; i++) {
    const index_info_payload = Util.getPayload(index_list[i].toJSON(), index_info_fields)
    index_model_list.push(new index_info_model(index_info_payload))
  }
  return index_model_list
}

video_index_info_schema.statics.createVideoIndexInfo = function (payload, index_list = null, tags = [String]) {
  const index_model_list = getIndexModelList(index_list)
  payload.index_list = index_model_list
  payload.index_count = index_model_list.length
  payload.tags = tags
  const model = new this(payload)
  return model.save()
}

video_index_info_schema.statics.createVideoIndexInfoByOperation = function (operation_info, index_list = null, tags = [String]) {
  const fields = VideoIndexInfoField()
  fields.member_seq.require = true
  fields.operation_seq.require = true

  const data = {
    operation_seq: operation_info.seq,
    member_seq: operation_info.member_seq
  }

  const payload = Util.getPayload(data, fields)
  return video_index_info_model.createVideoIndexInfo(payload, index_list, tags)
}

video_index_info_schema.statics.copyVideoIndexInfoByOperation = function (video_info, operation_info) {
  const replace_regex = new RegExp(operation_info.origin_content_id, 'gi')
  const fields = VideoIndexInfoField()
  fields.member_seq.require = true
  fields.operation_seq.require = true

  const data = {
    operation_seq: operation_info.seq,
    member_seq: operation_info.member_seq
  }

  const payload = Util.getPayload(data, fields)

  if (video_info.index_list.length !== 0) {
    for (let i = 0; i < video_info.index_list.length; i++) {
      if (video_info.index_list[i].thumbnail_url) {
        video_info.index_list[i].thumbnail_url = video_info.index_list[i].thumbnail_url.replace(replace_regex, operation_info.content_id)
      }
    }
  }

  return video_index_info_model.createVideoIndexInfo(payload, video_info.index_list, video_info.tags)
}

video_index_info_schema.statics.updateIndexListByOperation = function (operation_seq, index_list, member_seq = null) {
  const index_model_list = getIndexModelList(index_list)
  const update = {
    index_list: index_model_list,
    index_count: index_model_list.length,
    modify_date: Date.now()
  }
  const filter = { operation_seq: operation_seq }
  if (member_seq !== null) {
    filter.member_seq = member_seq
  }
  return this.updateOne(filter, update, { upsert: true })
}

video_index_info_schema.statics.findOneByOperation = function (operation_seq, member_seq = null, projection = null) {
  const filter = { operation_seq: operation_seq }
  if (member_seq !== null) {
    filter.member_seq = member_seq
  }
  return this.findOne(filter, projection)
}

video_index_info_schema.statics.deleteByOperation = function (operation_seq, member_seq = null) {
  const filter = { operation_seq: operation_seq }
  if (member_seq !== null) {
    filter.member_seq = member_seq
  }
  return this.findOneAndDelete(filter)
}

const video_index_info_model = mongoose.model('VideoIndexInfo', video_index_info_schema)

export const VideoIndexInfoModel = video_index_info_model
export const VideoIndexInfoField = getFieldInfos
