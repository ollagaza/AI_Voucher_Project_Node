import mongoose from 'mongoose'

const Schema = mongoose.Schema

const getFieldInfos = () => {
  return {
    codes: { type: Object, index: false, require: false, unique: false },
    created_date: { type: Date, default: Date.now, require: false, message: '생성 일자가 없습니다.' },
    modify_date: { type: Date, default: Date.now, require: false, message: '수정 일자가 없습니다.' }
  }
}

const schema_field_infos = getFieldInfos()
const dynamic_result_schema = new Schema(schema_field_infos, { strict: false })

dynamic_result_schema.statics.findByResultId = function (result_id, projection = null) {
  return this.findById({ _id: result_id }, projection)
}

dynamic_result_schema.statics.findByResultSeq = function (seq, projection = null) {
  return this.findOne({ result_seq: seq.toString() }, projection)
}

dynamic_result_schema.statics.getDynamicResultList = function (seq, projection = null) {
  return this.find({ result_seq: seq.toString() }, projection)
}

dynamic_result_schema.statics.createDynamicResult = function (data) {
  const model = new this(data)
  return model.save()
}

dynamic_result_schema.statics.updateById = function (id, data) {
  data.modify_date = Date.now()
  return this.findOneAndUpdate({ _id: id }, data, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true
  })
}
dynamic_result_schema.statics.deleteById = function (id) {
  return this.findByIdAndDelete(id)
}

const dynamic_result_model = mongoose.model('dynamic_result', dynamic_result_schema)

export const DynamicResultModel = dynamic_result_model
