import MySQLModel from '../../mysql-model'
import OperationMediaInfo from '../../../wrapper/operation/OperationMediaInfo'

export default class OperationMediaModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'operation_media'
    this.selectable_fields = ['*']
    this.log_prefix = '[OperationMediaModel]'
  }

  getOperationMediaInfo = async (operation_info) => {
    const media_info = new OperationMediaInfo(await this.findOne({ operation_seq: operation_info.seq }))
    if (!media_info.isEmpty()) {
      media_info.setUrl(operation_info)
    }
    return media_info
  }

  getOperationMediaInfoByOperationSeq = async (operation_seq) => {
    return new OperationMediaInfo(await this.findOne({ operation_seq }))
  }

  createOperationMediaInfo = async (operation_info) => {
    const create_params = {
      operation_seq: operation_info.seq
    }
    return await this.create(create_params, 'seq')
  }

  copyOperationMediaInfo = async (media_info) => {
    return await this.create(media_info, 'seq')
  }

  updateTransComplete = async (operation_seq, update_params) => {
    return await this.update({ operation_seq }, update_params)
  }

  reSetOperationMedia = async (operation_info) => {
    const update_params = {
      'video_file_name': null,
      'proxy_file_name': null,
      'fps': 0,
      'width': 0,
      'height': 0,
      'total_time': 0,
      'total_frame': 0,
      'smil_file_name': null,
      'is_trans_complete': 0,
      'thumbnail': null,
      'modify_date': this.database.raw('NOW()')
    }
    return await this.update({ operation_seq: operation_info.seq }, update_params)
  }

  updateStreamUrl = async (operation_seq, stream_url) => {
    const update_params = {
      'stream_url': stream_url,
      'modify_date': this.database.raw('NOW()')
    }
    return await this.update({ operation_seq }, update_params)
  }

  updateData = async (operation_seq, update_params) => {
    update_params.modify_date = this.database.raw('NOW()')
    return await this.update({ operation_seq }, update_params)
  }
}
