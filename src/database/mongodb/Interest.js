import mongoose from 'mongoose'
import Interest_BasicData from '../../data/Mongo_Interest_Data'

const Schema = mongoose.Schema

const getFieldInfos = () => {
  return {
    codes: { type: Object, index: false, require: false, unique: false },
    version: { type: Number, index: false, require: false, unique: false }
  }
}

const schema_field_infos = getFieldInfos()

const interest_schema = new Schema(schema_field_infos, { strict: false })

interest_schema.statics.InsertDefaultData = function (interest) {
  if (!interest || !interest._id) {
    const model = new this(Interest_BasicData)
    return model.save()
  }
  if (!interest.version || interest.version < Interest_BasicData.version) {
    return this.updateOne({ _id: interest._id }, Interest_BasicData)
  }
}

interest_schema.statics.findAll = function () {
  return this.find({})
}

const interest_model = mongoose.model('interrests', interest_schema)

export const InterestModel = interest_model
export const InterestField = getFieldInfos
