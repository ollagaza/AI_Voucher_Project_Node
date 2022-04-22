import Promise from 'promise'
import fs from 'fs'
import dateFormat from 'dateformat'
import { promisify } from 'util'
import { exec, spawn } from 'child_process'
import _ from 'lodash'
import xml2js from 'xml2js'
import aes256 from 'nodejs-aes256'
import base64url from 'base64-url'
// import uuidv1 from 'uuid/v1'
import http from 'http'
import https from 'https'
import path from 'path'
import multer from 'multer'
import crypto from 'crypto'
import request from 'request-promise'
import GetDimension from 'get-video-dimensions'
import GetDuration from 'get-video-duration'
import JsonPath from 'jsonpath'
import mime from 'mime-types'
import moment from 'moment'
import SSH from 'ssh-exec'
import ServiceConfig from '../service/service-config'
import log from '../libs/logger'
import StdObject from '../wrapper/std-object'
import Constants from '../constants/constants'
import numeral from 'numeral';
import ExifReader from 'exifreader'
import EventEmitter from 'events'

const XML_PARSER = new xml2js.Parser({ trim: true })
const XML_BUILDER = new xml2js.Builder({ trim: true, cdata: true })
const XML_TO_JSON = new xml2js.Parser({ trim: true, explicitArray: false })

const RANDOM_KEY_SPACE = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
const TIMEZONE_OFFSET = new Date().getTimezoneOffset() * 60000
const NEW_LINE_REGEXP = /\r?\n/g

