import MySQLModel from '../../mysql-model'
import Util from '../../../utils/Util'
import logger from '../../../libs/logger'

export default class OperationFileModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'operation_file'
    this.selectable_fields = ['*']
    this.log_prefix = '[OperationFileModel]'
  }

  createOperationFile = async (operation_file_info) => {
    return this.create(operation_file_info, 'seq')
  }

  createOperationFileBatch = async (operation_file_info_list) => {
    return this.database
      .insert(operation_file_info_list)
      .into(this.table_name)
  }

  getOperationFileList = async (operation_seq, last_seq = null, limit = 0) => {
    const query = this.database
      .select(this.selectable_fields)
      .from(this.database.raw('operation_file use index (`INDEX_of_operation_seq`)'))
      .where('operation_seq', operation_seq)
    if (last_seq) {
      query.andWhere('seq', '>', last_seq)
    }
    if (limit > 0) {
      query.limit(limit)
    }
    return query
  }

  deleteFileByOperationSeq = async (operation_seq) => {
    return this.delete({ operation_seq })
  }

  deleteFile = async (operation_seq, file_seq) => {
    return this.delete({ seq: file_seq, operation_seq })
  }

  deleteFolder = async (operation_seq, directory) => {
    return this.database
      .from(this.table_name)
      .where('operation_seq', operation_seq)
      .where((builder) => {
        builder.where('directory', directory)
        builder.orWhere('directory', 'LIKE', `${directory}/%`)
      })
      .del()
  }

  changeFileName = async (operation_seq, file_seq, new_file_name) => {
    const update_params = {
      file_name: new_file_name
    }
    return this.update({ seq: file_seq, operation_seq }, update_params )
  }
  changeFolderName = async (operation_seq, directory, new_directory) => {
    const update_params = {
      directory: this.database.raw('REPLACE(directory, ?, ?)', [directory, new_directory])
    }
    return this.database
      .update(update_params)
      .from(this.table_name)
      .where('operation_seq', operation_seq)
      .where((builder) => {
        builder.where('directory', directory)
        builder.orWhere('directory', 'LIKE', `${directory}/%`)
      })
  }

  operationFileSummary = async (operation_seq) => {
    const select = ['COUNT(*) AS total_count', 'SUM(file_size) AS total_size']
    return await this.findOne({ operation_seq }, select)
  }

  deleteSelectedFiles = async (operation_seq, file_seq_list) => {
    const query = this.database
      .select(this.selectable_fields)
      .from(this.table_name)
      .where('operation_seq', operation_seq)
      .whereIn('seq', file_seq_list)
    const result_list = await query
    if (!result_list || result_list.length <= 0) {
      return []
    }

    await this.database
      .from(this.table_name)
      .where('operation_seq', operation_seq)
      .whereIn('seq', file_seq_list)
      .del()

    return result_list
  }

  isValidFileName = async (operation_seq, file_seq, directory, new_file_name) => {
    const query = this.database.select(this.database.raw('COUNT(*) AS cnt'))
      .from(this.database.raw('operation_file use index (`INDEX_of_default`)'))
      .where('operation_seq', operation_seq)
      .andWhere('directory', directory)
      .andWhere('file_name', new_file_name)
      .whereNot('seq', file_seq)
      .first()
    const query_result = await query
    return !query_result || Util.parseInt(query_result.cnt, 0) === 0
  }

  isValidFolderName = async (operation_seq, new_directory) => {
    const query = this.database.select(this.database.raw('COUNT(*) AS cnt'))
      .from(this.database.raw('operation_file use index (`INDEX_of_default`)'))
      .where('operation_seq', operation_seq)
      .andWhere('directory', new_directory)
      .first()
    const query_result = await query
    return !query_result || Util.parseInt(query_result.cnt, 0) === 0
  }

  changeFilesInfoByDirectory = async (operation_seq, update_data, directory, current_type = null) => {
    const query = this.database
      .update(update_data)
      .from(this.table_name)
      .where('operation_seq', operation_seq)
      .where((builder) => {
        builder.where('directory', directory)
        builder.orWhere('directory', 'LIKE', `${directory}/%`)
      })
    if (current_type) {
      query.where('type', current_type)
    }
    return query
  }

  changeFilesInfoByFileSeqList = async (operation_seq, update_data, file_seq_list, current_type = null) => {
    const query = this.database
      .update(update_data)
      .from(this.table_name)
      .where('operation_seq', operation_seq)
      .whereIn('seq', file_seq_list)
    if (current_type) {
      query.where('type', current_type)
    }
    return query
  }
}
