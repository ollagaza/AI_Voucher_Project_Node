import Constants from '../../../constants/constants'
import MySQLModel from '../../mysql-model'

export default class VideoFileModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'video_file'
    this.selectable_fields = ['*']
    this.log_prefix = '[VideoFileModel]'
  }

  createVideoFile = async (file_info) => {
    return await this.create(file_info, 'seq')
  }

  videoFileSummary = async (storage_seq) => {
    const select = ['COUNT(*) AS total_count', 'SUM(file_size) AS total_size']
    return await this.findOne({ storage_seq: storage_seq, status: 'Y' }, select)
  }

  getVideoFileList = async (storage_seq) => {
    return await this.find({ storage_seq: storage_seq, status: 'Y' })
  }

  updateThumb = async (file_seq, thumbnail_path) => {
    await this.update({ seq: file_seq }, { thumbnail: thumbnail_path })
  }

  deleteAll = async (storage_seq) => {
    await this.delete({ storage_seq: storage_seq })
  }

  deleteSelectedFiles = async (file_seq_list) => {
    const query = this.database
      .select(this.selectable_fields)
      .from(this.table_name)
      .whereIn('seq', file_seq_list)
    const result_list = await query
    if (!result_list || result_list.length <= 0) {
      return []
    }

    await this.database
      .from(this.table_name)
      .whereIn('seq', file_seq_list)
      .del()

    return result_list
  }

  createVideoFileByFileInfo = async (operation_info, storage_seq, file_info, make_thumbnail = true) => {
    if (file_info.file_type === Constants.VIDEO) {
      const video_full_path = file_info.full_path
      file_info.storage_seq = storage_seq
      if (make_thumbnail) {
        file_info.thumbnail = await this.createVideoThumbnail(video_full_path, operation_info)
      }
      file_info.addKey('storage_seq')
      file_info.addKey('thumbnail')
      await this.create(file_info.toJSON(), 'seq')
      return true
    }
    return false
  }

  syncVideoFiles = async (operation_info, add_video_file_list, storage_seq) => {
    if (operation_info.created_by_user !== true) {
      await this.deleteByStorageSeq(storage_seq)
      for (let i = 0; i < add_video_file_list.length; i++) {
        const file_info = add_video_file_list[i]
        file_info.storage_seq = storage_seq
        await this.create(file_info)
      }
    }
  }

  deleteByStorageSeq = async (storage_seq) => {
    await this.delete({ storage_seq: storage_seq })
  }
}