const PATH_EXP = new RegExp(/\//, 'g')

const log_prefix = '[Util]'

const removePathSEQ = (media_path) => {
  return media_path.replace(/SEQ.*$/i, '')
}

const getMediaDirectory = (media_root, media_path) => {
  const path = removePathSEQ(media_path)

  return media_root + path
}

const getUrlPrefix = (media_root, media_path, remove_seq = true) => {
  if (!media_path) {
    return null
  }
  let full_path = media_root + (remove_seq ? removePathSEQ(media_path) : media_path)
  full_path = full_path.replace(PATH_EXP, '/')
  full_path = full_path.replace(/^\/+/g, '')

  return '/' + full_path
}

const timeStrToSecond = (time_str) => {
  let sec = 0
  let multi = 1
  const time_list = time_str.split(':')
  const list_length = time_list.length

  for (let i = list_length - 1; i >= 0; i--) {
    sec += getInt(time_list[i], 10) * multi
    multi *= 60
  }

  return sec
}

const dateFormatter = (timestamp, format = 'HH:MM:ss', use_offset) => {
  if (use_offset) {
    timestamp += TIMEZONE_OFFSET
  }
  return dateFormat(timestamp, format)
}

const fileExists = async (file_path, permission = null) => {
  const async_func = new Promise(resolve => {
    if (!permission) {
      permission = fs.constants.W_OK
    }
    try {
      fs.access(file_path, permission, (error) => {
        if (error) {
          // log.error(log_prefix, 'Util.fileExists', error);
          resolve(false)
        } else {
          resolve(true)
        }
      })
    } catch (e) {
      log.error(log_prefix, 'fileExists', file_path, e)
      resolve(false)
    }
  })

  return await async_func
}

const readFile = async (file_path) => {
  return new Promise(async resolve => {
    if (!(await fileExists(file_path))) {
      log.debug(log_prefix, 'Util.readFile', `file not exists. path=${file_path}`)
      resolve(null)
    } else {
      const read_stream = fs.createReadStream(file_path)
      const body = []
      read_stream.setEncoding('utf8')
      read_stream.on('data', (chunk) => {
        body.push(Buffer.from(chunk))
      })
      read_stream.on('end', () => {
        resolve(Buffer.concat(body).toString())
      })
      read_stream.on('error', function (error) {
        log.error(log_prefix, 'Util.readFile', `path=${file_path}`, error)
        resolve(null)
      })
    }
  })
}

const writeFile = async (file_path, context, is_text = true) => {
  return new Promise(async resolve => {
    // 쓰기를 위한 스트림 생성
    const write_stream = fs.createWriteStream(file_path)

    write_stream.on('finish', function () {
      resolve(true)
    })

    write_stream.on('error', function (error) {
      log.error(log_prefix, 'Util.writeFile', `path=${file_path}`, error)
      resolve(false)
    })

    if (is_text) {
      write_stream.write(context, 'utf8')
    } else {
      write_stream.write(context)
    }
    write_stream.end()
  })
}

const renameFile = async (target_path, dest_path) => {
  return new Promise(async resolve => {
    if (!(await fileExists(target_path))) {
      log.debug(log_prefix, 'Util.renameFile', `file not exists. target_path=${target_path}`)
      resolve(false)
    } else if ((await fileExists(dest_path))) {
      log.debug(log_prefix, 'Util.renameFile', `file already exists. dest_path=${dest_path}`)
      resolve(false)
    } else {
      try {
        fs.rename(target_path, dest_path, (error) => {
          if (error) {
            log.error(log_prefix, 'Util.renameFile', `target_path=${target_path}, dest_path=${dest_path}`, error)
            resolve(false)
          } else {
            resolve(true)
          }
        })
      } catch (error) {
        log.error(log_prefix, 'Util.renameFile', `target_path=${target_path}, dest_path=${dest_path}`, error)
        resolve(false)
      }
    }
  })
}

const copyFile = async (target_path, dest_path) => {
  return new Promise(async resolve => {
    if (!(await fileExists(target_path))) {
      log.debug(log_prefix, 'Util.renameFile', `file not exists. target_path=${target_path}`)
      resolve(false)
    } else if (await fileExists(dest_path)) {
      log.debug(log_prefix, 'Util.renameFile', `file already exists. target_path=${dest_path}`)
      resolve(false)
    } else {
      try {
        fs.copyFile(target_path, dest_path, (error) => {
          if (error) {
            log.error(log_prefix, 'Util.copyFile', `target_path=${target_path}, dest_path=${dest_path}`, error)
            resolve(false)
          } else {
            resolve(true)
          }
        })
      } catch (error) {
        log.error(log_prefix, 'Util.copyFile', `target_path=${target_path}, dest_path=${dest_path}`, error)
        resolve(false)
      }
    }
  })
}

const copyDirectory = async (path, dest_path, ignore_error = true) => {
  const file_list = await getDirectoryFileList(path)
  let has_error = false
  const result_list = []
  for (let i = 0; i < file_list.length; i++) {
    const file = file_list[i]
    const file_name = path + '/' + file.name
    const dest_file_name = dest_path + '/' + file.name
    if (file.isDirectory()) {
      await createDirectory(dest_file_name)
      const copy_directory_result = await copyDirectory(file_name, dest_file_name)
      result_list.push({ type: 'directory', origin: file_name, dest: dest_file_name, result: copy_directory_result})
      if (copy_directory_result.has_error) has_error = true
      if (has_error && !ignore_error) break;
    } else {
      const copy_result = await copyFile(file_name, dest_file_name)
      result_list.push({ type: 'file', origin: file_name, dest: dest_file_name, result: copy_result})
      if (!copy_result) has_error = true
      if (has_error && !ignore_error) break;
    }
  }
  // log.debug(log_prefix, 'copyDirectory', path, dest_path, has_error, result_list)
  return {
    has_error,
    result_list
  }
}

const getFileStat = async (file_path) => {
  return new Promise(async resolve => {
    if (!(await fileExists(file_path))) {
      log.debug(log_prefix, 'Util.getFileStat', `file not exists. path=${file_path}`)
      resolve(null)
    } else {
      fs.stat(file_path, (error, stats) => {
        if (error) {
          log.error(log_prefix, 'Util.getFileStat', `path=${file_path}`, error)
          resolve(null)
        } else {
          resolve(stats)
        }
      })
    }
  })
}

const createDirectory = async (dir_path) => {
  if (!dir_path) return false
  return new Promise(async resolve => {
    if ((await fileExists(dir_path))) {
      log.debug(log_prefix, 'Util.createDirectory', `directory already exists. path=${dir_path}`)
      resolve(true)
    } else {
      fs.mkdir(dir_path, { recursive: true }, (error) => {
        if (error) {
          log.error(log_prefix, 'Util.createDirectory', `path=${dir_path}`, error)
          resolve(false)
        } else {
          resolve(true)
        }
      })
    }
  })
}

const removeDirectory = async (dir_path) => {
  return new Promise(async resolve => {
    if (!(await fileExists(dir_path))) {
      resolve(true)
    } else {
      fs.rmdir(dir_path, (error) => {
        if (error) {
          log.error(log_prefix, 'Util.removeDirectory', `path=${dir_path}`, error)
          resolve(false)
        } else {
          resolve(true)
        }
      })
    }
  })
}

const deleteFile = async (target_path) => {
  return new Promise(async resolve => {
    if (!(await fileExists(target_path))) {
      // log.debug(log_prefix, 'Util.deleteFile', `file not exists. path=${target_path}`);
      resolve(true)
    } else {
      fs.unlink(target_path, (error) => {
        if (error) {
          log.error(log_prefix, 'Util.deleteFile', `path=${target_path}`, error)
          resolve(false)
        } else {
          // log.debug(log_prefix, 'Util.deleteFile', `path=${target_path}`);
          resolve(true)
        }
      })
    }
  })
}

const deleteDirectory = async (path) => {
  const file_list = await getDirectoryFileList(path)
  for (let i = 0; i < file_list.length; i++) {
    const file = file_list[i]
    if (file.isDirectory()) {
      await deleteDirectory(path + '/' + file.name)
      await removeDirectory(path + '/' + file.name)
      // log.debug(log_prefix, 'delete sub dir', path + '/' + file.name, delete_directory_result);
    } else {
      await deleteFile(path + '/' + file.name)
      // log.debug(log_prefix, 'delete sub file', path + '/' + file.name, delete_file_result);
    }
  }
  await removeDirectory(path)
  // log.debug(log_prefix, 'delete root dir', path, delete_root_result);
}

const getDirectoryFileList = async (directory_path, dirent = true) => {
  return new Promise(async resolve => {
    if (!(await fileExists(directory_path))) {
      log.debug(log_prefix, 'Util.getDirectoryFileList', `directory not exists. path=${directory_path}`)
      resolve([])
    } else {
      fs.readdir(directory_path, { withFileTypes: dirent }, (error, files) => {
        if (error) {
          log.error(log_prefix, 'Util.getDirectoryFileList', `path=${directory_path}`, error)
          resolve([])
        } else {
          resolve(files)
        }
      })
    }
  })
}

const getDirectoryFileSize = async (directory_path) => {
  const file_list = await getDirectoryFileList(directory_path)
  let file_size = 0
  for (let i = 0; i < file_list.length; i++) {
    const file = file_list[i]
    if (file.isFile()) {
      const file_info = await getFileStat(directory_path + '/' + file.name)
      if (file_info && file_info.size) {
        file_size += file_info.size
      }
    }
  }
  return file_size
}

const getFileSize = async (file_path) => {
  const file_info = await getFileStat(file_path)
  if (file_info && file_info.size) {
    return file_info.size
  }
  return 0
}

const loadXmlString = async (context) => {
  let result = {}
  if (!isEmpty(context)) {
    try {
      result = await promisify(XML_PARSER.parseString.bind(XML_PARSER))(context)
    } catch (error) {
      log.error(log_prefix, 'Util.loadXmlString', error)
    }
  }
  return result
}

const isBoolean = (str) => {
  return str === true || str === false;
}
const isNumber = (str) => {
  try {
    return !isNaN(parseFloat(str)) && isFinite(str)
  } catch (e) {
    return false
  }
}

const getInt = (str, on_error_result = 0) => {
  if (isNumber(str)) {
    try {
      return parseInt(str, 10)
    } catch (e) {
      return on_error_result
    }
  } else {
    return on_error_result
  }
}

const getFloat = (str, on_error_result = 0) => {
  if (isNumber(str)) {
    try {
      return parseFloat(str)
    } catch (e) {
      return on_error_result
    }
  } else {
    return on_error_result
  }
}

const isArray = (value) => {
  if (!value) {
    return false
  }
  return _.isArray(value)
}

const isObject = (value) => {
  if (!value) {
    return false
  }
  return _.isObject(value)
}

const isString = (value) => {
  if (value === '') {
    return true
  }
  if (!value) {
    return false
  }
  return _.isString(value)
}

const isEmpty = (value, allow_blank = false, allow_empty_array = false) => {
  if (value === undefined || value === null) {
    return true
  }
  if (value instanceof Date) {
    return false
  }
  if (value === true || value === false) {
    return false
  }
  if (isNumber(value)) {
    return false
  }
  if (isString(value)) {
    return allow_blank ? false : _.trim(value) === ''
  }
  if (isArray(value)) {
    if (allow_empty_array) {
      return false
    }
    return value.length === 0
  }
  return _.isEmpty(value)
}

const execute = async (command) => {
  const result = {
    success: false,
    message: '',
    out: null,
    command: command
  }
  try {
    const exec_result = await promisify(exec)(command)
    result.success = true
    result.out = exec_result.stdout
  } catch (error) {
    log.error(log_prefix, 'Util.execute', error)
    result.message = error.message
  }
  return result
}

const executeSpawn = (command, args = [], spawn_options = {}, on_start = null, out_encoding = 'utf8', err_encoding = 'utf8') => {
  const event_emitter = new EventEmitter()
  const execute_command = `${command} ${args ? args.join(' ') : ''}`
  // log.debug(log_prefix, '[execute]', `[command = ${execute_command}]`, spawn_options)
  if (on_start && typeof on_start === 'function') {
    on_start(execute_command)
  }
  if (!spawn_options) spawn_options = {}
  const process = spawn(command, args, spawn_options)
  if (out_encoding) {
    process.stdout.setEncoding(out_encoding)
  }
  process.stdout.on('data', data => {
    event_emitter.emit('onData', data)
  })
  process.stdout.on('end', data => {
    event_emitter.emit('onEnd', data)
  })
  if (err_encoding) {
    process.stderr.setEncoding(err_encoding)
  }
  process.stderr.on('data', data => {
    event_emitter.emit('onError', data)
  })
  process.on('exit', code => {
    event_emitter.emit('onExit', code)
  })
  event_emitter.on('kill', (signal = null) => {
    process.kill(signal || 'SIGKILL')
  })
  event_emitter.on('finish', () => {
    event_emitter.removeAllListeners()
  })

  return event_emitter
}

const sshExec = async (cmd, host, port = 22, user = 'mteg_vas', password = 'dpaxldlwl_!') => {
  return new Promise(async resolve => {
    SSH(cmd, {
      host,
      port,
      user,
      password
    }, function (error, result, stderr) {
      log.debug(log_prefix, '[sshExec]', cmd, error, result, stderr)
      const response = {
        success: true,
        out: result
      }
      if (error) {
        response.success = false
        response.error = error
        response.stderr = stderr
      }
      resolve(response)
    })
  })
}

const getMediaInfo = (media_path) => {
  log.debug(log_prefix, 'getMediainfo', media_path);
  return new Promise((resolve) => {
    const media_result = {
      success: false,
      media_type: Constants.NO_MEDIA,
      file_size: 0,
      media_info: {}
    }

    const spawn = executeSpawn('mediainfo', ['--Full', '--Output=XML', media_path], {}, (cmd) => { log.debug(log_prefix, 'getMediaInfo_execute_onstart', cmd) })
    let mediainfo_data = ''
    let mediainfo_error_data = ''
    spawn.on('onData', (data) => {
      mediainfo_data += data
    })
    spawn.on('onError', (data) => {
      mediainfo_error_data += data
    })
    spawn.on('onExit', (code) => {
      // log.debug(log_prefix, '[getMediaInfo - executeSpawn]', code, mediainfo_data, mediainfo_error_data)
      if (code === 0) {
        (
          async (mediainfo_data) => {
            let media_info_xml = null
            try {
              media_info_xml = await loadXmlString(mediainfo_data)
            } catch (error) {
              log.error(log_prefix, 'getMediaInfo - loadXmlString', error)
              resolve(media_result)
              return
            }
            const media_info = JsonPath.value(media_info_xml, '$..track')
            if (media_info && media_info.length > 0) {
              for (let i = 0; i < media_info.length; i++) {
                const track = media_info[i]
                if (track.$ && track.$.type) {
                  const track_type = track.$.type.toLowerCase()
                  const duration = Math.round(getFloat(getXmlText(track.Duration)))
                  const width = getInt(getXmlText(track.Width))
                  const height = getInt(getXmlText(track.Height))
                  const file_size = Math.max(getFloat(getXmlText(track.FileSize)), getFloat(getXmlText(track.File_size)))
                  const fps = Math.max(getFloat(getXmlText(track.FrameRate)), getFloat(getXmlText(track.Frame_rate)))
                  const frame_count = Math.max(getFloat(getXmlText(track.FrameCount)), getFloat(getXmlText(track.Frame_count)))
                  const sample_rate = Math.max(getFloat(getXmlText(track.SamplingRate)), getFloat(getXmlText(track.Sampling_rate)))
                  const bit_depth = Math.max(getFloat(getXmlText(track.BitDepth)), getFloat(getXmlText(track.Bit_depth)))
                  const format = getXmlText(track.Format)
                  const profile = getXmlText(track.Format_Profile)
                  const level = getXmlText(track.Format_Level)
                  const bit_rate = getFloat(getXmlText(track.BitRate))
                  if (track_type === 'general') {
                    media_result.file_size = file_size
                    media_result.format = getXmlText(track.Format)
                  } else if (track_type === Constants.VIDEO) {
                    media_result.media_type = Constants.VIDEO
                    media_result.media_info.width = width
                    media_result.media_info.height = height
                    media_result.media_info.fps = fps
                    media_result.media_info.frame_count = frame_count
                    media_result.media_info.duration = duration
                    media_result.media_info.bit_depth = bit_depth
                    media_result.media_info.bit_rate = bit_rate
                    media_result.media_info.format = format
                    media_result.media_info.profile = profile
                    media_result.media_info.level = level
                    media_result.success = true
                    break
                  } else if (track_type === Constants.AUDIO) {
                    media_result.media_type = Constants.AUDIO
                    media_result.media_info.format = format
                    media_result.media_info.bit_rate = bit_rate
                    media_result.media_info.duration = duration
                    media_result.media_info.sample_rate = sample_rate
                    media_result.success = true
                    break
                  } else if (track_type === Constants.IMAGE) {
                    media_result.media_type = Constants.IMAGE
                    media_result.media_info.format = format
                    media_result.media_info.width = width
                    media_result.media_info.height = height
                    media_result.success = true
                    break
                  } else {
                    media_result.success = false
                  }
                }
              }
            }

            resolve(media_result)
          }
        )(mediainfo_data)
      }
      else {
        log.error(log_prefix, 'getMediaInfo', mediainfo_error_data)
        resolve(media_result)
      }
    })

    // ;(
    //   async (media_path) => {
    //
    //     const mediainfo_cmd = `mediainfo --Full --Output=XML "${media_path}"`
    //     log.debug(log_prefix, '[getMediaInfo] - mediainfo_cmd', mediainfo_cmd)
    //     const execute_result = await execute(mediainfo_cmd)
    //
    //     try {
    //       if (execute_result.success && execute_result.out) {
    //         const media_info_xml = await loadXmlString(execute_result.out)
    //         const media_info = JsonPath.value(media_info_xml, '$..track')
    //         if (media_info && media_info.length > 0) {
    //           for (let i = 0; i < media_info.length; i++) {
    //             const track = media_info[i]
    //             if (track.$ && track.$.type) {
    //               const track_type = track.$.type.toLowerCase()
    //               const duration = Math.round(getFloat(getXmlText(track.Duration)))
    //               const width = getInt(getXmlText(track.Width))
    //               const height = getInt(getXmlText(track.Height))
    //               const fps = Math.max(getFloat(getXmlText(track.FrameRate)), getFloat(getXmlText(track.Frame_rate)))
    //               const frame_count = Math.max(getFloat(getXmlText(track.FrameCount)), getFloat(getXmlText(track.Frame_count)))
    //               const sample_rate = Math.max(getFloat(getXmlText(track.SamplingRate)), getFloat(getXmlText(track.Sampling_rate)))
    //               const bit_depth = Math.max(getFloat(getXmlText(track.BitDepth)), getFloat(getXmlText(track.Bit_depth)))
    //               if (track_type === Constants.VIDEO) {
    //                 media_result.media_type = Constants.VIDEO
    //                 media_result.media_info.width = width
    //                 media_result.media_info.height = height
    //                 media_result.media_info.fps = fps
    //                 media_result.media_info.frame_count = frame_count
    //                 media_result.media_info.duration = duration
    //                 media_result.media_info.bit_depth = bit_depth
    //                 media_result.success = true
    //                 break
    //               } else if (track_type === Constants.AUDIO) {
    //                 media_result.media_type = Constants.AUDIO
    //                 media_result.media_info.duration = duration
    //                 media_result.media_info.sample_rate = sample_rate
    //                 media_result.success = true
    //                 break
    //               } else if (track_type === Constants.IMAGE) {
    //                 media_result.media_type = Constants.IMAGE
    //                 media_result.media_info.width = width
    //                 media_result.media_info.height = height
    //                 media_result.success = true
    //                 break
    //               } else {
    //                 media_result.success = false
    //               }
    //             }
    //           }
    //         }
    //       }
    //     } catch (error) {
    //       log.error(log_prefix, 'getMediaInfo', error, execute_result)
    //     }
    //
    //     resolve(media_result)
    //   }
    // )(media_path)
  })
}

const getVideoDimension = async (video_path) => {
  const result = {
    success: false,
    message: ''
  }
  try {
    const dimensions = await GetDimension(video_path)
    result.success = true
    result.width = dimensions.width
    result.height = dimensions.height
  } catch (error) {
    log.error(log_prefix, 'getVideoDimension', error)
    result.message = error.message
  }
  return result
}

const getVideoDuration = async (video_path) => {
  const result = {
    success: false,
    message: ''
  }
  try {
    const duration = await GetDuration.getVideoDurationInSeconds(video_path)
    result.success = true
    result.duration = duration
  } catch (error) {
    log.error(log_prefix, 'getVideoDuration', error)
    result.message = error.message
  }
  return result
}

const executeFFmpeg = (args = [], spawn_option = {}, progress_callback = null) => {
  return new Promise(resolve => {
    const result = {
      success: false,
      message: '',
      out: null,
      command: null
    }

    const spawn = executeSpawn('ffmpeg', args, spawn_option, (cmd) => {
      result.command = cmd
    })

    let error_data = ''
    spawn.on('onError', (data) => {
      if (progress_callback) {
        progress_callback(data)
      }
      error_data += data + '\n'
    })
    spawn.on('onExit', (code) => {
      result.success = code === 0
      if (!result.success) {
        result.message = error_data
        spawn.emit('kill')
      } else {
        result.out = error_data
      }
      spawn.emit('finish')
      resolve(result)
    })
  })
}

const getImageScaling = async (origin_path, scaling_path = null, scaling_type = 'width', scaling_size = 1380, overwrite = true) => {
  const args = []
  if (overwrite) {
    args.push('-y')
  }
  args.push('-i')
  args.push(origin_path)

  const scaling_str = scaling_type === 'width' ? `${scaling_size}:-1` : `-1:${scaling_size}`
  args.push('-vf')
  args.push(`scale=${scaling_type}=${scaling_str} `)

  args.push('-an')

  args.push(overwrite ? origin_path : scaling_path)

  return executeFFmpeg(args)
}

const getThumbnail = async (origin_path, resize_path, second = -1, width = -1, height = -1, media_info = null, is_rotate = false) => {
  const args = []
  args.push('-y')
  if (second > 0) {
    const time_str = secondToTimeStr(second, 'HH:MM:ss', true)
    // time_option = `-ss ${time_str}`
    args.push('-ss')
    args.push(time_str)
  }
  args.push('-i')
  args.push(origin_path)
  args.push('-vframes')
  args.push(1)
  if (width > 0 && height > 0) {
    let dimension = null
    if (media_info) {
      if (media_info.width) {
        dimension = {
          width: media_info.width,
          height: media_info.height
        }
      } else if (media_info.media_info) {
        dimension = {
          width: media_info.media_info.width,
          height: media_info.media_info.height
        }
      }
    }

    if (!dimension) {
      dimension = await getVideoDimension(origin_path)
    }
    if (!dimension || dimension.width <= 0 || dimension.height <= 0) {
      return { success: false }
    }

    const w_ratio = dimension.width / width
    const h_ratio = dimension.height / height
    if (is_rotate) {
      const temp = width
      width = height
      height = temp
    }
    let crop_option
    if (w_ratio >= h_ratio) {
      crop_option = `crop=in_h*${width}/${height}:in_h`
    } else {
      crop_option = `crop=in_w:in_w*${height}/${width}`
    }
    const scale_option = `scale=${width}:${height}`
    // filter = `-filter:v "${crop_option},${scale_option}"`
    args.push('-filter:v')
    if (is_rotate) {
      args.push(`${crop_option},${scale_option},transpose=dir=1`)
    } else {
      args.push(`${crop_option},${scale_option}`)
    }
  }
  args.push('-an')
  args.push(resize_path)

  return executeFFmpeg(args)
}

const resizeImage = async (origin_path, resize_path, width = -1, height = -1, media_info = null, is_rotate = false) => {
  const args = []
  args.push('-y')
  args.push('-i')
  args.push(origin_path)
  if (width > 0 && height > 0) {
    let dimension = null
    if (media_info) {
      if (media_info.width) {
        dimension = {
          width: media_info.width,
          height: media_info.height
        }
      } else if (media_info.media_info) {
        dimension = {
          width: media_info.media_info.width,
          height: media_info.media_info.height
        }
      }
    } else {
      dimension = await getVideoDimension(origin_path)
    }
    if (!dimension || dimension.width <= 0 || dimension.height <= 0) {
      return { success: false }
    }

    if (is_rotate) {
      const temp = width
      width = height
      height = temp
    }
    const scale_option = `scale=${width}:${height}`
    // filter = `-filter:v "${crop_option},${scale_option}"`
    args.push('-filter:v')
    if (is_rotate) {
      args.push(`${scale_option},transpose=dir=1`)
    } else {
      args.push(`${scale_option}`)
    }
  }
  args.push('-q:v')
  args.push(1)
  args.push('-an')
  args.push(resize_path)

  return executeFFmpeg(args)
}

const secondToTimeStr = (second, format = 'HH:MM:ss', use_decimal_point = false) => {
  let date_str = dateFormatter(second * 1000, format, true)
  if (use_decimal_point) {
    const second_str = `${second}`
    const point_index = second_str.indexOf('.')
    if (point_index >= 0) {
      const decimal_str = second_str.substring(point_index + 1)
      if (!isEmpty(decimal_str)) {
        date_str += `.${decimal_str}`
      }
    }
  }
  return date_str
}

const hexToRGB = (hex) => {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i
  hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b)

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result && result.length >= 4 ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : {
    r: 0,
    g: 0,
    b: 0,
  }
}

