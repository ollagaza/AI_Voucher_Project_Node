import Constants from '../../constants/constants'
import Util from '../../utils/Util'
import ServiceConfig from '../../service/service-config'

/*
{
	"content_id": "aaaa",
	"is_folder": true,
	"origin_type": "local",
	"origin_bucket": "/datas/hwj/temp",
	"origin_path": "data/aa",
	"remote_type": "archive",
	"remote_bucket": "test-hwj",
	"remote_path": "data/bb",
	"file_list": [
		{
			"origin_file_name": "vacs_01.csv",
			"remote_file_name": "vacs_01.csv"
		},
		{
			"origin_file_name": "vacs_01.xlsx"
		},
		{
			"origin_file_name": "vacs_02.csv"
		},
		{
			"origin_file_name": "vacs_02.xlsx"
		},
		{
			"origin_file_name": "vacs_03.csv"
		},
		{
			"origin_file_name": "vacs_03.xlsx"
		}
	],
	"response_options": {
        "hostname": "localhost",
        "port": 5000,
        "path": "/api/test/response",
        "method": "POST"
    },
	"response_data": {
		"aaaa": "bbbb",
		"ccc": 1
	},
	"expire_days": 3
}
 */

export default class CloudFileInfo {
  constructor () {
    this.content_id = Util.getContentId()
    this.is_folder = true
    this.origin_type = Constants.LOCAL
    this.origin_bucket = ServiceConfig.getStorageServerRoot()
    this.origin_path = null
    this.remote_type = Constants.OBJECT
    this.remote_bucket = ServiceConfig.get('object_storage_bucket_name')
    this.remote_path = null
    this.file_list = null
    this.response_options = null
    this.response_data = null
    this.expire_days = 0
  }

  setResponseOption = (response_url, method = 'POST', hostname = null, port = null) => {
    this.response_options = {
      'hostname': hostname ? hostname : ServiceConfig.get('api_server_domain'),
      'port': port ? port : ServiceConfig.get('api_server_port'),
      'path': response_url,
      'method': method
    }
  }

  setResponseData = (response_data) => {
    this.response_data = response_data
  }

  addFile = (file_path) => {
    if (!this.file_list) {
      this.file_list = []
    }
    this.file_list.push(file_path)
  }

  addFiles = (file_list) => {
    this.file_list = file_list
  }

  toJSON = () => {
    return {
      'content_id': this.content_id,
      'is_folder': this.is_folder,
      'origin_type': this.origin_type,
      'origin_bucket': this.origin_bucket,
      'origin_path': this.origin_path,
      'remote_type': this.remote_type,
      'remote_bucket': this.remote_bucket,
      'remote_path': this.remote_path,
      'file_list': this.file_list,
      'response_options': this.response_options,
      'response_data': this.response_data,
      'expire_days': this.expire_days
    }
  }
}
