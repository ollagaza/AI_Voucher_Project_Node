import ServiceConfig from '../service-config'
import Util from '../../utils/Util'
import DBMySQL from '../../database/knex-mysql'
import ProFileModel from '../../database/mysql/mypage/ProFileModel'
import ProfileHistoryModel from '../../database/mysql/mypage/ProfileHistoryModel'

const ProFileServiceClass = class {
  constructor () {
    this.log_prefix = '[ProFileServiceClass]'
  }

  getProFileModel = (database = null) => {
    if (database) {
      return new ProFileModel(database)
    }
    return new ProFileModel(DBMySQL)
  }

  getProfileHistoryModel = (database = null) => {
    if (database) {
      return new ProfileHistoryModel(database)
    }
    return new ProfileHistoryModel(DBMySQL)
  }

  getProFileInfo = async (database, group_seq) => {
    try {
      const profile_model = this.getProFileModel(database)
      const profileinfo = await profile_model.getProFileInfo(group_seq)
      const json_profileinfo = JSON.parse(profileinfo.profile)
      profileinfo.profile_image_url = Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), profileinfo.profile_image_path)
      if (json_profileinfo !== null && json_profileinfo.image !== undefined) {
        json_profileinfo.image = Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), json_profileinfo.image)
      }
      profileinfo.profile = json_profileinfo
      return profileinfo
    } catch (e) {
      throw e
    }
  }

  updateProFileInfo = async (database, group_seq, upload_type, input_data) => {
    try {
      const profile_model = this.getProFileModel(database)
      const result = await profile_model.updateProFileInfo(group_seq, upload_type, input_data)
      return result && result.affectedRows
    } catch (e) {
      throw e
    }
  }

  changeCMFlag = async (database, group_seq, json_flag) => {
    try {
      const profile_model = this.getProFileModel(database)
      let result = null
      if (json_flag.type === 'channel') {
        result = await profile_model.updateChannelFlag(group_seq, json_flag.flag)
        if (json_flag.flag === 0) {
          result = await profile_model.updateMentoFlag(group_seq, 0)
        }
      } else {
        result = await profile_model.updateMentoFlag(group_seq, json_flag.flag)
      }
      return result
    } catch (e) {
      throw e
    }
  }

  writeProfileHistory = async (database, group_seq, member_seq, upload_type, previous_json, input_data) => {
    try {
      const model = this.getProfileHistoryModel(database)
      const new_json = {
        title: '',
        image: '',
        desc: '',
      }
      new_json[upload_type] = input_data
      const params = {
        group_seq, member_seq
        , previous_title: previous_json.title
        , previous_image_path: previous_json.image
        , previous_desc: previous_json.desc
        , new_title: new_json.title
        , new_image_path: new_json.image
        , new_desc: new_json.desc
      }
      const result = await model.createProfileHistory(params)
      return result
    } catch (e) {
      throw e
    }
  }
}

const profile_service = new ProFileServiceClass()

export default profile_service
