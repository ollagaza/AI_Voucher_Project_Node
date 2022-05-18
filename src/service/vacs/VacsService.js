import Util from '../../utils/Util'
import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql'
import log from '../../libs/logger'
import ServiceConfig from '../service-config'
import SocketManager from '../socket-manager'
import VacsStorageModel from '../../database/mysql/vacs/VacsStorageModel'

const VacsServiceClass = class {
  constructor () {
    this.log_prefix = '[VacsService]'
  }

  getVacsStorageModel = (database = null) => {
    if (!ServiceConfig.isVacs()) {
      return null
    }
    if (database) {
      return new VacsStorageModel(database)
    }
    return new VacsStorageModel(DBMySQL)
  }

  updateStorageStatusByApi = async (database, used, total) => {
    if (!ServiceConfig.isVacs()) {
      return null
    }
    return await this.updateStorageStatus(database, used, total)
  }

  updateStorageInfo = () => {
    if (!ServiceConfig.isVacs()) {
      return null
    }
    (
      async () => {
        try {
          const cmd = ServiceConfig.get('vacs_storage_info_cmd')
          const host = ServiceConfig.get('vacs_storage_ssh_host')
          const port = ServiceConfig.get('vacs_storage_ssh_port')
          const user = ServiceConfig.get('vacs_storage_ssh_user')
          const password = ServiceConfig.get('vacs_storage_ssh_password')
          const disable_vacs_storage_ssh = Util.isTrue(ServiceConfig.get('disable_vacs_storage_ssh'))

          let storage_info = null
          if (disable_vacs_storage_ssh) {
            const exec_result = await Util.execute(cmd)
            log.debug(this.log_prefix, '[updateStorageInfo]', 'exec_result', exec_result, cmd)
            if (exec_result.success && exec_result.out) {
              storage_info = JSON.parse(exec_result.out)
            } else {
              log.error(this.log_prefix, '[updateStorageInfo]', exec_result, cmd)
            }
          } else {
            const ssh_result = await Util.sshExec(cmd, host, port, user, password)
            log.debug(this.log_prefix, '[updateStorageInfo]', 'ssh_result', ssh_result, cmd)
            if (ssh_result.success && ssh_result.out) {
              storage_info = JSON.parse(ssh_result.out)
            } else {
              log.error(this.log_prefix, '[updateStorageInfo]', ssh_result, cmd)
            }
          }

          if (storage_info) {
            const update_result = await this.updateStorageStatus(null, storage_info.used, storage_info.total)
            const socket_data = {
              data: {
                type: 'storageInfoChange',
                used_size: update_result.used_size,
                total_size: update_result.total_size
              }
            }
            log.debug(this.log_prefix, '[updateStorageInfo]', 'SocketManager.sendToFrontAll', socket_data)
            await SocketManager.sendToFrontAll(socket_data)
          }
        } catch (error) {
          log.error(this.log_prefix, '[updateStorageInfo]', error)
        }
      }
    )()
  }

  updateStorageStatus = async (database, used, total) => {
    if (!ServiceConfig.isVacs()) {
      return null
    }
    let used_size = Util.parseInt(used, null)
    let total_size = Util.parseInt(total, null)
    log.debug(this.log_prefix, '[updateStorageStatus] - input', used_size, total_size)
    if (used === null || total === null) {
      throw new StdObject(-2, '잘못된 요청입니다.', 400)
    }
    used_size *= 1024
    total_size *= 1024
    const vacs_storage_model = this.getVacsStorageModel(database)
    const update_result = await vacs_storage_model.updateStorageStatus(Util.today('yyyymmdd'), used_size, total_size)
    log.debug(this.log_prefix, '[updateStorageStatus] - result', used_size, total_size, update_result)
    return { used_size, total_size, is_success: update_result }
  }

  getLastStatus = async () => {
    if (!ServiceConfig.isVacs()) {
      return null
    }
    const vacs_storage_model = this.getVacsStorageModel()
    return await vacs_storage_model.getCurrentStorageStatus()
  }

  getCurrentStorageStatus = async () => {
    if (!ServiceConfig.isVacs()) {
      return null
    }
    const current_status = await this.getLastStatus()
    const result = { used_size: 0, total_size: 0, upload_count: 0, delete_count: 0 }
    if (current_status) {
      result.used_size = Util.parseInt(current_status.used_size, 0)
      result.total_size = Util.parseInt(current_status.total_size, 0)
      result.upload_count = Util.parseInt(current_status.upload_count, 0)
      result.delete_count = Util.parseInt(current_status.delete_count, 0)
    }
    return result
  }

  increaseCount = (upload_count = 0, delete_count = 0) => {
    if (!ServiceConfig.isVacs()) {
      return null
    }
    (
      async () => {
        try {
          const today = Util.parseInt(Util.today('yyyymmdd'))
          const vacs_storage_model = this.getVacsStorageModel()
          const last_status = await this.getLastStatus()
          log.debug(this.log_prefix, '[increaseCount]', 'last_status', last_status)
          let last_date = null
          let used_size = 0
          let total_size = 0
          if (last_status) {
            last_date = Util.parseInt(last_status.state_date)
            used_size = Util.parseInt(last_status.used_size, 0)
            total_size = Util.parseInt(last_status.total_size, 0)
          }
          if (last_date !== today) {
            const update_result = await this.updateStorageStatus(null, used_size, total_size)
            if (!update_result.is_success) {
              return
            }
          }
          await vacs_storage_model.increaseCount(today, upload_count, delete_count)
        } catch (error) {
          log.error(this.log_prefix, '[increaseCount]', error)
        }
      }
    )()
  }
}

const vacs_service = new VacsServiceClass()
export default vacs_service
