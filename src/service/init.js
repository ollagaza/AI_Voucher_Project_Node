import Util from '../utils/Util'
import log from '../libs/logger'
import MongoDB from '../database/mongo-db'
import ServiceConfig from "./service-config";
import NaverArchiveStorageService from './storage/naver-archive-storage-service'
import NaverObjectStorageService from './storage/naver-object-storage-service'
import SocketManager from './socket-manager'
// import VacsScheduler from '../scheduler/VacsScheduler'
import MongoDataService from './common/MongoDataService'
// import SchedulerManager from './scheduler-manager'
// import Member from "./member_list"
import kenx from '../database/knex-mysql'
import DBMySQL from "../database/mysql-model"


const initDirectories = async () => {
  await Util.createDirectory(ServiceConfig.get('common_root'))
  await Util.createDirectory(ServiceConfig.get('temp_directory_root'))
}

const checkConnectionDB = async () => {
  const check_result = await kenx.select([kenx.raw("'Y' as `check`")]).first()
  const is_connect_my_sql = check_result || check_result.check === 'Y'
  if (is_connect_my_sql) {
    log.debug('[InitService.checkConnectionDB]', 'MySQL Connect Success')
  } else {
    log.error('[InitService.checkConnectionDB]', 'MySQL Connect fail')
  }
  return check_result || check_result.check === 'Y'
}

export default {
  init: async () => {
    log.debug('[InitService]', 'init start')
    let is_connect_my_sql = await checkConnectionDB()
    while (!is_connect_my_sql) {
      await Util.sleep(5000)
      is_connect_my_sql = await checkConnectionDB()
    }
    await MongoDB.init()
    await MongoDB.defaultMongoCollections()
    await ServiceConfig.init()
    // await Member.init()
    await initDirectories()
    // await SocketManager.init()
    await MongoDataService.init()
    // SchedulerManager.init()
    if (ServiceConfig.isVacs() === false) {
      await NaverArchiveStorageService.init()
      await NaverObjectStorageService.init()
    } else {
      // VacsScheduler.startSchedule()
    }
    log.debug('[InitService]', 'init complete')
  }
}
