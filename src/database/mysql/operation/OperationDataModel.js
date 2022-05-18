import MySQLModel from '../../mysql-model'
import OperationDataInfo from '../../../wrapper/operation/OperationDataInfo'

export default class OperationDataModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'operation_data'
    this.selectable_fields = ['*']
    this.log_prefix = '[OperationDataModel]'
  }

  getOperationDataPrams = (operation_data, set_reg_date = false) => {
    if (set_reg_date) operation_data.reg_date = this.database.raw('NOW()')
    operation_data.modify_date = this.database.raw('NOW()')
    if (operation_data.hashtag_list) {
      operation_data.hashtag_list = JSON.stringify(operation_data.hashtag_list)
    }
    if (operation_data.category_list) {
      operation_data.category_list = JSON.stringify(operation_data.category_list)
    }
    if (operation_data.thumbnail) {
      operation_data.thumbnail = this.database.raw(`IF(\`thumbnail\` IS NULL, ?, \`thumbnail\`)`, operation_data.thumbnail)
    }
    return operation_data
  }

  createOperationData = async (operation_data) => {
    const create_params = this.getOperationDataPrams(operation_data, true)
    if (!create_params.hashtag_list) {
      create_params.hashtag_list = JSON.stringify([])
    }
    if (!create_params.category_list) {
      create_params.category_list = JSON.stringify([])
    }
    return this.create(create_params, 'seq')
  }

  updateOperationData = async (operation_seq, operation_data) => {
    return this.update({ operation_seq }, this.getOperationDataPrams(operation_data))
  }

  updateOperationDataByGroupSeq = async (group_seq, operation_data) => {
    return this.update({ group_seq }, this.getOperationDataPrams(operation_data))
  }

  updateOperationDataByOperationSeqList = async (operation_seq_list, operation_data) => {
    return this.updateIn('operation_seq', operation_seq_list, this.getOperationDataPrams(operation_data))
  }

  getOperationData = async (operation_data_seq) => {
    const result = await this.findOne({ seq: operation_data_seq })
    return new OperationDataInfo(result)
  }

  getOperationDataByOperationSeq = async (operation_seq) => {
    const result = await this.findOne({ operation_seq })
    return new OperationDataInfo(result)
  }

  updateThumbnailImage = async (operation_data_seq, thumbnail_path) => {
    const filter = {
      seq: operation_data_seq
    }
    const update_params = {
      thumbnail: thumbnail_path,
      modify_date: this.database.raw('NOW()')
    }
    return this.update(filter, update_params)
  }

  updateThumbnailImageNotExists = async (operation_seq, thumbnail_path) => {
    const filter = {
      operation_seq
    }
    const update_params = {
      thumbnail: this.database.raw(`IF(\`thumbnail\` IS NULL, '${thumbnail_path}', \`thumbnail\`)`),
      modify_date: this.database.raw('NOW()')
    }
    return this.update(filter, update_params)
  }

  updateComplete = async (operation_data_seq, total_time = null) => {
    const filter = {
      seq: operation_data_seq
    }
    const update_params = {
      is_complete: 1,
      modify_date: this.database.raw('NOW()')
    }
    if (total_time) {
      update_params.total_time = total_time
    }
    return this.update(filter, update_params)
  }

  setRejectMentoring = async (operation_data_seq) => {
    try {
      const filter = {
        seq: operation_data_seq
      }
      const update_params = {
        is_mento_complete: 'R'
      }
      return this.update(filter, update_params)
    } catch (e) {
      throw e
    }
  }

  updateDoc = async (operation_data_seq, doc_html, doc_text) => {
    const filter = {
      seq: operation_data_seq
    }
    const update_params = {
      doc_html,
      doc_text,
      modify_date: this.database.raw('NOW()')
    }
    return this.update(filter, update_params)
  }

  updateOpenVideo = async (operation_data_seq, is_open_video) => {
    const filter = {
      seq: operation_data_seq
    }
    const update_params = {
      is_open_video,
      modify_date: this.database.raw('NOW()')
    }
    return this.update(filter, update_params)
  }

  getCompleteIsOpenVideoDataLists = async (group_seq, limit = null) => {
    const oKnex = this.database.select('*')
      .from('operation_data')
      .where(function () {
        this.where('group_seq', group_seq)
          .andWhere('operation_data.is_complete', '1')
          .andWhere('operation_data.status', 'Y')
          .andWhere('operation_data.is_open_video', '1')
      })
      .orderBy([{ column: 'operation_data.reg_date', order: 'desc' }])
    if (limit) {
      oKnex.limit(limit)
    }
    return oKnex
  }

  getFolloweingMemberCompleteIsOpenVideoDataLists = async (group_seq, search_keyword = null, limit = null) => {
    const oKnex = this.database.select('*')
      .from('following')
      .innerJoin('group_info', 'group_info.seq', 'following.following_seq')
      .innerJoin('operation_data', function () {
        this.on('operation_data.group_seq', 'group_info.seq')
          .andOnVal('operation_data.is_complete', '1')
          .andOnVal('operation_data.status', 'Y')
          .andOnVal('operation_data.is_open_video', '1')
      })
      .where('following.group_seq', group_seq)
      .orderBy([{ column: 'operation_data.reg_date', order: 'desc' }])
    if (search_keyword !== null) {
      oKnex.andWhereRaw('MATCH (operation_data.title, operation_data.group_name, operation_data.hospital) AGAINST (? IN BOOLEAN MODE)', `${search_keyword}*`)
    }
    if (limit) {
      oKnex.limit(limit)
    }
    return oKnex
  }
  increaseAnnoCount = async (operation_seq, field_name) => {
    const filter = {
      operation_seq
    }
    const params = {}
    params[field_name] = this.database.raw(`${field_name} + 1`)
    return this.update(filter, params)
  }

  decreaseAnnoCount = async (operation_seq, field_name) => {
    const filter = {
      operation_seq
    }
    const params = {}
    params[field_name] = this.database.raw(`IF(${field_name} > 0, ${field_name} - 1, 0)`)
    return this.update(filter, params)
  }

  updateOperationDataCounts = async (seq, field_name, counts, is_operation_seq = true) => {
    const filter = {}
    const params = {}
    if (is_operation_seq) {
      filter.operation_seq = seq
    } else {
      filter.seq = seq
    }
    params[field_name] = counts
    return this.update(filter, params)
  }

  setPlayLimit = async (seq, update_params) => {
    const filter = {
      seq
    }
    return this.update(filter, update_params)
  }
  setTemplateGrade = async (operation_seq, template_grade) => {
    return this.update({ operation_seq }, { template_grade })
  }
}
