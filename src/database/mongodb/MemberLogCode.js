import mongoose from 'mongoose'
import LogCode_BasicData from '../../data/Mongo_MemberLogCodes_Data'

const Schema = mongoose.Schema

const getFieldInfos = () => {
  return {
    version: { type: Number, index: false, require: false, unique: false },
    codes: { type: Object, index: false, require: false, unique: false }
  }
}

const schema_field_infos = getFieldInfos()

const logcode_schema = new Schema(schema_field_infos, { strict: false })

logcode_schema.statics.InsertDefaultData = function (log_code) {
  if (!log_code || !log_code._id) {
    const model = new this(LogCode_BasicData)
    return model.save()
  }
  if (!log_code.version || log_code.version < LogCode_BasicData.version) {
    return this.updateOne({ _id: log_code._id }, LogCode_BasicData)
  }
}

logcode_schema.statics.findAll = function () {
  return this.find({})
}

const logcode_model = mongoose.model('memberlogcode', logcode_schema)

export const LogCodeModel = logcode_model
export const LogCodeField = getFieldInfos