const getRandomString = (length = 10) => {
  let str = ''
  const space_length = RANDOM_KEY_SPACE.length
  for (let i = 0; i < length; i++) {
    str += RANDOM_KEY_SPACE[Math.floor(Math.random() * space_length)]
  }
  return str
}

const getRandomNumber = (length = 10) => {
  const rand = Math.random()
  const multi = Math.pow(10, length + 1) * 1.0
  const result = Math.round(rand * multi).toString()
  return result.substr(result.length - length)
}

const colorCodeToHex = (color_code) => {
  const rgb = hexToRGB(color_code)
  return '0x' + ((rgb.r << 16) + (rgb.g << 8) + rgb.b).toString(16)
}

const isTrue = (value) => {
  const str = (`${value}`).toLowerCase()
  return str === 'y' || str === '1' || str === 'true'
}

const isFalse = (value) => {
  const str = (`${value}`).toLowerCase()
  return str === 'n' || str === 'false'
}

const urlToPath = (url, editor_path = false) => {
  const service_info = ServiceConfig.getServiceInfo()
  const check_regex = /^\/static\/(index|storage|video)\/(.+)$/g
  const result = check_regex.exec(url)
  let sep = '/'
  if (editor_path) {
    // sep = service_info.auto_editor_sep;
  }
  let path = null
  if (result && result.length === 3) {
    let prefix = null
    const url_type = result[1]
    switch (url_type) {
      case 'index':
        if (editor_path) {
          prefix = service_info.auto_editor_index_root
        } else {
          prefix = service_info.hawkeye_data_directory
        }
        break
      case 'storage':
        if (editor_path) {
          prefix = service_info.auto_editor_file_root
        } else {
          prefix = service_info.media_root
        }
        break
      case 'video':
        if (editor_path) {
          prefix = service_info.auto_editor_video_root
        } else {
          prefix = service_info.trans_video_root
        }
        break
      default:
        break
    }
    path = (prefix ? prefix + sep : '') + result[2]
  } else {
    path = url
  }
  path = path.replace(/\//g, sep)
  // log.debug(log_prefix, '[urlToPath]', url, path)
  return path
}

const getRandomId = () => `${Math.floor(Date.now() / 1000)}_${getRandomString(5)}`

const getFileExt = file_name => path.extname(file_name || '.').toLowerCase().substr(1)
const getFileName = file_name => path.basename(file_name)
const getDirectoryName = file_name => path.dirname(file_name)

const getXmlText = (element) => {
  if (!element) {
    return ''
  }
  if (element._) {
    return element._
  }
  if (_.isArray(element)) {
    return element[0]
  }
  return element
}

const getFileType = async (file_path, file_name) => {
  const file_ext = getFileExt(file_name)
  if (file_ext === 'smil') {
    return 'smil'
  }

  const media_info = await getMediaInfo(file_path)
  switch (media_info.media_type) {
    case Constants.VIDEO:
      return Constants.VIDEO
    case Constants.AUDIO:
      return Constants.AUDIO
    case Constants.IMAGE:
      return Constants.IMAGE
    default:
      break
  }

  return getMimeType(file_path, file_name)
}

const getMimeType = (file_path, file_name) => {
  const file_ext = getFileExt(file_name)
  let mime_type = mime.lookup(file_path)
  log.debug(log_prefix, '[getFileType]', mime_type)
  if (!mime_type || isEmpty(mime_type)) {
    mime_type = 'etc'
  } else {
    mime_type = mime_type.toLowerCase()
    if (mime_type.startsWith(Constants.VIDEO)) {
      mime_type = Constants.VIDEO
    } else if (mime_type.startsWith(Constants.IMAGE)) {
      mime_type = Constants.IMAGE
    } else if (mime_type.indexOf(Constants.AUDIO) >= 0) {
      mime_type = Constants.AUDIO
    } else if (mime_type.indexOf('text') >= 0) {
      mime_type = 'text'
    } else if (file_ext === 'xls' || file_ext === 'xlsx' || mime_type.indexOf('ms-excel') >= 0 || mime_type.indexOf('spreadsheetml') >= 0) {
      mime_type = 'excel'
    } else if (file_ext === 'doc' || file_ext === 'docx' || mime_type.indexOf('word') >= 0) {
      mime_type = 'word'
    } else if (file_ext === 'ppt' || file_ext === 'pptx' || mime_type.indexOf('powerpoint') >= 0 || mime_type.indexOf('presentationml') >= 0) {
      mime_type = 'powerpoint'
    } else if (mime_type.indexOf('pdf') >= 0) {
      mime_type = 'pdf'
    } else if (mime_type.indexOf('compressed') >= 0 || mime_type.indexOf('zip') >= 0 || mime_type.indexOf('tar') >= 0) {
      mime_type = 'archive'
    } else if (mime_type.indexOf('hwp') >= 0) {
      mime_type = 'hwp'
    } else if (mime_type.indexOf('xml') >= 0) {
      mime_type = 'xml'
    } else if (mime_type === 'application/octet-stream') {
      mime_type = 'bin'
    } else {
      mime_type = 'etc'
    }
  }

  return mime_type
}

const getCurrentTimestamp = (is_millisecond = false) => {
  const now = Date.now()
  return is_millisecond ? now : Math.floor(now / 1000)
}

const addDay = (day, format = 'YYYY-MM-DD') => {
  const calc_date = moment().add(day, 'days')
  if (format == null) {
    return calc_date.toDate()
  } else if (format === Constants.TIMESTAMP) {
    return calc_date.unix()
  }
  return calc_date.format(format)
}

const addMonth = (month, format = 'YYYY-MM-DD') => {
  const calc_date = moment().add(month, 'months')
  if (format == null) {
    return calc_date.toDate()
  } else if (format === Constants.TIMESTAMP) {
    return calc_date.unix()
  }
  return calc_date.format(format)
}

const addYear = (year, format = 'YYYY-MM-DD') => {
  const calc_date = moment().add(year, 'years')
  if (format == null) {
    return calc_date.toDate()
  } else if (format === Constants.TIMESTAMP) {
    return calc_date.unix()
  }
  return calc_date.format(format)
}

const storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, path.resolve(req.upload_directory))
  },
  filename: function (req, file, callback) {
    if (req.new_file_name) {
      if (req.disable_auto_ext !== true && path.extname(req.new_file_name) === '') {
        req.new_file_name = req.new_file_name + path.extname(file.originalname)
      }
      callback(null, req.new_file_name)
    } else if (req.use_origin_name) {
      req.new_file_name = file.originalname
      callback(null, req.new_file_name)
    } else {
      req.new_file_name = 'upload_' + file.originalname
      callback(null, req.new_file_name)
    }
  },
})

