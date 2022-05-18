import EventEmitter from 'events'
import io from 'socket.io-client'
import log from '../libs/logger'
import Util from '../utils/Util'
import ServiceConfig from './service-config'
// import GroupService from './member/GroupService'

const SocketManagerClass = class extends EventEmitter {
  constructor () {
    super()
    this.log_prefix = '[SocketManager]'
  }

  init = async () => {
    this.uId = Util.getContentId()
    this.ip = ServiceConfig.get('socket_relay_server_ip')
    this.port = ServiceConfig.get('socket_relay_server_port')
    log.debug(this.log_prefix, `[init]`, `connect to ${this.ip}:${this.port}/backend`)
    this.socket = io(`${this.ip}:${this.port}/backend`, {
      path: '/',
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 60000,
      reconnectionDelayMax: 60000,
      timeout: 1000,
      query: {
        uId: this.uId,
        hostname: process.env.HOSTNAME,
      }
    })

    this.socket.on('connect', () => {
      log.debug(this.log_prefix, '[connect]', 'Connect socket.id : ', this.socket.id)
    })

    this.socket.on('disconnet', () => {
      log.debug(this.log_prefix, '[disconnet]', 'Disconnect socket.id : ', this.socket.id)
    })

    this.socket.on('reconnect', (attemptNumber) => {
      log.debug(this.log_prefix, '[reconnect]', 'reconnect attemptNum:', attemptNumber, ' Socket ID:', this.socket.id)
    })

    this.socket.on('reconnecting', (attemptNumber) => {
      log.debug(this.log_prefix, '[reconnecting]', 'reconnecting attemptNum:', attemptNumber, ' Socket ID:', this.socket.id)
    })

    this.socket.on('reconnect_error', (error) => {
      log.debug(this.log_prefix, '[reconnect_error]', 'Reconnect Error:', error)
    })

    this.socket.on('error', (error) => {
      log.debug(this.log_prefix, '[error]', 'Error:', error)
    })

    this.socket.on('connect_error', (error) => {
      log.debug(this.log_prefix, '[connect_error]', 'Connect Error:', error)
    })

    this.socket.on('status', this.onStatus)
    this.socket.on('sendMsg', this.onSendMsg)
    this.socket.on('reloadServiceConfig', this.onReloadServiceConfig)
  }

  sendMsg = async (data) => {
    log.debug(this.log_prefix, '[sendMsg]', data)
    this.socket.emit('sendMsg', data)
  }

  onSendMsg = async (data) => {
    log.debug(this.log_prefix, '[onSendMsg]', data)

  }

  onStatus = async () => {
    // log.debug(this.log_prefix, '[onStatus]', this.socket.id );
    this.socket.emit('status', this.uId)
  }

  onReloadServiceConfig = async () => {
    log.debug(this.log_prefix, '[onReloadServiceConfig]')
    this.emit('onReloadServiceConfig')
  }

  requestReloadService = async () => {
    this.socket.emit('reloadServiceConfig')
  }

  sendToFrontOne = async (member_seq, data = null) => {
    this.socket.emit('sendFrontMsg', member_seq, data)
  }

  sendToFrontMulti = async (user_id_list, data = null) => {
    this.socket.emit('sendFrontMsgMulti', user_id_list, data)
  }

  sendToFrontAll = async (data) => {
    this.socket.emit('sendFrontGloMsg', data)
  }

  sendToFrontGroup = async (group_seq, data = null) => {
    this.socket.emit('sendMessageToGroup', group_seq, data)
  }

  sendToFrontGroupOne = async (group_seq, member_seq, data = null) => {
    this.socket.emit('sendMessageToGroupOne', group_seq, member_seq, data)
  }
}

const socketManager = new SocketManagerClass()

export default socketManager
