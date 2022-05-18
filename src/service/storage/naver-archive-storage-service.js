import fs from 'fs'
import path from 'path'
import _ from 'lodash'
import SwiftClient from '../../libs/swift-client'
import Constants from '../../constants/constants'
import ServiceConfig from '../../service/service-config'
import Util from '../../utils/Util'
import log from '../../libs/logger'
import NaverObjectStorageService from './naver-object-storage-service'
import StdObject from '../../wrapper/std-object'

const HEADER_DIRECTORY = {
  'Content-Type': 'application/directory'
}

const NaverArchiveStorageClass = class {
  constructor () {
    this.log_prefix = '[NaverArchiveStorageClass]'
    this.bucket_map = {}
  }

  init = async () => {
    this.CREDENTIALS = {
      endpointUrl: ServiceConfig.get('naver_archive_storage_endpoint'),
      username: ServiceConfig.get('naver_access_key'),
      password: ServiceConfig.get('naver_secret_key'),
      domainId: ServiceConfig.get('naver_archive_storage_domain_id'),
      projectId: ServiceConfig.get('naver_archive_storage_project_id')
    }
    this.DEFAULT_BUCKET_NAME = ServiceConfig.get('naver_archive_storage_bucket_name')
    await this.preloadBucketList()

    log.debug(this.log_prefix, '[init]', this.CREDENTIALS, this.DEFAULT_BUCKET_NAME, HEADER_DIRECTORY, this.bucket_map)
  }

  preloadBucketList = async (client = null) => {
    const storage_client = await this.getStorageClient(client)
    try {
      const bucket_list = await storage_client.list()
      for (let bucket of bucket_list) {
        log.debug(this.log_prefix, '[preloadBucketList]', `
          > Count = ${bucket.count}
          > Last Modified = ${bucket.last_modified}
          > Name = ${bucket.name}
          > Bytes = ${bucket.bytes}`)
        if (bucket.name) {
          this.bucket_map[bucket.name] = true
        }
      }
    } catch (error) {
      log.error(this.log_prefix, '[preloadBucketList]', error)
    }
  }

  getBucketName = (bucket_name = null) => {
    return bucket_name ? bucket_name : this.DEFAULT_BUCKET_NAME
  }

  getAuth = () => {
    return new SwiftClient.KeystoneV3Authenticator(this.CREDENTIALS)
  }

  getStorageClient = async (client = null) => {
    if (client) return client
    const auth = this.getAuth()
    log.debug(this.log_prefix, '[getStorageClient]', auth)
    let storage_client
    try {
      storage_client = await new SwiftClient(auth)
    } catch (error) {
      log.error(this.log_prefix, '[getStorageClient]', `can't create swift client ->`, error, this.CREDENTIALS)
      throw error
    }

    return storage_client
  }

  createBucket = async (bucket_name = null, client = null) => {
    const target_bucket_name = this.getBucketName(bucket_name)
    if (this.bucket_map[target_bucket_name] === true) {
      return true
    }
    const storage_client = await this.getStorageClient(client)
    let create_bucket_result
    try {
      create_bucket_result = await storage_client.create(target_bucket_name)
    } catch (error) {
      log.error(this.log_prefix, '[getBucket]', `can't create bucket -> target_bucket_name`, error)
      throw error
    }
    log.debug(this.log_prefix, '[getBucket]', `createBucket complete [${target_bucket_name} - ${bucket_name}]`, create_bucket_result)
    this.bucket_map[target_bucket_name] = true
    return true
  }

  getBucket = async (bucket_name = null, client = null) => {
    let storage_client = null
    try {
      storage_client = await this.getStorageClient(client)
    } catch (error) {
      log.error(this.log_prefix, '[getBucket]', `can't create swift client ->`, error, this.CREDENTIALS)
      throw error
    }

    const target_bucket_name = this.getBucketName(bucket_name)
    if (this.bucket_map[target_bucket_name] !== true) {
      await this.createBucket(target_bucket_name, storage_client)
    }
    let bucket
    try {
      bucket = await storage_client.container(target_bucket_name)
    } catch (error) {
      log.error(this.log_prefix, '[getBucket]', `can't open bucket object -> [${target_bucket_name} - ${bucket_name}]`)
      throw error
    }
    log.debug(this.log_prefix, '[getBucket]', `get bucket complete [${target_bucket_name} - ${bucket_name}]`)
    return bucket
  }

  getContentTypeHeader = async (local_file_path) => {
    const content_type = (await Util.getFileType(local_file_path)).mime
    return {
      'Content-Type': content_type
    }
  }

  uploadFolder = async (local_file_path, remote_path, remote_bucket_name = null, client = null) => {
    if (!(await Util.fileExists(local_file_path))) {
      throw new StdObject(101, `file not exists - ${local_file_path}`, 400)
    }
    const storage_client = await this.getStorageClient(client)
    const file_list = await Util.getDirectoryFileList(local_file_path)
    local_file_path = Util.removePathLastSlash(local_file_path)
    remote_path = Util.removePathSlash(remote_path)
    let folder_file_list = []
    let upload_file_list = []
    for (let i = 0; i < file_list.length; i++) {
      const file = file_list[i]
      const file_path = local_file_path + '/' + file.name
      if (file.isDirectory()) {
        const upload_folder_result = await this.uploadFolder(file_path, remote_path + '/' + file.name, remote_bucket_name, storage_client)
        folder_file_list = _.union(folder_file_list, upload_folder_result)
      } else {
        await this.uploadFile(file_path, remote_path, file.name, remote_bucket_name, storage_client)
        upload_file_list.push(file_path)
      }
    }

    const result = _.union(upload_file_list, folder_file_list)
    log.debug(this.log_prefix, '[uploadFolder]', '[complete]', `local_file_path: ${local_file_path}, remote_path: ${remote_bucket_name}/${remote_path}`, result)
    return result
  }

  uploadFile = async (local_file_path, remote_path, remote_file_name, remote_bucket_name = null, client = null) => {
    if (!(await Util.fileExists(local_file_path))) {
      throw new StdObject(102, `file not exists - ${local_file_path}`, 400)
    }
    remote_path = Util.removePathSlash(remote_path)
    remote_file_name = Util.removePathSlash(remote_file_name)
    const storage_client = await this.getStorageClient(client)
    const file_info = await Util.getFileStat(local_file_path)
    log.debug(this.log_prefix, '[uploadFile]', `remote path: ${remote_path}, remote_file_name path: ${remote_file_name}, local_file_path: ${local_file_path}`, file_info.size, file_info.size > Constants.MAX_ARCHIVE_FILE_SIZE)
    if (file_info.size > Constants.MAX_ARCHIVE_FILE_SIZE) {
      return await this.uploadSplitFile(local_file_path, remote_path, remote_file_name, remote_bucket_name, storage_client)
    } else {
      return await this.uploadFileOne(local_file_path, remote_path, remote_file_name, remote_bucket_name, storage_client)
    }
  }

  uploadFileOne = async (local_file_path, remote_path, remote_file_name, remote_bucket_name = null, client = null) => {
    remote_path = Util.removePathSlash(remote_path)
    remote_file_name = Util.removePathSlash(remote_file_name)
    const content_type_header = await this.getContentTypeHeader(local_file_path)
    const bucket = await this.getBucket(remote_bucket_name, client)
    const remote_file_path = remote_file_name !== null ? `${remote_path}/${remote_file_name}` : remote_path
    log.debug(this.log_prefix, '[uploadFileOne]', `remote_path: ${remote_path}, remote_file_name: ${remote_file_name}, local_file_path: ${local_file_path}, remote_file_path: ${remote_file_path}`)
    return bucket.create(remote_file_path, fs.createReadStream(local_file_path), null, content_type_header)
  }

  uploadSplitFile = async (local_file_path, remote_path, remote_file_name, remote_bucket_name = null, client = null) => {
    const storage_client = await this.getStorageClient(client)
    const split_file_info_list = await Util.splitFileBySize(local_file_path, Constants.MAX_ARCHIVE_FILE_SIZE)
    const content_id = Util.getContentId()
    const remote_manifest_path = remote_file_name !== null ? `${remote_path}/${remote_file_name}` : remote_path
    const remote_file_path = remote_path + '/' + content_id
    const slo_remote_path_list = []
    const target_bucket_name = this.getBucketName(remote_bucket_name)
    log.debug(this.log_prefix, '[uploadSplitFile]', `remote_path: ${remote_path}, remote_file_name: ${remote_file_name}, local_file_path: ${local_file_path}, remote_manifest_path: ${remote_manifest_path}, remote_file_path: ${remote_file_path}`, split_file_info_list)
    if (split_file_info_list && split_file_info_list.length) {
      for (let i = 0; i < split_file_info_list.length; i++) {
        const split_file_path = split_file_info_list[i]
        const split_file_name = path.basename(split_file_path)
        await this.uploadFileOne(split_file_path, remote_file_path, split_file_name, target_bucket_name, storage_client)
        slo_remote_path_list.push({
          path: `/${target_bucket_name}/${remote_file_path}/${split_file_name}`
        })
        log.debug(this.log_prefix, '[uploadSplitFile]', slo_remote_path_list)
      }
    } else {
      throw new StdObject(-1, `${this.log_prefix} [uploadSplitFile] - split file fail [${local_file_path}]`)
    }
    const bucket = await this.getBucket(remote_bucket_name, storage_client)
    log.debug(this.log_prefix, '[uploadSplitFile]', 'PUT SLO Manifest', slo_remote_path_list)
    return bucket.createSLO(remote_manifest_path, JSON.stringify(slo_remote_path_list), null, null)
  }

  getMetadata = async (remote_path, remote_file_name = null, bucket_name = null, client = null) => {
    remote_path = Util.removePathSlash(remote_path)
    remote_file_name = Util.removePathSlash(remote_file_name)
    const storage_client = await this.getStorageClient(client)
    const target_bucket_name = this.getBucketName(bucket_name)
    const target_path = remote_file_name ? `${target_bucket_name}/${remote_path}/${remote_file_name}` : `${target_bucket_name}/${remote_path}`
    log.debug(this.log_prefix, 'getMetadata', `${remote_path}, ${remote_file_name}, ${target_path}`)
    try {
      return await storage_client.meta(target_path)
    } catch (error) {
      const response = error.response || {}
      log.error(this.log_prefix, '[getMetadata]', response.statusCode, response.statusMessage, response.headers ? response.headers : 'no header')
    }
    return {}
  }

  moveFolderToObject = async (archive_path, object_path, download_directory, archive_bucket_name = null, object_bucket_name = null, client = null) => {
    const storage_client = await this.getStorageClient(client)
    await this.copyFolderToObject(archive_path, object_path, download_directory, archive_bucket_name, object_bucket_name, storage_client)
    await this.deleteFolder(archive_path, archive_bucket_name, storage_client)
  }
  moveFileToObject = async (archive_path, archive_file_name, object_path, object_file_name, download_directory, archive_bucket_name = null, object_bucket_name = null, client = null) => {
    const storage_client = await this.getStorageClient(client)
    await this.copyFileToObject(archive_path, archive_file_name, object_path, object_file_name, download_directory, archive_bucket_name, object_bucket_name, storage_client)
    await this.deleteFile(archive_path, archive_file_name, archive_bucket_name, storage_client)
  }
  moveFolderToLocal = async (remote_path, download_directory, bucket_name = null, client = null) => {
    const storage_client = await this.getStorageClient(client)
    await this.downloadFolder(remote_path, download_directory, bucket_name, storage_client)
    await this.deleteFolder(remote_path, bucket_name, storage_client)
  }
  moveFileToLocal = async (remote_path, remote_file_name, download_directory, download_file_name, bucket_name = null, client = null) => {
    const storage_client = await this.getStorageClient(client)
    await this.downloadFile(remote_path, remote_file_name, download_directory, download_file_name, bucket_name, storage_client)
    await this.deleteFile(remote_path, remote_file_name, bucket_name, storage_client)
  }
  moveFolder = async (local_file_path, remote_path, remote_bucket_name = null, client = null) => {
    const storage_client = await this.getStorageClient(client)
    await this.uploadFolder(local_file_path, remote_path, remote_bucket_name, storage_client)
    await Util.deleteDirectory(local_file_path)
  }
  moveFile = async (local_file_path, remote_path, remote_file_name, remote_bucket_name = null, client = null) => {
    const storage_client = await this.getStorageClient(client)
    await this.uploadFile(local_file_path, remote_path, remote_file_name, remote_bucket_name, storage_client)
    await Util.deleteFile(local_file_path)
  }

  beforeDownload = async (download_directory, download_file_name = null) => {
    const download_file_path = download_file_name ? `${download_directory}/${download_file_name}` : download_directory
    await Util.deleteFile(download_file_path)
    const directory = Util.getDirectoryName(download_file_path)
    const create_result = await Util.createDirectory(directory)
    if ( !create_result ) {
      throw new StdObject(102, `can't create directory. download_directory: ${download_directory}, download_file_name: ${download_file_name}, download_file_path: ${download_file_path}, directory: ${directory}`, 400)
    }
  }

  downloadFolder = async (remote_path, download_directory, bucket_name = null, client = null) => {
    const storage_client = this.getStorageClient(client)
    const target_bucket_name = this.getBucketName(bucket_name)
    const folder_object = await this.getFolderObjectList(remote_path, target_bucket_name, storage_client)
    log.debug(this.log_prefix, '[downloadFolder]', `remote_path: ${remote_path}, bucket_name: ${target_bucket_name}, download_directory: ${download_directory}`, folder_object)
    let folder_file_list = []
    if (folder_object.file_list.length > 0) {
      for (let i = 0; i < folder_object.file_list.length; i++) {
        const file_path = folder_object.file_list[i]
        const file_name = path.parse(file_path).base
        await this.downloadFile(file_path, null, download_directory, file_name, target_bucket_name, storage_client)
      }
    }
    if (folder_object.directory_list.length > 0) {
      for (let i = 0; i < folder_object.directory_list.length; i++) {
        const directory_path = folder_object.directory_list[i]
        const sub_directory = directory_path.replace(remote_path, '')
        const copy_folder_result = await this.downloadFolder(directory_path, download_directory + sub_directory, target_bucket_name, storage_client)
        folder_file_list = _.union(folder_file_list, copy_folder_result)
      }
    }
    const result = _.union(folder_object.file_list, folder_file_list)
    log.debug(this.log_prefix, '[downloadFolder]', '[complete]', `remote_path: ${remote_path}, bucket_name: ${target_bucket_name}, download_directory: ${download_directory}`, result)
    return result
  }

  downloadFile = async (remote_path, remote_file_name, download_directory, download_file_name, bucket_name = null, client = null) => {
    remote_path = Util.removePathSlash(remote_path)
    remote_file_name = Util.removePathSlash(remote_file_name)
    download_directory = Util.removePathLastSlash(download_directory)
    download_file_name = Util.removePathSlash(download_file_name)
    const bucket = await this.getBucket(bucket_name, client)
    await this.beforeDownload(download_directory, download_file_name)
    const file_stream = fs.createWriteStream(download_directory + '/' + download_file_name, { flags: 'a' })
    const remote_file_path = remote_file_name !== null ? `${remote_path}/${remote_file_name}` : remote_path
    return await bucket.get(encodeURIComponent(remote_file_path), file_stream)
  }

  copyFolderToObject = async (archive_path, object_path, download_directory, archive_bucket_name = null, object_bucket_name = null, client = null) => {
    const storage_client = await this.getStorageClient(client)
    const target_bucket_name = this.getBucketName(archive_bucket_name)
    const folder_object = await this.getFolderObjectList(archive_path, target_bucket_name, storage_client)
    log.debug(this.log_prefix, '[copyFolderToObject]', '[start]', `archive_path: ${archive_path}, archive_bucket_name: ${target_bucket_name}, object_path: ${object_path}, object_bucket_name: ${object_bucket_name}`, folder_object)
    let folder_file_list = []
    if (folder_object.file_list.length > 0) {
      for (let i = 0; i < folder_object.file_list.length; i++) {
        const file_path = folder_object.file_list[i]
        const file_name = path.parse(file_path).base
        await this.copyFileToObject(file_path, null, object_path, file_name, download_directory, target_bucket_name, object_bucket_name, storage_client)
      }
    }
    if (folder_object.directory_list.length > 0) {
      for (let i = 0; i < folder_object.directory_list.length; i++) {
        const directory_path = folder_object.directory_list[i]
        const sub_directory = directory_path.replace(archive_path, '')
        const copy_folder_result = await this.copyFolderToObject(directory_path, object_path + sub_directory, download_directory, target_bucket_name, object_bucket_name, storage_client)
        folder_file_list = _.union(folder_file_list, copy_folder_result)
      }
    }
    const result = _.union(folder_object.file_list, folder_file_list)
    log.debug(this.log_prefix, '[copyFolderToObject]', '[complete]', `archive_path: ${archive_path}, archive_bucket_name: ${target_bucket_name}, object_path: ${object_path}, object_bucket_name: ${object_bucket_name}`, result)
    return result
  }

  copyFileToObject = async (archive_path, archive_file_name, object_path, object_file_name, download_directory, archive_bucket_name = null, object_bucket_name = null, client = null) => {
    download_directory = Util.removePathSlash(download_directory)
    const download_file_name = Util.getRandomId()
    const download_file_path = download_directory + '/' + download_file_name
    log.debug(this.log_prefix, '[copyFileToObject]', `download to ${download_file_path}. origin: ${archive_bucket_name}/${archive_path}/${archive_file_name}, copy: ${object_bucket_name}/${object_path}/${object_file_name}`)
    await this.downloadFile(archive_path, archive_file_name, download_directory, download_file_name, archive_bucket_name, client)
    log.debug(this.log_prefix, '[copyFileToObject]', `download ${archive_path}/${archive_file_name} complete`)
    // uploadFile = async (local_file_path, remote_path, remote_file_name, remote_bucket_name = null, client = null) => {
    await NaverObjectStorageService.uploadFile(download_file_path, object_path, object_file_name, object_bucket_name)
    await Util.deleteFile(download_file_path)
    return true
  }

  deleteFile = async (remote_path, remote_file_name = null, bucket_name = null, client = null) => {
    remote_path = Util.removePathSlash(remote_path)
    remote_file_name = Util.removePathSlash(remote_file_name)
    const storage_client = await this.getStorageClient(client)
    const bucket = await this.getBucket(bucket_name, storage_client)
    const target_path = remote_file_name ? `${remote_path}/${remote_file_name}` : `${remote_path}`
    const object_metadata = await this.getMetadata(remote_path, remote_file_name, bucket_name, storage_client)
    if (!this.existMetadata(object_metadata)) {
      return true
    }
    log.debug(this.log_prefix, '[deleteFile]', `remote_path: ${remote_path}, remote_file_name: ${remote_file_name}, target_path: ${target_path}`, object_metadata)
    const is_slo = object_metadata && object_metadata['x-static-large-object'] === 'True'
    return await bucket.delete(encodeURIComponent(target_path), is_slo)
  }

  deleteFolder = async (remote_path, bucket_name = null, client = null) => {
    const storage_client = await this.getStorageClient(client)
    const target_bucket_name = this.getBucketName(bucket_name)
    const folder_object = await this.getFolderObjectList(remote_path, target_bucket_name, storage_client)
    log.debug(this.log_prefix, '[deleteFolder]', '[start]', `remote_path: ${remote_path}, bucket_name: ${target_bucket_name}`, folder_object)
    if (folder_object.file_list.length > 0) {
      for (let i = 0; i < folder_object.file_list.length; i++) {
        await this.deleteFile(folder_object.file_list[i], null, target_bucket_name, storage_client)
      }
    }
    let folder_file_list = []
    if (folder_object.directory_list.length > 0) {
      for (let i = 0; i < folder_object.directory_list.length; i++) {
        const delete_folder_result = await this.deleteFolder(folder_object.directory_list[i], target_bucket_name, storage_client)
        folder_file_list = _.union(folder_file_list, delete_folder_result)
      }
    }
    try {
      await this.deleteFile(remote_path, null, target_bucket_name, storage_client)
    } catch (error) {
      log.debug(this.log_prefix, '[deleteFolder]', '[delete root dir]', `remote_path: ${remote_path}, target_bucket_name: ${target_bucket_name}`, error)
    }

    const result = _.union(folder_object.file_list, folder_file_list)
    log.debug(this.log_prefix, '[deleteFolder]', '[complete]', `remote_path: ${remote_path}, remote_path: ${bucket_name}`, result)
    return result
  }

  getFolderObjectList = async (remote_path, bucket_name = null, client = null) => {
    const bucket = await this.getBucket(bucket_name, client)
    let query = null
    if (remote_path) {
      query = {}
      query.prefix = `${Util.removePathLastSlash(remote_path)}/`
      query.delimiter = `/`
    }
    const extra_header = {}
    const directory_list = []
    const file_list = []
    try {
      const folder_object_list = await bucket.list(extra_header, query)
      // log.debug(this.log_prefix, '[getFolderObjectList]', folder_object_list)
      for (let i = 0; i < folder_object_list.length; i++) {
        const content_info = folder_object_list[i]
        if (this.isSubDirectory(content_info)) {
          log.debug(this.log_prefix, '[getFolderObjectList]', content_info, content_info.subdir)
          directory_list.push(Util.removePathLastSlash(content_info.subdir))
        } else if (this.isDirectory(content_info)) {
          directory_list.push(Util.removePathLastSlash(content_info.name))
        } else {
          file_list.push(content_info.name)
        }
      }
    } catch (error) {
      log.error(this.log_prefix, 'getFolderObjectList', error)
    }
    return {
      file_list,
      directory_list
    }
  }

  getAuthenticateInfo = async () => {
    return await this.getAuth().authenticate()
  }

  existMetadata = (object_metadata) => {
    return object_metadata && object_metadata.etag
  }

  isFile = (content_info) => {
    return content_info && content_info.content_type === 'application/directory'
  }

  isDirectory = (content_info) => {
    return content_info && content_info.content_type === 'application/directory'
  }

  isSubDirectory = (content_info) => {
    return content_info && content_info.subdir
  }
}

const NaverArchiveStorage = new NaverArchiveStorageClass()
export default NaverArchiveStorage
