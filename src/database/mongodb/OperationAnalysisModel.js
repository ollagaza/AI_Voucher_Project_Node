import mongoose from 'mongoose'
import Util from '../../utils/Util'

const Schema = mongoose.Schema

const getFieldInfos = () => {
  return {
    operation_seq: { type: Number, index: true, require: true, message: '수술 아이디가 없습니다.' },
    member_seq: { type: Number, index: true, require: false, message: '사용자 아이디가 없습니다.' },
    content_id: { type: String, index: true, require: false, message: '콘텐츠 아이디가 없습니다.' },
    tag_list: { type: [String], default: [], require: false, message: '태그 목록이 없습니다.' },
    tag_count_map: { type: Object, default: {}, require: false, message: '태그별 개수 정보가 없습니다.' },
    total_time: { type: Number, default: 0, require: false, message: '전체 시간이 없습니다.' },
    total_frame: { type: Number, default: 0, require: false, message: '전체 프레임이 없습니다.' },
    total_action_count: { type: Number, default: 0, require: false, message: '전체 행동 횟수가 없습니다.' },
    total_index_count: { type: Number, default: 0, require: false, message: '전체 인덱스 개수가 없습니다.' },
    fps: { type: Number, default: 0, require: false, message: 'fps 정보가 없습니다.' },
    analysis_data: { type: Object, default: {}, require: false, message: '분석 결과가 없습니다.' },
    created_date: { type: Date, default: Date.now, require: false, message: '생성 일자가 없습니다.' },
    modify_date: { type: Date, default: Date.now, require: false, message: '수정 일자가 없습니다.' }
  }
}

const schema_field_infos = getFieldInfos()
schema_field_infos.operation_seq.require = true
schema_field_infos.member_seq.require = true
schema_field_infos.content_id.require = true

const operation_analysis_schema = new Schema(schema_field_infos, { strict: false })

operation_analysis_schema.indexes()
operation_analysis_schema.index({ member_seq: 1, tag_list: 1 })
operation_analysis_schema.index({ tag_list: 1 })

operation_analysis_schema.statics.createOperationAnalysis = function (analysis_info) {
  const payload = Util.getPayload(analysis_info, getFieldInfos())
  const model = new this(payload)
  return model.save()
}

operation_analysis_schema.statics.updateOperationAnalysis = function (analysis_id, payload) {
  return this.findByIdAndUpdate(analysis_id, payload, { 'new': true })
}

operation_analysis_schema.statics.updateOperationAnalysisByOperationSeq = function (operation_seq, payload) {
  return this.findOneAndUpdate({ operation_seq: operation_seq }, payload, { 'new': true })
}

operation_analysis_schema.statics.findOneById = function (id, projection = null) {
  return this.findById(id, projection)
}

operation_analysis_schema.statics.findByOperationSeq = function (operation_seq, projection = null) {
  return this.findOne({ operation_seq: operation_seq }, projection)
}

operation_analysis_schema.statics.findOneByContentId = function (content_id, projection = null) {
  return this.findOne({ content_id: content_id }, projection)
}

operation_analysis_schema.statics.findByMemberSeq = function (member_seq, projection = null) {
  return this.find({ member_seq: member_seq }, projection)
}

operation_analysis_schema.statics.deleteById = function (id) {
  return this.findByIdAndDelete(id)
}

operation_analysis_schema.statics.deleteByOperationSeq = function (operation_seq) {
  return this.deleteMany({ operation_seq: operation_seq })
}

operation_analysis_schema.statics.deleteAll = function (filter) {
  return this.findOneAndDelete(filter)
}

const operation_analysis_model = mongoose.model('OperationAnalysis', operation_analysis_schema)

export const OperationAnalysisModel = operation_analysis_model
export const OperationAnalysisField = getFieldInfos
