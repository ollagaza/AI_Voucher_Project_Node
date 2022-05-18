import Promise from 'promise'
import mongoose from 'mongoose'
import mongodb_config from '../config/mongodb.config'
import Config from '../config/config'
import log from '../libs/logger'
import Constants from '../constants/constants'
import { MedicalModel } from './mongodb/Medical'
import { InterestModel } from './mongodb/Interest'
import { LogCodeModel } from './mongodb/MemberLogCode'
import { initSystemData } from './mongodb/SystemData'
import DynamicService from "../service/dynamic/DynamicService";
import config from "../config/config";

const LOG_PREFIX = '[MongoDB]\n'

const ENV = Config.getEnv()
const database_config = Config.isLocal() ? mongodb_config[Constants.LOCAL] : mongodb_config[ENV]
if (Config.getMongoDBHost()) {
  database_config.domain = Config.getMongoDBHost()
}
log.info(LOG_PREFIX, 'connection config', database_config, Config.getMongoDBHost())

const init = () => {
  return new Promise(resolve => {
    const db = mongoose.connection
    db.on('error', log.error)
    db.once('open', function () {
      log.debug(LOG_PREFIX, 'Connected to mongod server')
    })

    mongoose.Promise = Promise
    mongoose.connect(`mongodb://${database_config.user}:${database_config.password}@${database_config.domain}:${database_config.port}/${database_config.database}`, {
      useNewUrlParser: true,
      useFindAndModify: true,
      useUnifiedTopology: true,
      useCreateIndex: true
    })
      .then(() => {
        log.debug(LOG_PREFIX, 'Successfully connected to mongodb')
        resolve(true)
      })
      .catch((error) => {
        log.error(LOG_PREFIX, 'mongodb connection error', error)
        resolve(false)
      })
  })
}

const defaultMongoCollections = async () => {
  if (config.isDemon()) {
    const medical = await MedicalModel.findOne()
    await MedicalModel.InsertDefaultData(medical)

    const interest = await InterestModel.findOne()
    await InterestModel.InsertDefaultData(interest)

    const log_code = await LogCodeModel.findOne()
    await LogCodeModel.InsertDefaultData(log_code)

    // 임시로 하나만 작성해서 디폴트로 올림.
    await DynamicService.setJsonTemplateData()
  }

  await initSystemData()
}

export default {
  init,
  defaultMongoCollections
}