const uploadImageFile = async (user_info, req, res, key = 'image', disable_auto_ext = false) => {
  const media_root = ServiceConfig.getMediaRoot()
  const upload_path = user_info.user_media_path + 'image'
  const upload_full_path = media_root + upload_path
  if (!(await fileExists(upload_full_path))) {
    await createDirectory(upload_full_path)
  }

  const new_file_name = getRandomId()
  const upload_file_path = upload_full_path + '/' + new_file_name
  await uploadByRequest(req, res, key, upload_full_path, new_file_name, disable_auto_ext)
  const upload_file_info = req.file
  if (isEmpty(upload_file_info) || !(await fileExists(upload_file_path))) {
    log.e(req, 'upload fail', upload_file_info)
    throw new StdObject(-1, '파일 업로드가 실패하였습니다.', 500)
  }
  const file_type = await getFileType(upload_file_path, new_file_name)
  if (file_type !== 'image') {
    log.e(req, 'file type is not image', upload_file_info, file_type)
    await deleteFile(upload_file_path)
    throw new StdObject(-1, '이미지만 업로드 가능합니다.', 400)
  }
  const image_url = getUrlPrefix(ServiceConfig.get('static_storage_prefix'), upload_path + '/' + new_file_name)
  return { image_url: image_url, image_path: upload_path + '/' + new_file_name }
}

