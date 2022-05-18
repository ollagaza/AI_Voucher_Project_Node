import Promise from 'promise'
import AWS from 'aws-sdk'
import fs from 'fs'
import path from 'path'
import log from '../../libs/logger'
import ServiceConfig from '../service-config'
import Util from '../../utils/Util'
import NaverArchiveStorageService from './naver-archive-storage-service'
import _ from 'lodash'
import StdObject from '../../wrapper/std-object'

const NaverObjectStorageClass = class {
  constructor () {
    this.log_prefix = '[NaverObjectStorageClass]'
    this.ACL_PUBLIC_READ = 'public-read'
  }

  init = async () => {
    await this.setBucketInformation()
    await this.configUpdate()
    await this.onInitComplete()
  }

  setBucketInformation = async () => {
    this.ENDPOINT = ServiceConfig.get('naver_object_storage_endpoint')
    this.REGION = ServiceConfig.get('naver_object_storage_region')
    this.DEFAULT_BUCKET_NAME = ServiceConfig.get('naver_object_storage_bucket_name')
  }

  configUpdate = async () => {
    this.ACCESS_KEY = ServiceConfig.get('naver_access_key')
    this.SECRET_KEY = ServiceConfig.get('naver_secret_key')
    log.debug(this.log_prefix, '[configUpdate]', this.ACCESS_KEY, this.SECRET_KEY)
    await AWS.config.update({
      accessKeyId: this.ACCESS_KEY,
      secretAccessKey: this.SECRET_KEY
    })
  }

  onInitComplete = async () => {
    log.debug(this.log_prefix, '[onInitComplete]', this.ENDPOINT, this.REGION, this.ACCESS_KEY, this.SECRET_KEY, this.DEFAULT_BUCKET_NAME)
  }

  getStorageClient = (client = null) => {
    if (client) return client
    // log.debug(this.log_prefix, '[getStorageClient]', this.ENDPOINT, this.REGION)
    let storage_client = null
    try {
      storage_client = new AWS.S3({
        endpoint: this.ENDPOINT,
        region: this.REGION
      })
    } catch (error) {
      log.error(this.log_prefix, '[getStorageClient]', `can't create s3 client`, error)
      throw error
    }
    return storage_client
  }

  getBucketName = (bucket_name = null) => {
    return bucket_name ? bucket_name : this.DEFAULT_BUCKET_NAME
  }

  uploadFolder = async (local_file_path, remote_path, remote_bucket_name = null) => {
    if (!(await Util.fileExists(local_file_path))) {
      throw new StdObject(101, `file not exists - ${local_file_path}`, 400)
    }
    local_file_path = Util.removePathLastSlash(local_file_path)
    const file_list = await Util.getDirectoryFileList(local_file_path)
    remote_path = Util.removePathSlash(remote_path)
    // log.debug(this.log_prefix, '[uploadFolder]', local_file_path, remote_path, file_list)
    let folder_file_list = []
    let upload_file_list = []
    for (let i = 0; i < file_list.length; i++) {
      const file = file_list[i]
      const file_path = local_file_path + '/' + file.name
      if (file.isDirectory()) {
        const upload_folder_result = await this.uploadFolder(file_path, remote_path + '/' + file.name, remote_bucket_name)
        folder_file_list = _.union(folder_file_list, upload_folder_result)
      } else {
        await this.uploadFile(file_path, remote_path, file.name, remote_bucket_name)
        upload_file_list.push(file_path)
      }
    }

    const result = _.union(upload_file_list, folder_file_list)
    log.debug(this.log_prefix, '[uploadFolder]', '[complete]', `local_file_path: ${local_file_path}, remote_path: ${remote_bucket_name}/${remote_path}`, result)
    return result
  }

  uploadFile = async (local_file_path, remote_path, remote_file_name, bucket_name = null, client = null, acl = null) => {
    if (!(await Util.fileExists(local_file_path))) {
      throw new StdObject(102, `file not exists - ${local_file_path}`, 400)
    }
    remote_path = Util.removePathSlash(remote_path)
    remote_file_name = Util.removePathSlash(remote_file_name)
    12
    const storage_client = this.getStorageClient(client)
    const target_bucket_name = this.getBucketName(bucket_name)
    const remote_file_path = remote_file_name !== null ? `${remote_path}/${remote_file_name}` : remote_path
    // log.debug(this.log_prefix, '[uploadFile]', `local_file_path: ${local_file_path}`, `remote_file_path: ${bucket_name}/${remote_file_path}`)
    const object_params = {
      Bucket: target_bucket_name,
      Key: remote_file_path,
      ACL: acl ? acl : this.ACL_PUBLIC_READ,
      Body: fs.createReadStream(local_file_path)
    }
    return await storage_client.putObject(object_params).promise()
  }

  getMetadata = async (remote_path, remote_file_name = null, bucket_name = null, client = null) => {
    remote_path = Util.removePathSlash(remote_path)
    remote_file_name = Util.removePathSlash(remote_file_name)
    const storage_client = this.getStorageClient(client)
    const target_bucket_name = this.getBucketName(bucket_name)
    const target_path = remote_file_name ? `${remote_path}/${remote_file_name}` : `${remote_path}`
    log.debug(this.log_prefix, '[getMetadata]', `${target_bucket_name}/${target_path}`)
    return await storage_client.getObject({
      Bucket: target_bucket_name,
      Key: target_path,
      Range: 'bytes=0-9'
    }).promise()
  }

  moveFolderToArchive = async (object_path, archive_path, download_directory, object_bucket_name = null, archive_bucket_name = null, client = null) => {
    const storage_client = await this.getStorageClient(client)
    await this.copyFolderToArchive(object_path, archive_path, download_directory, object_bucket_name, archive_bucket_name, storage_client)
    await this.deleteFolder(object_path, object_bucket_name, storage_client)
  }
  moveFileToArchive = async (object_path, object_file_name, archive_path, archive_file_name, download_directory, object_bucket_name = null, archive_bucket_name = null, client = null) => {
    const storage_client = await this.getStorageClient(client)
    await this.copyFileToArchive(object_path, object_file_name, archive_path, archive_file_name, download_directory, object_bucket_name, archive_bucket_name, storage_client)
    await this.deleteFile(object_path, object_file_name, object_bucket_name, storage_client)
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
  move = async (remote_path, move_path, is_folder = false, bucket_name = null, client = null, acl = null) => {
    if (is_folder) {
      await this.copyFolder(remote_path, move_path, bucket_name, client, acl)
      await this.deleteFolder(remote_path, bucket_name, client)
    } else {
      await this.copy(remote_path, move_path, bucket_name, client, acl)
      await this.deleteFolder(remote_path, null, bucket_name, client)
    }
  }

  deleteFolder = async (remote_path, bucket_name = null, client = null) => {
    const storage_client = this.getStorageClient(client)
    const target_bucket_name = this.getBucketName(bucket_name)
    const folder_object = await this.getFolderObjectList(remote_path, target_bucket_name, storage_client)
    log.debug(this.log_prefix, '[deleteFolder]', '[start]', `remote_path: ${remote_path}, bucket_name: ${target_bucket_name}`, folder_object)
    let folder_file_list = []
    if (folder_object.directory_list.length > 0) {
      for (let i = 0; i < folder_object.directory_list.length; i++) {
        const delete_folder_result = await this.deleteFolder(folder_object.directory_list[i], target_bucket_name, storage_client)
        folder_file_list = _.union(folder_file_list, delete_folder_result)
      }
    }
    if (folder_object.file_list.length > 0) {
      for (let i = 0; i < folder_object.file_list.length; i++) {
        await this.deleteFile(folder_object.file_list[i], null, target_bucket_name, storage_client)
      }
    }
    try {
      await this.deleteFile(remote_path, null, target_bucket_name, storage_client)
    } catch (error) {
      log.debug(this.log_prefix, '[deleteFolder]', '[delete root dir]', `remote_path: ${remote_path}, target_bucket_name: ${target_bucket_name}`, error)
    }

    const result = _.union(folder_object.file_list, folder_file_list)
    log.debug(this.log_prefix, '[deleteFolder]', '[complete]', `remote_path: ${remote_path}, target_bucket_name: ${target_bucket_name}`, result)
    return result
  }

  deleteFile = async (remote_path, remote_file_name = null, bucket_name = null, client = null) => {
    remote_path = Util.removePathSlash(remote_path)
    remote_file_name = Util.removePathSlash(remote_file_name)
    const storage_client = this.getStorageClient(client)
    const target_path = remote_file_name ? `${remote_path}/${remote_file_name}` : `${remote_path}`
    log.debug(this.log_prefix, '[deleteFile]', `remote_path: ${remote_path}, remote_file_name: ${remote_file_name}, target_path: ${target_path}`)
    return await storage_client.deleteObject({
      Bucket: this.getBucketName(bucket_name),
      Key: target_path
    }).promise()
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
    remote_path = Util.removePathSlash(remote_path)
    const storage_client = this.getStorageClient(client)
    const target_bucket_name = this.getBucketName(bucket_name)
    const folder_object = await this.getFolderObjectList(remote_path, target_bucket_name, storage_client)
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
    await this.beforeDownload(download_directory, download_file_name)
    const storage_client = this.getStorageClient(client)
    const target_bucket_name = this.getBucketName(bucket_name)
    const remote_file_path = remote_file_name !== null ? `${remote_path}/${remote_file_name}` : remote_path
    const params = {
      Bucket: target_bucket_name,
      Key: remote_file_path
    }
    log.debug(this.log_prefix, '[downloadFile]', remote_path, remote_file_name, download_directory, download_file_name, bucket_name, params)
    const download_file_path = download_directory + '/' + download_file_name
    const file_stream = fs.createWriteStream(download_file_path, { flags: 'a' })
    const download_promise = new Promise((resolve, reject) => {
      storage_client.getObject(params).createReadStream()
        .on('end', () => {
          return resolve(true)
        })
        .on('error', (error) => {
          return reject(error)
        }).pipe(file_stream)
    })
    const download_result = await download_promise
    log.debug(this.log_prefix, '[downloadFile]', `download ${target_bucket_name}/${remote_path}/${remote_file_name} to ${download_file_path}`, download_result)
    return download_result
  }

  copyFile = async (remote_path, copy_path, bucket_name = null, client = null, acl = null) => {
    const storage_client = await this.getStorageClient(client)
    const target_bucket_name = this.getBucketName(bucket_name)
    const object_params = {
      Bucket: target_bucket_name,
      Key: copy_path,
      CopySource: `${target_bucket_name}${remote_path}`,
      ACL: acl ? acl : this.ACL_PUBLIC_READ,
    }
    return await storage_client.copyObject(object_params).promise()
  }

  copyFolder = async (remote_path, copy_path, bucket_name = null, client = null, acl = null, is_first = true) => {
    const storage_client = await this.getStorageClient(client)
    const target_bucket_name = this.getBucketName(bucket_name)
    const folder_object = await this.getFolderObjectList(copy_path, target_bucket_name, storage_client)
    copy_path = Util.removePathLastSlash(copy_path)
    log.debug(this.log_prefix, '[copyFolder]', '[start]', `remote_path: ${remote_path}, copy_path: ${copy_path}, bucket_name: ${bucket_name}`, folder_object)
    let folder_file_list = []
    if (folder_object.file_list.length > 0) {
      for (let i = 0; i < folder_object.file_list.length; i++) {
        const file_path = folder_object.file_list[i]
        const file_name = path.parse(file_path).base
        await this.copyFile(file_path, copy_path + '/' + file_name, target_bucket_name, storage_client, acl, false)
      }
    }
    if (folder_object.directory_list.length > 0) {
      for (let i = 0; i < folder_object.directory_list.length; i++) {
        const directory_path = folder_object.directory_list[i]
        const sub_directory = directory_path.replace(remote_path, '')
        const copy_folder_result = await this.copyFolder(directory_path, copy_path + sub_directory, target_bucket_name, storage_client, acl, false)
        folder_file_list = _.union(folder_file_list, copy_folder_result)
      }
    }
    const result = _.union(folder_object.file_list, folder_file_list)
    if (is_first) {
      log.debug(this.log_prefix, '[copyFolder]', '[complete]', `remote_path: ${remote_path}, copy_path: ${copy_path}, bucket_name: ${bucket_name}`, result)
    }
    return result
  }

  copyFolderToArchive = async (object_path, archive_path, download_directory, object_bucket_name = null, archive_bucket_name = null, client = null) => {
    const storage_client = await this.getStorageClient(client)
    const target_bucket_name = this.getBucketName(object_bucket_name)
    const folder_object = await this.getFolderObjectList(object_path, target_bucket_name, storage_client)
    log.debug(this.log_prefix, '[copyFolderToArchive]', '[start]', `object_path: ${object_path}, object_bucket_name: ${target_bucket_name}, archive_path: ${archive_path}, archive_bucket_name: ${archive_bucket_name}`, folder_object)
    let folder_file_list = []
    if (folder_object.file_list.length > 0) {
      for (let i = 0; i < folder_object.file_list.length; i++) {
        const file_path = folder_object.file_list[i]
        const file_name = path.parse(file_path).base
        await this.copyFileToArchive(file_path, null, archive_path, file_name, download_directory, target_bucket_name, archive_bucket_name, storage_client)
      }
    }
    if (folder_object.directory_list.length > 0) {
      for (let i = 0; i < folder_object.directory_list.length; i++) {
        const directory_path = folder_object.directory_list[i]
        const sub_directory = directory_path.replace(object_path, '')
        const copy_folder_result = await this.copyFolderToArchive(directory_path, archive_path + sub_directory, download_directory, target_bucket_name, archive_bucket_name, storage_client)
        folder_file_list = _.union(folder_file_list, copy_folder_result)
      }
    }
    const result = _.union(folder_object.file_list, folder_file_list)
    log.debug(this.log_prefix, '[copyFolderToArchive]', '[complete]', `object_path: ${object_path}, object_bucket_name: ${target_bucket_name}, archive_path: ${archive_path}, archive_bucket_name: ${archive_bucket_name}`, result)
    return result
  }

  copyFileToArchive = async (object_path, object_file_name, archive_path, archive_file_name, download_directory, object_bucket_name = null, archive_bucket_name = null, client = null) => {
    download_directory = Util.removePathSlash(download_directory)
    const download_file_name = Util.getRandomId()
    const download_file_path = download_directory + '/' + download_file_name
    log.debug(this.log_prefix, '[copyFileToObject]', `download to ${download_file_path}. origin: ${object_bucket_name}/${object_path}/${object_file_name}, copy: ${archive_bucket_name}/${archive_path}/${archive_file_name}`)
    await this.downloadFile(object_path, object_file_name, download_directory, download_file_name, object_bucket_name, client)
    log.debug(this.log_prefix, '[copyFileToObject]', `download ${object_path}/${object_file_name} complete`)
    await NaverArchiveStorageService.uploadFile(download_file_path, archive_path, archive_file_name, archive_bucket_name)
    await Util.deleteFile(download_file_path)
    return true
  }

  getFolderObjectList = async (remote_path, bucket_name = null, client = null) => {
    const storage_client = this.getStorageClient(client)
    const target_bucket_name = this.getBucketName(bucket_name)

    const params = {
      Bucket: target_bucket_name,
      Prefix: `${Util.removePathLastSlash(remote_path)}/`,
      Delimiter: '/'
    }
    const directory_list = []
    const file_list = []

    try {
      const folder_object_list = await storage_client.listObjects(params).promise()
      if (folder_object_list.CommonPrefixes) {
        for (let i = 0; i < folder_object_list.CommonPrefixes.length; i++) {
          const content_info = folder_object_list.CommonPrefixes[i]
          directory_list.push(Util.removePathLastSlash(content_info.Prefix))
        }
      }
      if (folder_object_list.Contents) {
        for (let i = 0; i < folder_object_list.Contents.length; i++) {
          const content_info = folder_object_list.Contents[i]
          file_list.push(content_info.Key)
        }
      }
    } catch (error) {
      log.debug(this.log_prefix, '[getFolderObjectList]', error)
    }
    return {
      file_list,
      directory_list
    }
  }
}

const NaverObjectStorageService = new NaverObjectStorageClass()
export default NaverObjectStorageService
