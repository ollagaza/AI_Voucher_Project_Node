import mongoose from 'mongoose'
import _ from 'lodash'
import logger from "../../libs/logger"

const Schema = mongoose.Schema

const getFieldInfos = () => {
  return {
    data_type: { type: String, unique: true, required: true },
    created_date: { type: Date, default: Date.now, require: false, message: '생성 일자가 없습니다.' },
    modify_date: { type: Date, default: Date.now, require: false, message: '수정 일자가 없습니다.' }
  }
}

const data_types = {
  SITE_INFO: 'site_info'
}
const default_data = {}
default_data[data_types.SITE_INFO] = {
  data_type: 'site_info',
  use_custom_main_page: false,
  main_logo_url: null,
  top_logo_url: null,
  site_name: null,
  main_bg_url: null,
  // channel_left_menu: {
  //   drive: { visible: true },
  //   studio: { visible: true },
  //   board: { visible: true },
  //   curriculum: { visible: true },
  // }
}

const schema_field_infos = getFieldInfos()
const system_data_schema = new Schema(schema_field_infos, { strict: false })

system_data_schema.statics.findData = function (data_type) {
  return this.findOne({ data_type }, '-_id -member_seq -created_date -modify_date')
}

system_data_schema.statics.findAll = function () {
  return this.find({}, '-_id -member_seq -created_date -modify_date -__v')
}

const system_data_model = mongoose.model('system_data', system_data_schema)

export const SystemDataModel = system_data_model

export const initSystemData = async () => {
  const key_list = Object.keys(default_data)
  for (let i = 0; i < key_list.length; i++) {
    const data_type = key_list[i]
    const stored_data = await system_data_model.findOne({ data_type })
    if (!stored_data) {
      const model = new system_data_model(default_data[data_type])
      await model.save()
    } else {
      logger.debug('initSystemData', Object.keys(default_data[data_type]), stored_data)
      for (let cnt = 0; cnt < Object.keys(default_data[data_type]).length; cnt++) {
        const default_key = Object.keys(default_data[data_type])[cnt]
        const stored_item = _.isEmpty(_.isBoolean(stored_data._doc[default_key]) ? stored_data._doc[default_key].toString() : stored_data._doc[default_key])
        logger.debug('initSystemData', default_key, stored_item, stored_data)
        if (stored_item) {
          stored_data._doc[default_key] = default_data[data_type][default_key]
        }
      }
      const model = new system_data_model(stored_data)
      await model.save()
    }
  }
}

export const SYSTEM_DATA_TYPES = data_types