const uploadByRequest = async (req, res, key, upload_directory, new_file_name = null, disable_auto_ext = false, use_origin_name = false) => {
  return new Promise((resolve, reject) => {
    const uploader = multer({
      storage,
      limits: {
        // fileSize: 20 * 1024 * 1024 * 1024, ///< 20GB 제한
      }
    }).single(key)
    req.upload_directory = upload_directory
    req.new_file_name = new_file_name
    req.use_origin_name = use_origin_name
    req.disable_auto_ext = disable_auto_ext
    uploader(req, res, error => {
      if (error) {
        log.e(req, log_prefix, '[uploadByRequest]', error)
        reject(error)
      } else {
        // log.d(req, 'on upload job finished')
        resolve(true)
      }
    })
  })
}

const storate = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ServiceConfig.get('common_root'))
  },
  limits: {
    fileSize: 20 * 1024 * 1024, ///< 20MB 제한
  },
  filename: (req, file, cb) => {
    cb(null, getRandomId())
  },
})

const remove_path_slash_regex = /^[/]*(.+)([^/]+)[/]*$/
const removePathSlash = (path) => {
  if (!path) return null
  return path.replace(remove_path_slash_regex, '$1$2')
}
const removePathLastSlash = (path) => {
  if (!path) return null
  return path.replace(/\/+$/, '')
}

