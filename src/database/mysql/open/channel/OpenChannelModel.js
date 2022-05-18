import MySQLModel from '../../../mysql-model'
import _ from 'lodash'

const video_default_field_list = ['open_channel_video.*', 'operation_data.title', 'operation_data.doc_html', 'operation_data.thumbnail', 'operation_data.total_time']
const video_media_field_list = _.concat(video_default_field_list, ['operation_media.video_file_name', 'operation_media.proxy_file_name', 'operation_media.stream_url'])

export default class OpenChannelModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = null
    this.selectable_fields = ['*']
    this.log_prefix = '[OpenChannelModel]'
  }
}
