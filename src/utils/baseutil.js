import Promise from 'promise'
import fs from 'fs'
import dateFormat from 'dateformat'
import { promisify } from 'util'
import { exec } from 'child_process'
import _ from 'lodash'
import xml2js from 'xml2js'
import aes256 from 'nodejs-aes256'
import base64url from 'base64-url'
import {v1 as uuidv1} from 'uuid'
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

const XML_PARSER = new xml2js.Parser({ trim: true })
const XML_BUILDER = new xml2js.Builder({ trim: true, cdata: true })
const XML_TO_JSON = new xml2js.Parser({ trim: true, explicitArray: false })

const RANDOM_KEY_SPACE = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
const TIMEZONE_OFFSET = new Date().getTimezoneOffset() * 60000
const NEW_LINE_REGEXP = /\r?\n/g

let PATH_EXP
if ('/' === '/') {
  PATH_EXP = new RegExp(/\//, 'g')
} else {
  PATH_EXP = new RegExp(/\\/, 'g')
}

const log_prefix = '[baseutil]'

let itemindex = 0

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
      // log.debug(log_prefix, 'Util.readFile', `file not exists. path=${file_path}`)
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
    // ????????? ?????? ????????? ??????
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
      // log.debug(log_prefix, 'Util.renameFile', `file not exists. target_path=${target_path}`)
      resolve(false)
    } else if ((await fileExists(dest_path))) {
      // log.debug(log_prefix, 'Util.renameFile', `file already exists. dest_path=${dest_path}`)
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
      // log.debug(log_prefix, 'Util.renameFile', `file not exists. target_path=${target_path}`)
      resolve(false)
    } else if (await fileExists(dest_path)) {
      // log.debug(log_prefix, 'Util.renameFile', `file already exists. target_path=${dest_path}`)
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
  const async_func = new Promise(async resolve => {
    if (!(await fileExists(file_path))) {
      // log.debug(log_prefix, 'Util.getFileStat', `file not exists. path=${file_path}`)
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

  return await async_func
}

const createDirectory = async (dir_path) => {
  if (!dir_path) return false
  const async_func = new Promise(async resolve => {
    if ((await fileExists(dir_path))) {
      // log.debug(log_prefix, 'Util.createDirectory', `directory already exists. path=${dir_path}`)
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

  return await async_func
}

const removeDirectory = async (dir_path) => {
  const async_func = new Promise(async resolve => {
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

  return await async_func
}

const deleteFile = async (target_path) => {
  const async_func = new Promise(async resolve => {
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

  return await async_func
}

const deleteDirectory = async (path) => {
  const file_list = await getDirectoryFileList(path)
  for (let i = 0; i < file_list.length; i++) {
    const file = file_list[i]
    if (file.isDirectory()) {
      await deleteDirectory(path + '/' + file.name)
      const delete_directory_result = await removeDirectory(path + '/' + file.name)
      // log.debug(log_prefix, 'delete sub dir', path + '/' + file.name, delete_directory_result);
    } else {
      const delete_file_result = await deleteFile(path + '/' + file.name)
      // log.debug(log_prefix, 'delete sub file', path + '/' + file.name, delete_file_result);
    }
  }
  const delete_root_result = await removeDirectory(path)
  // log.debug(log_prefix, 'delete root dir', path, delete_root_result);
}

const getDirectoryFileList = async (directory_path, dirent = true) => {
  const async_func = new Promise(async resolve => {
    if (!(await fileExists(directory_path))) {
      // log.debug(log_prefix, 'Util.getDirectoryFileList', `directory not exists. path=${directory_path}`)
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

  return await async_func
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

const getMediaInfo = async (media_path) => {
  const async_func = new Promise(async (resolve) => {
    const mediainfo_cmd = `mediainfo --Full --Output=XML "${media_path}"`
    // log.debug(log_prefix, '[getMediaInfo] - mediainfo_cmd', mediainfo_cmd)
    const execute_result = await execute(mediainfo_cmd)
    const media_result = {
      success: false,
      media_type: Constants.NO_MEDIA,
      media_info: {}
    }

    try {
      if (execute_result.success && execute_result.out) {
        const media_info_xml = await loadXmlString(execute_result.out)
        const media_info = JsonPath.value(media_info_xml, '$..track')
        if (media_info && media_info.length > 0) {
          for (let i = 0; i < media_info.length; i++) {
            const track = media_info[i]
            if (track.$ && track.$.type) {
              const track_type = track.$.type.toLowerCase()
              const duration = Math.round(getFloat(getXmlText(track.Duration)))
              const width = getInt(getXmlText(track.Width))
              const height = getInt(getXmlText(track.Height))
              const fps = Math.max(getFloat(getXmlText(track.FrameRate)), getFloat(getXmlText(track.Frame_rate)))
              const frame_count = Math.max(getFloat(getXmlText(track.FrameCount)), getFloat(getXmlText(track.Frame_count)))
              const sample_rate = Math.max(getFloat(getXmlText(track.SamplingRate)), getFloat(getXmlText(track.Sampling_rate)))
              const bit_depth = Math.max(getFloat(getXmlText(track.BitDepth)), getFloat(getXmlText(track.Bit_depth)))
              if (track_type === Constants.VIDEO) {
                media_result.media_type = Constants.VIDEO
                media_result.media_info.width = width
                media_result.media_info.height = height
                media_result.media_info.fps = fps
                media_result.media_info.frame_count = frame_count
                media_result.media_info.duration = duration
                media_result.media_info.bit_depth = bit_depth
                media_result.success = true
                break
              } else if (track_type === Constants.AUDIO) {
                media_result.media_type = Constants.AUDIO
                media_result.media_info.duration = duration
                media_result.media_info.sample_rate = sample_rate
                media_result.success = true
                break
              } else if (track_type === Constants.IMAGE) {
                media_result.media_type = Constants.IMAGE
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
      }
    } catch (error) {
      log.error(log_prefix, 'getMediaInfo', error, execute_result)
    }

    resolve(media_result)
  })

  return await async_func
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

const getImageScaling = async (origin_path, scaling_path = null, scaling_type = 'width', scaling_size = 1380, overwrite = true) => {
  const scaling_str = scaling_type === 'width' ? `${scaling_size}:-1` : '-1:${scaling_size}'
  const command = `ffmpeg ${overwrite ? '-y' : null} -i "${origin_path}" -vf scale=${scaling_type}=${scaling_str} -an "${overwrite ? origin_path : scaling_path}"`
  return await execute(command)
}

const getThumbnail = async (origin_path, resize_path, second = -1, width = -1, height = -1) => {
  let filter = ''
  let time_option = ''
  if (width > 0 && height > 0) {
    const dimension = await getVideoDimension(origin_path)
    if (!dimension.success) {
      return dimension
    }

    const w_ratio = dimension.width / width
    const h_ratio = dimension.height / height
    let crop_option
    if (w_ratio >= h_ratio) {
      crop_option = `crop=in_h*${width}/${height}:in_h`
    } else {
      crop_option = `crop=in_w:in_w*${height}/${width}`
    }
    const scale_option = `scale=${width}:${height}`
    filter = `-filter:v "${crop_option},${scale_option}"`
  }
  if (second > 0) {
    const time_str = secondToTimeStr(second, 'HH:MM:ss', true)
    time_option = `-ss ${time_str}`
  }
  const command = `ffmpeg ${time_option} -i "${origin_path}" -y -vframes 1 ${filter} -an "${resize_path}"`
  return await execute(command)
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

  let mime_type = mime.lookup(file_path)
  // log.debug(log_prefix, '[getFileType]', mime_type)
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
      const newfile =  `${getContentId()}${path.extname(file.originalname)}`
      req.new_file_name = newfile;
      log.debug(newfile, req.new_file_name )
      callback(null, req.new_file_name)
    }
  },
})

const storage_multi = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, path.resolve(req.upload_directory))
  },
  filename: function (req, file, callback) {
    itemindex++;
    if (itemindex > 100){
      itemindex = 0;
    }
    const newfile =  `${getRandomId()}${itemindex}${path.extname(file.originalname)}`
    req.new_file_name = newfile;
    callback(null, req.new_file_name)
  },
})

const uploadImageFile = async (user_info, req, res, key = 'image', disable_auto_ext = false) => {
  const media_root = ServiceConfig.get('media_root')
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
    throw new StdObject(-1, '?????? ???????????? ?????????????????????.', 500)
  }
  const file_type = await getFileType(upload_file_path, new_file_name)
  if (file_type !== 'image') {
    log.e(req, 'file type is not image', upload_file_info, file_type)
    await deleteFile(upload_file_path)
    throw new StdObject(-1, '???????????? ????????? ???????????????.', 400)
  }
  const image_url = getUrlPrefix(ServiceConfig.get('static_storage_prefix'), upload_path + '/' + new_file_name)
  return { image_url: image_url, image_path: upload_path + '/' + new_file_name }
}

const uploadByRequest = async (req, res, key, upload_directory, new_file_name = null, disable_auto_ext = false, use_origin_name = false) => {
  return new Promise((resolve, reject) => {
    const uploader = multer({
      storage,
      limits: {
        fileSize: 20 * 1024 * 1024 * 1024, ///< 20GB ??????
      }
    }).single(key)
    log.debug(key, upload_directory, new_file_name);
    req.upload_directory = upload_directory
    req.new_file_name = new_file_name
    req.use_origin_name = use_origin_name
    req.disable_auto_ext = disable_auto_ext
    uploader(req, res, error => {
      if (error) {
        log.e(req, error)
        reject(error)
      } else {
        log.d(req, 'on upload job finished', req.new_file_name)
        resolve(true)
      }
    })
  })
}

const uploadsByRequest = async (req, res, key, upload_directory, new_file_name = null, disable_auto_ext = false, use_origin_name = false) => {
  return new Promise((resolve, reject) => {
    const uploader = multer({
      storage: storage_multi,
      limits: {
        fileSize: 20 * 1024 * 1024 * 1024, ///< 20GB ??????
      }
    }).fields(key)

    req.upload_directory = upload_directory
    req.new_file_name = new_file_name
    req.use_origin_name = use_origin_name
    req.disable_auto_ext = disable_auto_ext

    uploader(req, res, error => {
      if (error) {
        log.e(req, error)
        reject(error)
      } else {
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
    fileSize: 20 * 1024 * 1024, ///< 20MB ??????
  },
  filename: (req, file, cb) => {
    const f = getRandomId();
    log.debug(f);
    cb(null, f);
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

const sshExec = async (cmd, host, port = 22, user = 'e', password = 'e') => {
  const async_func = new Promise(async resolve => {
    SSH(cmd, {
      host,
      port,
      user,
      password
    }, function (error, result, stderr) {
      // log.debug(log_prefix, '[sshExec]', cmd, error, result, stderr)
      const response = {
        success: true,
        result
      }
      if (error) {
        response.success = false
        response.error = error
        response.stderr = stderr
      }
      resolve(response)
    })
  })

  return async_func
}

const trim = (value) => {
  if (value === undefined || value === null) {
    return ''
  }

  return _.trim(value)
}

const duplicateObject = async (originObject) => {
  const returnObject = []
  _.forEach(originObject, (item) => {
    const keyCheck = _.find(returnObject, item)
    if (!keyCheck) {
      returnObject.push(item)
    }
  })
  return returnObject
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

const getContentId = (() => {
  return uuidv1()
})

function stripTrailingSlash(str) {
  str = str.trim();
  if(str.substr(-1) === '/' || str.substr(-1) === '\\') {
    return str.substr(0, str.length - 1);
  }
  return str;
}

function lastSlashAdd(str) {
  str = str.trim();
  str = stripTrailingSlash(str);
  str = str + Constants.SP;
  return str;
}

function getIp(req){
  let ip = ''
  if (req.headers['x-forwarded-for']) {
    if (req.headers['x-forwarded-for'].indexOf(',') !== -1) {
      ip = req.headers['x-forwarded-for'].split(',')[0]
    } else {
      ip = req.headers['x-forwarded-for']
    }
  } else {
    ip = req.connection.remoteAddress
  }
  return ip;
}


export default {
  'getIp': getIp,
  lastSlashAdd,
  removePathSlash,
  removePathLastSlash,
  duplicateObject,
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
      // log.debug(log_prefix, 'Util.loadXmlFile', `${xml_file_path} not exists`)
      return result
    }

    try {
      context = await readFile(xml_file_path)
    } catch (error) {
      log.error(log_prefix, 'Util.loadXmlFile', error)
      return result
    }
    if (context == null) {
      // log.debug(log_prefix, 'Util.loadXmlFile', xml_file_path + ' context is empty')
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

  'getContentId': getContentId,

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
        // log.debug(log_prefix, 'Util.httpRequest', err)
        reject(err)
      })

      if (post_data) {
        // log.debug(log_prefix, '[httpRequest]', 'post_data', post_data)
        req.write(post_data)
      }
      req.end()
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
    // log.debug(log_prefix, request_params)

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
  'uploadsByRequest': uploadsByRequest,

  'execute': execute,
  'getMediaInfo': getMediaInfo,
  'getVideoDimension': getVideoDimension,
  'getVideoDuration': getVideoDuration,
  'getThumbnail': getThumbnail,

  'isNull': (value) => {
    return value === null || value === undefined
  },
  'getPayload': (data, fields, set_modify_date = true, allow_blank = true, allow_empty_array = true) => {
    const model = {}
    Object.keys(fields).forEach((key) => {
      const field_info = fields[key]
      if (isEmpty(data[key], allow_blank, allow_empty_array) === false) {
        model[key] = data[key]
      } else if (field_info.require === true) {
        const error = new StdObject(-1, '????????? ???????????????', 400)
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
  }
}