const trim = (value) => {
  if (value === undefined || value === null) {
    return ''
  }

  return _.trim(value)
}

const fileSizeText = (size, zero = '-') => {
  size = getFloat(size, 0);
  if (getFloat(size, 0) === 0) {
    return zero;
  }
  const kb = 1024
  const mb = 1024 * kb
  const gb = 1024 * mb
  const tb = 1024 * gb

  let file_size = size
  let suffix = ''
  if (size >= tb) {
    file_size = size / tb
    suffix = ' TB'
  } else if (size >= gb) {
    file_size = size / gb
    suffix = ' GB'
  } else if (size >= mb) {
    file_size = size / mb
    suffix = ' MB'
  } else if (size >= kb) {
    file_size = size / kb
    suffix = ' KB'
  }

  if (file_size >= 100) {
    return `${numeral(Math.round(file_size)).format('0,0')} ${suffix}`
  }
  return `${numeral(Math.floor(file_size * 10) / 10).format('0,0.[0]')} ${suffix}`
}

const getFileBuffer = async (file_path) => {
  const result = {
    success: false,
    data: null
  }
  return new Promise((resolve) => {
    fs.readFile(file_path, (error, data) => {
      if (error) {
        log.error(log_prefix, '[getFileBuffer]', error)
      } else {
        result.success = true
        result.data = data
      }
      resolve(result)
    })
  })
}

const getImageTags = async (file_path) => {
  const result = {
    success: false,
    data: null
  }
  const file_buffer = await getFileBuffer(file_path)
  if (!file_buffer.success) {
    return result
  }
  result.data = ExifReader.load(file_buffer.data, {expanded: true});
  result.success = true
  return result
}
const isImageRotate = async (file_path) => {
  const tags = await getImageTags(file_path)
  if (!tags || !tags.data || !tags.data.exif) return false
  const exif = tags.data.exif
  if (!exif.Orientation) return false
  const orientation = getInt(exif.Orientation.value, 1)
  return orientation >= 5 && orientation <= 8
}

