import mongoose from 'mongoose'
import Util from '../../utils/Util'
import logger from '../../libs/logger'

const Schema = mongoose.Schema

const getFieldInfos = () => {
  return {
    operation_seq: { type: Number, index: true, require: true, unique: true, message: '수술 아이디가 없습니다.' },
    member_seq: { type: Number, index: true, require: false, message: '사용자 아이디가 없습니다.' },
    content_id: { type: String, index: true, require: false, message: '콘텐츠 아이디가 없습니다.' },
    group_list: { type: [Number], default: [], require: false, message: '그룹 코드 목록이 없습니다.' },
    tag_list: { type: [String], default: [], require: false, message: '태그 목록이 없습니다.' },
    operation_type: { type: String, default: 'general_operation', require: false, message: '수술 종류가 없습니다.' },
    machine_type: { type: [String], default: [], require: false, message: '사용 장비가 없습니다.' },
    clinical_symptoms: { type: [String], default: [], require: false, message: '임상 증상이 없습니다.' },
    clinical_diagnosis: { type: [String], default: [], require: false, message: '임상 진단이 없습니다.' },
    operation_diagnosis: { type: [String], default: [], require: false, message: '수술중 진단이 없습니다.' },
    final_diagnosis: { type: [String], default: [], require: false, message: '최종 진단이 없습니다.' },
    created_date: { type: Date, default: Date.now, require: false, message: '생성 일자가 없습니다.' },
    modify_date: { type: Date, default: Date.now, require: false, message: '수정 일자가 없습니다.' }
  }
}

const schema_field_infos = getFieldInfos()
schema_field_infos.operation_seq.require = true
schema_field_infos.member_seq.require = true
schema_field_infos.content_id.require = true

const operation_metadata_schema = new Schema(schema_field_infos, { strict: false })

operation_metadata_schema.indexes()
operation_metadata_schema.index({ member_seq: 1, group_list: 1 })
operation_metadata_schema.index({ member_seq: 1, tag_list: 1 })
operation_metadata_schema.index({ member_seq: 1, operation_type: 1 })
operation_metadata_schema.index({ member_seq: 1, operation_diagnosis: 1 })
operation_metadata_schema.index({ member_seq: 1, final_diagnosis: 1 })

operation_metadata_schema.statics.createOperationMetadata = function (operation_info, payload) {
  payload.operation_seq = operation_info.seq
  payload.member_seq = operation_info.member_seq
  payload.content_id = operation_info.content_id
  payload.operation_type = operation_info.operation_type
  const model = new this(payload)
  return model.save()
}

operation_metadata_schema.statics.updateByOperationInfo = function (operation_info, operation_type, update) {
  update.operation_seq = operation_info.seq
  update.member_seq = operation_info.member_seq
  update.content_id = operation_info.content_id
  update.operation_type = operation_type
  update.modify_date = Date.now()
  return this.findOneAndUpdate({ operation_seq: operation_info.seq }, update, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true
  })
}

operation_metadata_schema.statics.findOneById = function (id, projection = null) {
  return this.findById(id, projection)
}

operation_metadata_schema.statics.findByOperationSeq = function (operation_seq, projection = null) {
  return this.findOne({ operation_seq: operation_seq }, projection)
}

operation_metadata_schema.statics.findOneByContentId = function (content_id, projection = null) {
  return this.findOne({ content_id: content_id }, projection)
}

operation_metadata_schema.statics.findByMemberSeq = function (member_seq, projection = null) {
  return this.find({ member_seq: member_seq }, projection)
}

operation_metadata_schema.statics.deleteById = function (id) {
  return this.findByIdAndDelete(id)
}

operation_metadata_schema.statics.deleteByOperationSeq = function (operation_seq) {
  return this.findOneAndDelete({ operation_seq: operation_seq })
}

const operation_metadata_model = mongoose.model('OperationMetadata', operation_metadata_schema)

export const OperationMetadataModel = operation_metadata_model
export const OperationMetadataField = getFieldInfos
