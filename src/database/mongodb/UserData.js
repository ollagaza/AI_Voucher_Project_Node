import mongoose from 'mongoose'

const Schema = mongoose.Schema

const getFieldInfos = () => {
  return {
    member_seq: { type: Number, index: true, require: true, unique: true, message: '회원 아이디가 없습니다.' },
    operation_type: { type: String, default: 'general_operation', require: false, message: '수술 종류가 없습니다.' },
    created_date: { type: Date, default: Date.now, require: false, message: '생성 일자가 없습니다.' },
    modify_date: { type: Date, default: Date.now, require: false, message: '수정 일자가 없습니다.' }
  }
}

const schema_field_infos = getFieldInfos()
schema_field_infos.member_seq.require = true

const user_data_schema = new Schema(schema_field_infos, { strict: false })

user_data_schema.indexes()
user_data_schema.statics.createUserData = function (member_seq, payload) {
  payload.member_seq = member_seq
  const model = new this(payload)
  return model.save()
}

user_data_schema.statics.updateByMemberSeq = function (member_seq, update) {
  update.member_seq = member_seq
  update.modify_date = Date.now()
  return this.findOneAndUpdate({ member_seq: member_seq }, update, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true
  })
}

user_data_schema.statics.findOneById = function (id, projection = null) {
  return this.findById(id, projection)
}

user_data_schema.statics.findByMemberSeq = function (member_seq, projection = null) {
  return this.findOne({ member_seq: member_seq }, projection)
}

user_data_schema.statics.deleteById = function (id) {
  return this.findByIdAndDelete(id)
}

user_data_schema.statics.deleteByMemberSeq = function (member_seq) {
  return this.findOneAndDelete({ member_seq: member_seq })
}

const user_data_model = mongoose.model('UserData', user_data_schema)

export const UserDataModel = user_data_model
export const UserDataField = getFieldInfos