const pdfToImage = async (pdf_file_path, output_directory, prefix = 'Page', quality = 100) => {
  return new Promise(async (resolve) => {
    const result = {
      success: false,
      message: '',
      data: null,
      error: null,
      command: null,
      code: null,
      file_list: []
    }
    if (!await fileExists(pdf_file_path)) {
      result.message = '대상 파일이 존재하지 않습니다.'
      result.out = {
        pdf_file_path,
        output_directory
      }
      resolve(result);
      return;
    }
    output_directory = removePathLastSlash(output_directory)
    await createDirectory(output_directory)
    const args = [
      '-png',
      '-r',
      quality,
      // '-jpegopt',
      // 'quality=100',
      pdf_file_path,
      `${output_directory}/${prefix}`
    ]
    const spawn = executeSpawn('pdftoppm', args, null, (cmd) => {
      result.command = cmd
    })

    let data_str = ''
    let error_str = ''
    spawn.on('onData', (data) => {
      data_str += data + '\n'
    })
    spawn.on('onError', (data) => {
      error_str += data + '\n'
    })
    spawn.on('onExit', async (code) => {
      result.success = code === 0
      result.code = code
      result.data = data_str
      result.error = error_str
      spawn.emit('kill')
      const file_list = await getDirectoryFileList(output_directory)
      const file_regexp = new RegExp(`^${prefix}-[\\d]+\\.png`)
      log.debug(log_prefix, 'pdfToImage', file_list.length);
      if (file_list) {
        for (let i = 0; i < file_list.length; i++) {
          const dirent = file_list[i]
          if (dirent.isFile() && file_regexp.test(dirent.name)) {
            const file_name = dirent.name
            const file_path = `${output_directory}/${file_name}`
            const exif_info = await getImageTags(file_path)
            const file_size = await getFileSize(file_path)
            const image_file_info = exif_info.data.pngFile
            const file_info = {
              file_name: dirent.name,
              file_size,
              width: image_file_info['Image Width'].value,
              height: image_file_info['Image Height'].value
            }
            result.file_list.push(file_info)
          }
        }
      }
      if (result.file_list.length <= 0) {
        result.message = '변환된 파일이 존재하지 않습니다.'
        result.success = false
      } else {
        result.file_list = _.sortBy(result.file_list, ['file_name'])
      }
      spawn.emit('finish')
      resolve(result)
    })
  })
}

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default {
  getFileBuffer,
  getImageTags,
  isImageRotate,
  removePathSlash,
  removePathLastSlash,
  'common_path_upload': multer({ storage: storate }),
  'removePathSEQ': removePathSEQ,
  'getMediaDirectory': getMediaDirectory,
  'getUrlPrefix': getUrlPrefix,
  'timeStrToSecond': timeStrToSecond,
  'secondToTimeStr': secondToTimeStr,
  'dateFormatter': dateFormatter,
  'getToDate': () => moment(new Date()).format('YYYY-MM-DD'),
  'getDateDayAdd': (data, addDay = 0) => moment(new Date(data)).add(addDay, 'days').format('YYYY-MM-DD'),
  'getDateMonthAdd': (data, addMonth = 0) => moment(new Date(data)).add(addMonth, 'month').format('YYYY-MM-DD'),
  'getDateYearAdd': (data, addYear = 0) => moment(new Date(data)).add(addYear, 'year').format('YYYY-MM-DD'),

  'today': (format = 'yyyy-mm-dd') => { return dateFormatter(new Date().getTime(), format) },
  'dateFormat': (timestamp, format = 'yyyy-mm-dd HH:MM:ss') => { return dateFormatter(timestamp, format) },
  'currentFormattedDate': (format = 'yyyy-mm-dd HH:MM:ss') => { return dateFormatter(new Date().getTime(), format) },
  'getCurrentTimestamp': getCurrentTimestamp,
  'addDay': addDay,
  'addMonth': addMonth,
  'addYear': addYear,

  'loadXmlFile': async (directory, xml_file_name) => {
    const xml_file_path = directory + xml_file_name

    let result = {}
    let context = null
    if (!(await fileExists(xml_file_path))) {
      log.debug(log_prefix, 'Util.loadXmlFile', `${xml_file_path} not exists`)
      return result
    }

    try {
      context = await readFile(xml_file_path)
    } catch (error) {
      log.error(log_prefix, 'Util.loadXmlFile', error)
      return result
    }
    if (context == null) {
      log.debug(log_prefix, 'Util.loadXmlFile', xml_file_path + ' context is empty')
      return result
    }

    context = context.toString()
    return await loadXmlString(context)
  },

  'loadXmlString': loadXmlString,

  'writeXmlFile': async (directory, xml_file_name, context_json) => {
    const xml_file_path = removePathLastSlash(directory) + '/' + xml_file_name

    const xml = XML_BUILDER.buildObject(JSON.parse(JSON.stringify(context_json)))
    await writeFile(xml_file_path, xml)
    return true
  },

  'isEmpty': isEmpty,

  'trim': trim,

  'getRandomString': getRandomString,

  'equals': (target, compare, ignore_case = true) => {
    if (!target || !compare) {
      return false
    }
    if (ignore_case) {
      return target.toLowerCase() === compare.toLowerCase()
    } else {
      return target === compare
    }
  },

  'fileExists': fileExists,
  'readFile': readFile,
  'writeFile': writeFile,
  'deleteFile': deleteFile,
  'renameFile': renameFile,
  'copyFile': copyFile,
  'copyDirectory': copyDirectory,
  'getFileStat': getFileStat,
  'createDirectory': createDirectory,
  'deleteDirectory': deleteDirectory,
  'getDirectoryFileList': getDirectoryFileList,
  'getDirectoryFileSize': getDirectoryFileSize,
  'getFileSize': getFileSize,

  'dayDiffenrence': (date) => {
    const toDay = moment(new Date(), 'YYYYMMDD')
    const diffDate = moment(date, 'YYYYMMDD')

    return toDay.diff(diffDate, 'days')
  },
  'dayGap': (sdate, edate) => {
    const s_moment = moment(sdate, 'YYYYMMDD')
    const e_moment = moment(edate, 'YYYYMMDD')
    let days = s_moment.diff(e_moment, 'days');
    if (days < 0) { days *= -1 }
    return days + 1
  },
  'hourDifference': (target_date) => {
    const time_diff = Math.abs(target_date.getTime() - Date.now())
    return Math.ceil(time_diff / (1000 * 3600))
  },

  'md5': (text) => {
    return crypto.createHash('md5').update(text).digest('hex')
  },

  'hash': (text, hash_algorithm = 'sha256') => {
    return crypto.createHash(hash_algorithm).update(text).digest('hex')
  },

  'hmac': (key, message, hash_algorithm = 'sha256') => {
    const hmac = crypto.createHmac(hash_algorithm, key)
    hmac.write(message)
    hmac.end()

    return Buffer.from(hmac.read()).toString('base64')
  },

  'encrypt': (plain_data) => {
    let plain_text
    if (_.isObject(plain_data)) {
      plain_text = JSON.stringify(plain_data)
    } else {
      plain_text = plain_data
    }

    return base64url.encode(aes256.encrypt(ServiceConfig.get('crypto_key'), plain_text), 'utf-8')
  },

  'decrypt': (encrypted_data) => {
    try {
      return aes256.decrypt(ServiceConfig.get('crypto_key'), base64url.decode(encrypted_data, 'utf-8'))
    } catch (error) {
      log.error(log_prefix, 'Util.decrypt', error)
      return null
    }
  },

  'nlToBr': (text) => {
    if (!text) {
      return ''
    }
    return text.replace(NEW_LINE_REGEXP, '<br>\n')
  },

  'pathToUrl': (path) => {
    path = path.replace(PATH_EXP, '/')
    path = path.replace(/^\/+/g, '')

    return '/' + path
  },

  'getXmlText': getXmlText,

  // 'getContentId': () => {
  //   return uuidv1()
  // },

  'getXmlToJson': (xml) => {
    return new Promise((resolve, reject) => {
      XML_TO_JSON.parseString(xml, function (err, json) {
        if (err) {
          reject(err)
        } else {
          resolve(json)
        }
      })
    })
  },

  'httpRequest': (options, post_data, is_https = false) => {
    return new Promise((resolve, reject) => {
      let req
      if (is_https) {
        req = https.request(options)
      } else {
        req = http.request(options)
      }

      req.on('response', res => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          // log.error(res)
          // return reject(new Error('statusCode=' + res.statusCode));
        }

        const body = []
        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          body.push(Buffer.from(chunk))
        })
        res.on('end', () => {
          const response_body = Buffer.concat(body).toString()
          if (res.statusCode < 200 || res.statusCode >= 400) {
            reject(new StdObject(-1, response_body, res.statusCode))
          } else {
            resolve(response_body)
          }
        })
      })

      req.on('error', err => {
        log.debug(log_prefix, 'Util.httpRequest', err)
        reject(err)
      })

      if (post_data) {
        // log.debug(log_prefix, '[httpRequest]', 'post_data', post_data)
        req.write(post_data)
      }
      req.end()
    })
  },

  'httpRequestFormData': async (options, post_data, is_https = false) => {
    return new Promise((resolve, reject) => {
      let req
      if (is_https) {
        req = https.request(options)
      } else {
        req = http.request(options)
      }

      post_data.pipe(req);

      req.on('response', res => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          // log.error(res)
          // return reject(new Error('statusCode=' + res.statusCode));
        }

        const body = []
        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          body.push(Buffer.from(chunk))
        })
        res.on('end', () => {
          const response_body = Buffer.concat(body).toString()
          if (res.statusCode < 200 || res.statusCode >= 400) {
            reject(new StdObject(-1, response_body, res.statusCode))
          } else {
            resolve(response_body)
          }
        })
        req.end()
      })

      req.on('error', err => {
        log.debug(log_prefix, 'Util.httpRequest', err)
        reject(err)
      })
    })
  },

  'byteToMB': (byte) => {
    return Math.ceil(byte / 1024 / 1024)
  },
  fileSizeText,

  'forward': async (url, method, token = null, data = null) => {
    let request_params = {
      'url': url,
      'method': method
    }
    if (token) {
      request_params.auth = {
        'bearer': token
      }
    }
    if (data && !isEmpty(data)) {
      if (method.toUpperCase() === 'GET') {
        request_params.qs = data
      } else {
        request_params.body = data
        request_params.json = true
      }
    }
    log.debug(log_prefix, request_params)

    const forward = request(request_params)
    try {
      return await forward
    } catch (e) {
      let error
      if (typeof e.error === 'string') {
        error = JSON.parse(e.error)
      } else {
        error = e.error
      }
      throw error
    }
  },

  'uploadByRequest': uploadByRequest,

  'execute': execute,
  'executeSpawn': executeSpawn,
  'getMediaInfo': getMediaInfo,
  'getVideoDimension': getVideoDimension,
  'getVideoDuration': getVideoDuration,
  'getThumbnail': getThumbnail,
  'resizeImage': resizeImage,

  'isNull': (value, check_str_null = true) => {
    if (value === null || value === undefined) return true;
    if (check_str_null) {
      return value === 'null' || value === 'undefined'
    }
    return false
  },
  'getPayload': (data, fields, set_modify_date = true, allow_blank = true, allow_empty_array = true) => {
    const model = {}
    Object.keys(fields).forEach((key) => {
      const field_info = fields[key]
      if (isEmpty(data[key], allow_blank, allow_empty_array) === false) {
        model[key] = data[key]
      } else if (field_info.require === true) {
        const error = new StdObject(-1, '잘못된 요청입니다', 400)
        error.add('field', key)
        error.add('message', field_info.message)
        throw error
      }
    })
    if (set_modify_date) {
      model.modify_date = Date.now()
    }
    return model
  },
  'hexToRGB': hexToRGB,
  'getRandomId': getRandomId,
  'colorCodeToHex': colorCodeToHex,

  'parseInt': getInt,
  'parseFloat': getFloat,
  'getImageScaling': getImageScaling,
  isBoolean,
  isNumber,
  isString,
  isArray,
  isObject,
  isTrue,
  isFalse,
  urlToPath,
  getFileExt,
  getFileName,
  getDirectoryName,
  getRandomNumber,
  getFileType,
  getMimeType,
  uploadImageFile,
  sshExec,

  parseHashtag: (hashtag) => {
    const remove_special_char_regex = /[{}\[\]/?.,;:|)*~`!^\-+<>@$%&\\=('"]/gi
    hashtag = hashtag.replace(remove_special_char_regex, '')

    const tag_list = []
    const clean_tag_regex = /#([^#^\s]+)/gi
    let tag_search_result
    while ((tag_search_result = clean_tag_regex.exec(hashtag)) !== null) {
      if (tag_search_result) {
        tag_list.push(tag_search_result[1])
      }
    }

    return tag_list
  },

  mergeHashtag: (hashtag_list) => {
    if (!hashtag_list || !hashtag_list.length) {
      return ''
    }
    return '#' + hashtag_list.join(' #')
  },
  pdfToImage,
  sleep
}
