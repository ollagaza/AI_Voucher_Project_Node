import mongoose from 'mongoose'
import Medaical_BasicData from '../../data/Mongo_Medicals_Data'

const Schema = mongoose.Schema

const getFieldInfos = () => {
  return {
    codes: { type: Object, index: false, require: false, unique: false },
    version: { type: Number, index: false, require: false, unique: false }
  }
}

const schema_field_infos = getFieldInfos()

const medical_schema = new Schema(schema_field_infos, { strict: false })

medical_schema.statics.InsertDefaultData = function (medical) {
  if (!medical || !medical._id) {
    const model = new this(Medaical_BasicData)
    return model.save()
  }
  if (!medical.version || medical.version < Medaical_BasicData.version) {
    return this.updateOne({ _id: medical._id }, Medaical_BasicData)
  }
}

medical_schema.statics.findAll = function () {
  return this.find({})
}

const medical_model = mongoose.model('medical', medical_schema)

export const MedicalModel = medical_model
export const MedicalField = getFieldInfos
