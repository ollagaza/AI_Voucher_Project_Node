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
const dynamic_schema = new Schema(schema_field_infos, { strict: false })

dynamic_schema.statics.findOneById = function (id) {
  return this.findById(id)
}

dynamic_schema.statics.findByTemplate_id = function (template_id, projection = null) {
  return this.findOne({ template_id: template_id }, projection)
}

dynamic_schema.statics.getDynamicTotalCount = function (search_keyword = null, search_option = null) {
  const filter = {}
  if (search_option && search_option.request_status) {
    filter.request_status = search_option.request_status
  }
  if (search_keyword) {
    filter.project_name = new RegExp(search_keyword)
  }
  return this.count(filter)
}

dynamic_schema.statics.getDynamicTemplateTypeList = function (template_type) {
  const filter = {}
  if (template_type) {
    filter.type = template_type
  }
  const find_result = filter ? this.find(filter) : this.find()
  return find_result.sort({ created_date: -1 })
}

dynamic_schema.statics.getDynamicList = function (page_navigation, sort_field = { _id: -1 }, search_keyword = null, search_option = null) {
  const filter = {}
  if (search_option && search_option.request_status && search_option.request_status !== '0') {
    filter.request_status = search_option.request_status
  }
  if (search_keyword) {
    filter.project_name = new RegExp(search_keyword)
  }
  const find_result = filter ? this.find(filter) : this.find()
  return find_result
    .sort(sort_field)
    .skip(page_navigation.list_count * (page_navigation.cur_page - 1))
    .limit(page_navigation.list_count)
}

dynamic_schema.statics.createDynamic = function (data) {
  const model = new this(data)
  return model.save()
}

dynamic_schema.statics.updateById = function (id, data) {
  data.modify_date = Date.now()
  return this.findOneAndUpdate({ template_id: id }, data, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true
  })
}

dynamic_schema.statics.updateByTemplate_id = function (question) {
  return this.updateOne({ template_id: question.template_id }, question)
}

dynamic_schema.statics.deleteById = function (id) {
  return this.findByIdAndDelete(id)
}

const dynamic_model = mongoose.model('dynamic', dynamic_schema)

export const DynamicModel = dynamic_model
