import _ from 'lodash'
import Util from '../../utils/Util'
import StdObject from '../../wrapper/std-object'
import log from '../../libs/logger'
import OperationDataModel from '../../database/mysql/operation/OperationDataModel'
import OperationDataInfo from '../../wrapper/operation/OperationDataInfo'
// import GroupService from '../group/GroupService'
// import ContentCountService from '../member/ContentCountService'
import DBMySQL from '../../database/knex-mysql'
import OperationService from './OperationService'
import OperationMediaService from './OperationMediaService'
import striptags from 'striptags'
// import HashtagService from './HashtagService'
import ServiceConfig from '../service-config'
import logger from "../../libs/logger";
import GroupCountModel from "../../database/mysql/group/GroupCountsModel";
import OperationClipService from "./OperationClipService";
import OperationCommentService from "./OperationCommentService";
import OperationFolderService from "./OperationFolderService";

const OperationDataServiceClass = class {
  constructor () {
    this.log_prefix = '[OperationDataService]'
    this.TYPE_COMMUNITY = 'C'
    this.TYPE_MENTORING = 'M'
  }

  getOperationDataModel = (database = null) => {
    if (database) {
      return new OperationDataModel(database)
    }
    return new OperationDataModel(DBMySQL)
  }

  getGroupCountsModel = (database) => {
    if (database) {
      return new GroupCountModel(database)
    }
    return new GroupCountModel(DBMySQL)
  }

  getOperationData = async (database, operation_seq) => {
    const operation_data_model = this.getOperationDataModel()
    return await operation_data_model.getOperationData(operation_seq)
  }

  getOperationDataByOperationSeq = async (database, operation_seq) => {
    const operation_data_model = this.getOperationDataModel()
    return await operation_data_model.getOperationDataByOperationSeq(operation_seq)
  }

  createOperationDataByOperationSeq = async (operation_seq) => {
    const operation_info = await OperationService.getOperationInfoNoJoin(DBMySQL, operation_seq)
    if (!operation_info) {
      return null
    }
    const group_seq = operation_info.group_seq
    // const group_info = await GroupService.getGroupInfo(DBMySQL, group_seq)
    return await this.createOperationDataByRequest(operation_info, { operation_data: {} }, group_info.seq, group_info.group_name, group_info.group_type, null)
  }

  createOperationDataByRequest = async (operation_info, request_body, group_seq, group_name, group_type, hospital_name = null) => {
    if (!operation_info) {
      return null
    }
    const operation_seq = operation_info.seq
    const hashtag = request_body.operation_data ? request_body.operation_data.hashtag : null
    const operation_data_info = new OperationDataInfo(request_body.operation_data).setIgnoreEmpty(true).toJSON()
    operation_data_info.operation_seq = operation_seq
    operation_data_info.group_seq = group_seq
    operation_data_info.group_name = group_name
    operation_data_info.template_grade = '{ "is_grade": false }'
    // if (group_type === GroupService.GROUP_TYPE_PERSONAL) {
    //   operation_data_info.hospital = hospital_name
    // }
    log.debug(this.log_prefix, '[createOperationDataByRequest]', operation_data_info, group_seq, group_name, group_type)
    await this.setOperationDataInfo(operation_data_info, operation_info)
    const operation_data_model = this.getOperationDataModel()
    const operation_data_seq = await operation_data_model.createOperationData(operation_data_info)

    this.updateHashtag(operation_data_seq, group_seq, hashtag)

    return operation_data_seq
  }

  copyOperationDataByRequest = async (operation_info, origin_operation_seq, type = 'N', modify_operation_data = null, mento_group_seq = null) => {
    if (!operation_info) {
      return null
    }
    const operation_data_model = this.getOperationDataModel()
    const origin_operation_data = await operation_data_model.getOperationDataByOperationSeq(origin_operation_seq)
    const operation_data_info = origin_operation_data.toJSON()

    const origin_data_seq = operation_data_info.seq
    delete operation_data_info.seq
    delete operation_data_info.view_count
    delete operation_data_info.reg_date
    delete operation_data_info.modify_date

    operation_data_info.operation_seq = operation_info.seq
    operation_data_info.group_seq = operation_info.group_seq
    operation_data_info.type = type ? type : 'N'
    operation_data_info.mento_group_seq = mento_group_seq
    operation_data_info.template_grade = '{ "is_grade": false }'

    if (!Util.isEmpty(modify_operation_data)) {
      // operation_data_info.category_list = modify_operation_data.category_list
      operation_data_info.doc_html = modify_operation_data.doc_html
      // operation_data_info.hashtag_list = Util.parseHashtag(modify_operation_data.hashtag)
      // operation_data_info.is_open_refer_file = modify_operation_data.is_open_refer_file
      // operation_data_info.mento_group_seq = modify_operation_data.mento_group_seq
      operation_data_info.is_open_video = modify_operation_data.is_open_video ? 1 : 0
    }

    if (operation_info.mode !== OperationService.MODE_FILE && operation_data_info.thumbnail) {
      operation_data_info.thumbnail = operation_data_info.thumbnail.replace(operation_info.origin_media_path, operation_info.media_path)
    }

    await this.setOperationDataInfo(operation_data_info, operation_info)
    const operation_data_seq = await operation_data_model.createOperationData(_.clone(operation_data_info))
    let hashtag = null

    if (operation_data_info.hashtag_list && operation_data_info.hashtag_list.length > 0) {
      hashtag = Util.mergeHashtag(operation_data_info.hashtag_list)
    }

    this.updateHashtag(operation_data_seq, operation_data_info.group_seq, hashtag)
    await this.updateCount(operation_data_info.group_seq, operation_info, operation_data_info)

    return { operation_data_seq, origin_data_seq }
  }

  updateOperationDataByRequest = async (database, operation_seq, request_body) => {
    const operation_info = await OperationService.getOperationInfoNoJoin(database, operation_seq)
    if (!operation_info) {
      return null
    }
    const hashtag = request_body.operation_data ? request_body.operation_data.hashtag : null
    const operation_data_info = new OperationDataInfo(request_body.operation_data).setIgnoreEmpty(true).toJSON()
    await this.setOperationDataInfo(operation_data_info, operation_info)
    const operation_data_model = this.getOperationDataModel(database)
    await operation_data_model.updateOperationData(operation_seq, operation_data_info)

    const operation_data_seq = (await operation_data_model.getOperationDataByOperationSeq(operation_seq)).seq

    this.updateHashtag(operation_data_seq, operation_info.group_seq, hashtag)

    return operation_data_seq
  }

  updateHashtag = (operation_data_seq, group_seq, hashtag) => {
    if (operation_data_seq && hashtag) {
      (
        async () => {
          try {
            logger.debug(this.log_prefix, '[updateHashtag]', operation_data_seq, hashtag)
            // await HashtagService.updateOperationHashtag(group_seq, hashtag, operation_data_seq)
          } catch (error) {
            log.error(this.log_prefix, '[updateHashtag]', operation_data_seq, hashtag, error)
          }
        }
      )()
    }
  }

  setThumbnailImage = async (operation_seq, request, response) => {
    const operation_data_model = this.getOperationDataModel()
    const operation_data = await operation_data_model.getOperationDataByOperationSeq(operation_seq)
    if (!operation_data || operation_data.isEmpty()) {
      return null
    }
    const { operation_info } = await OperationService.getOperationInfoNoAuth(DBMySQL, operation_seq)
    const directory_info = OperationService.getOperationDirectoryInfo(operation_info)
    const media_directory = directory_info.image
    if (!(await Util.fileExists(media_directory))) {
      await Util.createDirectory(media_directory)
    }
    const thumbnail_file_name = 'thumbnail'
    await Util.uploadByRequest(request, response, 'thumbnail', media_directory, thumbnail_file_name, true)

    const upload_file_info = request.file
    if (Util.isEmpty(upload_file_info)) {
      throw new StdObject(-1, '파일 업로드가 실패하였습니다.', 500)
    }

    const thumbnail_path = directory_info.media_image + thumbnail_file_name
    const update_result = await operation_data_model.updateThumbnailImage(operation_data.seq, thumbnail_path)
    log.debug(this.log_prefix, '[setThumbnailImage]', update_result)
    return directory_info.url_image + thumbnail_file_name
  }

  setThumbnailAuto = async (operation_seq, thumbnail_path) => {
    const operation_data_model = this.getOperationDataModel()
    await operation_data_model.updateThumbnailImageNotExists(operation_seq, thumbnail_path)
  }

  onUpdateComplete = async (operation_seq) => {
    const operation_data_model = this.getOperationDataModel()
    const operation_data = await operation_data_model.getOperationDataByOperationSeq(operation_seq)
    if (!operation_data || operation_data.isEmpty()) {
      return null
    }
    const group_seq = operation_data.group_seq

    const operation_info = await OperationService.getOperationInfoNoJoin(DBMySQL, operation_seq)
    if (!operation_info) {
      return null
    }
    const operation_data_info = {}
    await this.setOperationDataInfo(operation_data_info, operation_info)
    await operation_data_model.updateOperationData(operation_seq, operation_data_info)
    // const operation_info = await OperationService.getOperationInfoNoAuth(null, operation_seq)

    await this.updateCount(group_seq, operation_info, operation_data)
  }

  updateCount = async (group_seq, operation_info, operation_data) => {
    const group_count_field_name = [operation_info.mode === OperationService.MODE_OPERATION ? 'video_count' : 'file_count']
    if (operation_data.is_open_video) {
      group_count_field_name.push('open_count')
    }
  }

  setOperationDataInfo = async (operation_data_info, operation_info) => {
    operation_data_info.title = operation_info.operation_name
    operation_data_info.status = operation_info.status
    operation_data_info.is_complete = operation_info.analysis_status === 'Y'
    if (operation_data_info.doc_html) {
      operation_data_info.doc_text = striptags(operation_data_info.doc_html)
    }

    const media_info = await OperationMediaService.getOperationMediaInfoByOperationSeq(DBMySQL, operation_info.seq)
    operation_data_info.total_time = media_info ? media_info.total_time : 0
    if (!operation_data_info.thumbnail && media_info.thumbnail) {
      operation_data_info.thumbnail = media_info ? media_info.thumbnail : null
    }

    return operation_data_info
  }

  setRejectMentoring = async (operation_seq) => {
    try {
      const operation_data_model = this.getOperationDataModel()
      return await operation_data_model.setRejectMentoring(operation_seq)
    } catch (e) {
      throw e
    }
  }

  changeDocument = async (operation_data_seq, request_body) => {
    const operation_data_model = this.getOperationDataModel()
    const doc_html = request_body.doc
    const doc_text = doc_html ? striptags(doc_html) : null
    return await operation_data_model.updateDoc(operation_data_seq, doc_html, doc_text)
  }

  changeOpenVideo = async (database, group_seq, operation_data_seq, request_body) => {
    const operation_data_model = this.getOperationDataModel()
    const is_open_video = Util.isTrue(request_body.is_open_video)
    const group_count_field_name = []
    group_count_field_name.push('open_count')
    // if (is_open_video) {
    //   await GroupService.UpdateGroupInfoAddCnt(null, group_seq, group_count_field_name)
    // } else {
    //   await GroupService.UpdateGroupInfoMinusCnt(null, group_seq, group_count_field_name)
    // }
    return await operation_data_model.updateOpenVideo(operation_data_seq, is_open_video)
  }

  getCompleteIsOpenVideoDataLists = async (group_seq, limit = null) => {
    const operation_data_model = this.getOperationDataModel()
    const operation_data_list = await operation_data_model.getCompleteIsOpenVideoDataLists(group_seq, limit)
    for (let cnt = 0; cnt < operation_data_list.length; cnt++) {
      operation_data_list[cnt].thumbnail = Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), operation_data_list[cnt].thumbnail)
      log.debug(this.log_prefix, '[getCompleteIsOpenVideoDataLists]', operation_data_list[cnt].thumbnail)
    }
    return operation_data_list
  }

  getFolloweingMemberCompleteIsOpenVideoDataLists = async (group_seq, search_keyword = null, limit = null) => {
    const operation_data_model = this.getOperationDataModel()
    const operation_data_list = await operation_data_model.getFolloweingMemberCompleteIsOpenVideoDataLists(group_seq, search_keyword, limit)
    for (let cnt = 0; cnt < operation_data_list.length; cnt++) {
      operation_data_list[cnt].thumbnail = Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), operation_data_list[cnt].thumbnail)
      log.debug(this.log_prefix, '[getCompleteIsOpenVideoDataLists]', operation_data_list[cnt].thumbnail)
    }
    await this.setProfileImage(operation_data_list);
    return operation_data_list
  }

  setProfileImage = async (result) => {
    if (result.length != 0) {
      _.forEach(result, (member_info) => {
        if (!Util.isEmpty(member_info.profile_image_path)) {
          member_info.profile_image_url = Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), member_info.profile_image_path)
        } else {
          member_info.profile_image_url = '/img/renewal/mypage/profile.png'
        }
      })
    }
  }

  changeStatus = async (operation_seq, status) => {
    const operation_data_info = { status }
    const operation_data_model = this.getOperationDataModel()
    await operation_data_model.updateOperationData(operation_seq, operation_data_info)
  }

  updateOperationDataByOperationSeqList = async (operation_seq_list, status) => {
    const operation_data_info = { status }
    const operation_data_model = this.getOperationDataModel()
    await operation_data_model.updateOperationDataByOperationSeqList(operation_seq_list, operation_data_info)
  }

  changeGroupName = async (database, group_seq, group_name) => {
    const operation_data_info = { group_name }
    const operation_data_model = this.getOperationDataModel(database)
    await operation_data_model.updateOperationDataByGroupSeq(group_seq, operation_data_info)
  }

  changeGroupHospital = async (database, group_seq, hospital) => {
    const operation_data_info = { hospital }
    const operation_data_model = this.getOperationDataModel(database)
    await operation_data_model.updateOperationDataByGroupSeq(group_seq, operation_data_info)
  }

  increaseAnnoCount = async (database, operation_info) => {
    const operation_data_model = this.getOperationDataModel(database)
    await operation_data_model.increaseAnnoCount(operation_info.seq, 'anno_count')
    // const group_count_field_name = ['anno_count']
    // const group_counts_model = this.getGroupCountsModel(database)
    // await group_counts_model.AddCount(operation_info.group_seq, group_count_field_name, true)
  }
  decreaseAnnoCount = async (database, operation_info) => {
    const operation_data_model = this.getOperationDataModel(database)
    await operation_data_model.decreaseAnnoCount(operation_info.seq, 'anno_count')
    // const group_count_field_name = ['anno_count']
    // const group_counts_model = this.getGroupCountsModel(database)
    // await group_counts_model.MinusCount(operation_info.group_seq, group_count_field_name, true)
  }

  increaseOperationCommentCount = async (database, operation_info) => {
    const operation_data_model = this.getOperationDataModel(database)
    await operation_data_model.increaseAnnoCount(operation_info.seq, 'comment_count')
    // const group_count_field_name = ['video_comment']
    // const group_counts_model = this.getGroupCountsModel(database)
    // await group_counts_model.AddCount(operation_info.group_seq, group_count_field_name, true)
  }
  decreaseOperationCommentCount = async (database, operation_info) => {
    const operation_data_model = this.getOperationDataModel(database)
    await operation_data_model.decreaseAnnoCount(operation_info.seq, 'comment_count')
    // const group_count_field_name = ['video_comment']
    // const group_counts_model = this.getGroupCountsModel(database)
    // await group_counts_model.MinusCount(operation_info.group_seq, group_count_field_name, true)
  }
  updateOperationDataCounts = async () => {
    const operation_data_model = this.getOperationDataModel(DBMySQL)
    const operation_clip_count = await OperationClipService.getOperationClipCounts()
    for (let cnt = 0; cnt < operation_clip_count.length; cnt++) {
      const clip_item = operation_clip_count[cnt]
      await operation_data_model.updateOperationDataCounts(clip_item._id, 'anno_count', clip_item.count)
    }
    const operation_comment_count = await OperationCommentService.getOperationCommentCounts()
    for (let cnt = 0; cnt < operation_comment_count.length; cnt++) {
      const comment_count = operation_comment_count[cnt]
      await operation_data_model.updateOperationDataCounts(comment_count.operation_data_seq, 'comment_count', comment_count.count, false)
    }
  }
  setTemplateGrade = (operation_seq, request_body) => {
    const output = new StdObject()
    const template_grade = request_body.template_grade;
    const operation_data_model = this.getOperationDataModel()
    output.add(operation_data_model.setTemplateGrade(operation_seq, template_grade))
    return output
  }
}

const OperationDataService = new OperationDataServiceClass()
export default OperationDataService
