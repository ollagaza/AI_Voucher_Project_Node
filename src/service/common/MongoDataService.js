import _ from 'lodash'
import StdObject from '../../wrapper/std-object'
import { MedicalModel } from '../../database/mongodb/Medical'
import { InterestModel } from '../../database/mongodb/Interest'
import { SYSTEM_DATA_TYPES, SystemDataModel } from '../../database/mongodb/SystemData'
import log from '../../libs/logger'

const MongoDataServiceClass = class {
  constructor () {
    this.log_prefix = 'MongoDataService'
    this.MEDICAL = 'medical'
    this.INTEREST = 'interrest'

    this.medial_info = null
    this.interest_info = null
    this.system_data_map = {}
  }

  init = async () => {
    const medical_result = await MedicalModel.findAll()
    if (medical_result && medical_result[0]) {
      this.medial_info = medical_result[0].toJSON ? medical_result[0].toJSON() : medical_result[0]._doc
    } else {
      this.medial_info = {}
    }
    const interest_result = await InterestModel.findAll()
    if (interest_result && interest_result[0]) {
      this.interest_info = interest_result[0].toJSON ? interest_result[0].toJSON() : interest_result[0]._doc
    } else {
      this.interest_info = {}
    }

    const system_data_list = await SystemDataModel.findAll()
    log.debug(this.log_prefix, 'system_data_list', system_data_list)
    if (system_data_list) {
      for (let i = 0; i < system_data_list.length; i++) {
        const system_data = system_data_list[i]
        this.system_data_map[system_data.data_type] = system_data
      }
    }
  }

  getMedicalInfo = (lang = 'kor') => {
    return _.sortBy(this.medial_info[lang], 'text')
  }

  getInterestInfo = (lang = 'kor') => {
    return _.sortBy(this.interest_info[lang], 'text')
  }

  getData = (data_type = null, lang = 'kor') => {
    let output = new StdObject()
    switch (data_type) {
      case this.MEDICAL:
        output.add(this.MEDICAL, this.getMedicalInfo(lang))
        break
      case this.INTEREST:
        output.add(this.INTEREST, this.getInterestInfo(lang))
        break
      default:
        output.add(this.MEDICAL, this.getMedicalInfo(lang))
        output.add(this.INTEREST, this.getInterestInfo(lang))
        break
    }
    return output
  }

  return_Data = (data_type, lang = 'kor') => {
    switch (data_type) {
      case this.MEDICAL:
        return this.getMedicalInfo(lang)
      case this.INTEREST:
        return this.getInterestInfo(lang)
      default:
        return null
    }
  }

  getSearchData = (data_type = null, search_keyword = null, lang = 'kor') => {
    const data = this.return_Data(data_type, lang)
    return _.filter(data, function (item) {
      return item.text.indexOf(search_keyword) != -1 ? item : null
    })
  }

  getObjectData = (data_type = null, object = null, lang = 'kor') => {
    const data = this.return_Data(data_type, lang)
    const return_date = []

    _.forEach(object, (item) => {
      _.filter(data, function (filter_item) {
        filter_item.code === item.code ? return_date.push(filter_item) : null
      })
    })

    return return_date
  }

  getSystemData = (data_type) => {
    return this.system_data_map[data_type]
  }

  getSystemDataTypes = () => SYSTEM_DATA_TYPES
}

const mongo_data_service = new MongoDataServiceClass()

export default mongo_data_service
