import Util from '../../utils/Util'
import DBMySQL from '../../database/knex-mysql'
import OpenChannelBannerModel from '../../database/mysql/open/channel/OpenChannelBannerModel'
import OpenChannelCategoryModel from '../../database/mysql/open/channel/OpenChannelCategoryModel'
import OpenChannelVideoModel from '../../database/mysql/open/channel/OpenChannelVideoModel'
import GroupModel from '../../database/mysql/group/GroupModel'
import GroupMemberModel from '../../database/mysql/group/GroupMemberModel'
import OperationDataModel from '../../database/mysql/operation/OperationDataModel'
import StdObject from '../../wrapper/std-object'
import ServiceConfig from '../service-config'
import Constants from '../../constants/constants'
import path from 'path'
import OpenChannelBannerInfo from '../../wrapper/open/channel/OpenChannelBannerInfo'
import NaverObjectStorageService from '../storage/naver-object-storage-service'
import logger from '../../libs/logger'
import OpenChannelCategoryInfo from '../../wrapper/open/channel/OpenChannelCategoryInfo'
import GroupService from '../group/GroupService'
import OpenChannelDataModel from '../../database/mysql/open/channel/OpenChannelDataModel'

const OpenChannelManagerServiceClass = class {
  constructor() {
    this.log_prefix = '[OpenChannelManagerService]'
    this.CATEGORY_ALL = 'all'
  }

  getBannerModel = (database) => {
    if (database) {
      return new OpenChannelBannerModel(database)
    }
    return new OpenChannelBannerModel(DBMySQL)
  }

  getCategoryModel = (database) => {
    if (database) {
      return new OpenChannelCategoryModel(database)
    }
    return new OpenChannelCategoryModel(DBMySQL)
  }

  getVideoModel = (database) => {
    if (database) {
      return new OpenChannelVideoModel(database)
    }
    return new OpenChannelVideoModel(DBMySQL)
  }

  getDataModel = (database) => {
    if (database) {
      return new OpenChannelDataModel(database)
    }
    return new OpenChannelDataModel(DBMySQL)
  }

  getOperationDataModel = (database) => {
    if (database) {
      return new OperationDataModel(database)
    }
    return new OperationDataModel(DBMySQL)
  }

  getGroupModel = (database) => {
    if (database) {
      return new GroupModel(database)
    }
    return new GroupModel(DBMySQL)
  }

  getGroupMemberModel = (database) => {
    if (database) {
      return new GroupMemberModel(database)
    }
    return new GroupMemberModel(DBMySQL)
  }

  getGroupInfo = async (group_seq) => {
    group_seq = Util.parseInt(group_seq, 0)
    if (group_seq <= 0) {
      throw new StdObject(8701, '채널 정보가 존재하지 않습니다.', 500)
    }
    const group_model = this.getGroupModel()
    const group_info = await group_model.getGroupInfo(group_seq)
    if (!group_info || group_info.seq !== group_seq) {
      throw new StdObject(8702, '채널 정보가 존재하지 않습니다.', 500)
    }
    if (group_info.status !== GroupService.GROUP_STATUS_FREE && group_info.status !== GroupService.GROUP_STATUS_ENABLE) {
      throw new StdObject(8703, '사용이 정지된 채널입니다.', 500)
    }
    return group_info
  }

  getOpenChannelContentInfo = async (group_seq) => {
    const banner_list = await this.getOpenChannelBannerInfo(group_seq)
    const category_list = await this.getOpenChannelCategoryInfo(group_seq)

    const channel_content = {
      banner_list: banner_list.get('banner_list'),
      category_list: category_list.get('category_list')
    }

    const output = new StdObject()
    output.add('channel_content', channel_content)
    return output
  }

  getOpenChannelCategoryInfo = async (group_seq) => {
    const output = new StdObject()

    const category_model = this.getCategoryModel()
    const category_list = await category_model.getOpenChannelCategoryList(group_seq)

    output.add('category_list', category_list)
    return output
  }

  getOpenChannelBannerInfo = async (group_seq) => {
    const output = new StdObject()

    const banner_model = this.getBannerModel()
    const banner_list = await banner_model.getOpenChannelBannerList(group_seq)

    output.add('banner_list', banner_list)
    return output
  }

  getChannelSummary = async (domain_status) => {
    const group_seq = domain_status.group_seq
    const group_info = await this.getGroupInfo(group_seq)

    const channel_summary = {
      domain: domain_status.domain,
      channel_seq: group_seq,
      group_grade: domain_status.group_grade,
      group_grade_number: domain_status.group_grade_number,
      group_member_status: domain_status.group_member_status,
      is_channel_manager: domain_status.is_channel_manager,
      is_join_channel: domain_status.is_join_channel,
      tag_list: group_info.search_keyword ? JSON.parse(group_info.search_keyword) : {},
      channel_name: Util.trim(group_info.group_name),
      explain: Util.trim(group_info.group_explain),
      member_count: Util.parseInt(group_info.member_count),
      group_image_url: Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), JSON.parse(group_info.profile).image),
      profile_image_url: Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), group_info.profile_image_path),
      channel_top_img_url: Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), group_info.channel_top_img_path)
    }

    const output = new StdObject()
    output.add('channel', channel_summary)
    return output
  }

  getListParams = (request) => {
    const page_params = {}
    const order_params = {}
    const filter_params = {}
    const request_params = request.query ? request.query : request.body
    if (request_params) {
      page_params.page = Util.parseInt(request_params.page, 1)
      page_params.list_count = Util.parseInt(request_params.list_count, 20)
      page_params.page_count = Util.parseInt(request_params.page_count, 10)
      page_params.no_paging = request_params.no_paging === 'n' ? 'n' : 'y'
      page_params.offset = Util.parseInt(request_params.offset, 0)
      order_params.random = request_params.order_type === 'random'
      if (Util.trim(request_params.order_fields) && Util.trim(request_params.order_type)) {
        order_params.field = Util.trim(request_params.order_fields)
        order_params.type = Util.trim(request_params.order_type)
      }
      filter_params.search_keyword = Util.trim(request_params.search_keyword) ? Util.trim(request_params.search_keyword) : null
    }
    logger.debug(this.log_prefix, '[getListParams]', request_params.search_keyword, filter_params)
    return { page_params, order_params, filter_params}
  }

  getOpenChannelVideoList = async (group_seq, category_seq, request) => {
    const { page_params, order_params, filter_params} = this.getListParams(request)
    category_seq = this.getCategoryId(category_seq)

    const video_model = this.getVideoModel()
    const video_list = await video_model.getOpenChannelVideoList(group_seq, category_seq === this.CATEGORY_ALL, category_seq, page_params, filter_params, order_params)
    const output = new StdObject()
    output.adds(video_list)

    return output
  }

  addBanner = async (group_seq, request, response) => {
    const group_info = await this.getGroupInfo(group_seq)
    const group_path = `${group_info.media_path}/open/channel/`
    const upload_directory = ServiceConfig.getMediaRoot() + group_path
    await Util.createDirectory(upload_directory)
    await Util.uploadByRequest(request, response, 'banner', upload_directory, Util.getRandomId())
    const upload_file_info = request.file
    if (Util.isEmpty(upload_file_info)) {
      throw new StdObject(8801, '배너 파일 업로드가 실패하였습니다.', 500)
    }
    let banner_file_path = upload_file_info.path
    const banner_media_info = await Util.getMediaInfo(banner_file_path)
    if (!banner_media_info || !banner_media_info.media_info || !banner_media_info.media_info.width || !banner_media_info.media_info.height || banner_media_info.media_type !== Constants.IMAGE) {
      throw new StdObject(8802, '이미지 파일만 업로드 가능합니다.', 500)
    }
    logger.debug(this.log_prefix, '[addBanner]', upload_file_info)
    let banner_file_name = upload_file_info.filename

    const request_body = request.body
    const banner_info = new OpenChannelBannerInfo()
    banner_info.group_seq = group_seq
    banner_info.image_path = group_path + banner_file_name
    if (request_body) {
      banner_info.link = Util.trim(request_body.link)
      banner_info.text = Util.trim(request_body.text)
      banner_info.order = Util.parseInt(request_body.order, 99)
    }
    const path_info = path.parse(banner_file_path)
    const image_ext = `${path_info.ext}`.toLowerCase()
    if (image_ext !== '.png' && image_ext !== '.jpg') {
      const resize_image_name = `${path_info.name}${image_ext}`
      const resize_image_path = `${path_info.dir}/${resize_image_name}`
      const resize_result = await Util.resizeImage(upload_file_info.path, resize_image_path)
      if (resize_result.success && (await Util.fileExists(resize_image_path))) {
        await Util.deleteFile(upload_directory + banner_file_name)
        banner_info.image_path = group_path + resize_image_name
        banner_file_path = resize_image_path
        banner_file_name = resize_image_name
      }
    }

    if (!ServiceConfig.isVacs()) {
      await NaverObjectStorageService.uploadFile(banner_file_path, group_path, banner_file_name)
    }
    const banner_model = this.getBannerModel()
    const created_banner_info = await banner_model.createOpenChannelBannerInfo(banner_info)

    const output = new StdObject()
    output.add('banner_info', created_banner_info)
    return output
  }

  deleteBanner = async (group_seq, banner_seq) => {
    const banner_model = this.getBannerModel()
    const banner_info = await banner_model.getOpenChannelBannerInfo(banner_seq)
    await banner_model.deleteOpenChannelBannerInfo(group_seq, banner_seq)
    this.deleteBannerFile(banner_info.image_path)
    return new StdObject()
  }
  deleteBannerFile = (image_path) => {
    (
      async (image_path) => {
        try {
          if (ServiceConfig.isVacs()) {
            await Util.deleteFile(ServiceConfig.getMediaRoot() + image_path)
          } else {
            await NaverObjectStorageService.deleteFile(image_path)
          }
        } catch (error) {
          logger.error(this.log_prefix, '[deleteBanner]', error)
        }
      }
    )(image_path)
  }

  modifyBannerOrder = async (group_seq, request) => {
    logger.debug(this.log_prefix, '[modifyBannerOrder]', request.body)
    if (!request || !request.body || Util.isEmpty(request.body.order_data_list)) {
      return new StdObject(8803, '잘못된 접근입니다.', 500)
    }
    const banner_model = this.getBannerModel()
    await banner_model.modifyBannerOrder(group_seq, request.body.order_data_list)
    return new StdObject()
  }

  modifyBannerInfo = async (group_seq, banner_seq, request) => {
    logger.debug(this.log_prefix, '[modifyBannerInfo]', request.body)
    if (!request || !request.body || Util.isEmpty(request.body.banner_info)) {
      return new StdObject(8804, '잘못된 접근입니다.', 500)
    }
    const banner_model = this.getBannerModel()
    await banner_model.modifyBannerInfo(group_seq, banner_seq, new OpenChannelBannerInfo(request.body.banner_info))
    return new StdObject()
  }

  verifyChannelDomain = async (domain, group_seq = null) => {
    const group_model = this.getGroupModel()
    const verify_result = await group_model.verifyChannelDomain(group_seq, Util.trim(domain).toLowerCase())
    const output = new StdObject()
    output.add('is_verify', verify_result === true)
    return output
  }

  verifyCategoryName = async (group_seq, category_name, category_seq = null) => {
    const category_model = this.getCategoryModel()
    const is_used_category_name = await category_model.isUsedCategoryName(group_seq, category_name, category_seq)
    const output = new StdObject()
    output.add('is_verify', is_used_category_name !== true)
    return output
  }

  getCategoryId = (category_seq) => {
    const int_id = Util.parseInt(category_seq, 0)
    return int_id > 0 ? int_id : this.CATEGORY_ALL
  }

  isUsedCategoryName = async (group_seq, category_name, category_seq = null) => {
    const verify_category_name = await this.verifyCategoryName(group_seq, category_name, category_seq)
    logger.debug(this.log_prefix, '[isUsedCategoryName]', group_seq, category_name, category_seq, verify_category_name.toJSON(), verify_category_name.get('is_verify'))
    if (!verify_category_name.get('is_verify')) {
      throw new StdObject(8842, '이미 사용중인 카테고리명입니다.', 500)
    }
  }

  createCategory = async (group_seq, request) => {
    if (!request.body || !request.body.category_info) {
      return new StdObject(8821, '잘못된 접근입니다.', 500)
    }
    const category_info = new OpenChannelCategoryInfo(request.body.category_info)
    category_info.group_seq = group_seq

    await this.isUsedCategoryName(group_seq, category_info.category_name)

    const category_model = this.getCategoryModel()
    const create_category_info = await category_model.createOpenChannelCategoryInfo(category_info)

    const output = new StdObject()
    output.add('category_info', create_category_info)
    return output
  }
  modifyCategory = async (group_seq, category_seq, request) => {
    if (!request.body || !request.body.category_info || !Util.trim(request.body.category_info.category_name)) {
      return new StdObject(8831, '잘못된 접근입니다.', 500)
    }
    const category_name = Util.trim(request.body.category_info.category_name)
    await this.isUsedCategoryName(group_seq, category_name)

    const category_model = this.getCategoryModel()
    await category_model.modifyCategoryName(group_seq, category_seq, category_name)
    return new StdObject()
  }
  deleteCategory = async (group_seq, category_seq) => {
    const category_model = this.getCategoryModel()
    await category_model.deleteOpenChannelCategoryInfo(group_seq, category_seq)
    return new StdObject()
  }

  getCategoryVideoList = async (group_seq, request) => {
    const category_seq = request.query && request.query.category_seq ? request.query.category_seq : null
    const folder_seq = request.query && request.query.folder_seq ? request.query.folder_seq : null
    const { page_params, filter_params} = this.getListParams(request)

    const video_model = this.getVideoModel()
    const video_list = await video_model.getCategoryVideoList(group_seq, category_seq, folder_seq, page_params, filter_params)

    const output = new StdObject()
    output.adds(video_list)
    return output
  }
  getMaxOrder = async (group_seq, category_seq) => {
    const video_model = this.getVideoModel()
    const max_order = await video_model.getMaxOrder(group_seq, category_seq)

    const output = new StdObject()
    output.add('max_order', max_order)
    return output
  }
  addOpenChannelVideoList = async (group_seq, category_seq, request) => {
    if (!request.body || !request.body.video_info_list || !request.body.video_info_list.length) {
      return new StdObject(8841, '잘못된 접근입니다.', 500)
    }
    const video_info_list = request.body.video_info_list

    const video_model = this.getVideoModel()
    const result = await video_model.addOpenVideo(group_seq, category_seq, video_info_list)

    const category_model = this.getCategoryModel()
    await category_model.setCategoryVideoCount(group_seq, category_seq)

    const output = new StdObject()
    output.add('result', result)
    return output
  }
  changeOpenVideo = async (group_seq, category_seq, video_seq, request) => {
    if (!request.body || !request.body.video_info) {
      return new StdObject(8851, '잘못된 접근입니다.', 500)
    }

    const video_model = this.getVideoModel()
    const result = await video_model.changeOpenVideo(group_seq, category_seq, video_seq, request.body.video_info)

    const output = new StdObject()
    output.add('result', result)
    return output
  }

  setVideoPlayLimit = async (group_seq, operation_data_seq, request) => {
    if (!request.body || !request.body.limit_info) {
      return new StdObject(8861, '잘못된 접근입니다.', 500)
    }
    const limit_info = request.body.limit_info
    const update_params = {}
    if (limit_info.is_play_limit !== undefined) {
      update_params.is_play_limit = Util.isTrue(limit_info.is_play_limit)
    }
    if (!limit_info.is_play_limit) {
      update_params.play_limit_time = 0
    } else if (limit_info.play_limit_time !== undefined) {
      update_params.play_limit_time = Util.parseInt(limit_info.play_limit_time, 0)
    }
    const operation_data_model = this.getOperationDataModel()
    return operation_data_model.setPlayLimit(operation_data_seq, update_params)
  }

  deleteVideo = async (group_seq, category_seq, request) => {
    if (!request.body || !request.body.open_video_info) {
      return new StdObject(8821, '잘못된 접근입니다.', 500)
    }
    category_seq = this.getCategoryId(category_seq)
    const open_video_info = request.body.open_video_info
    const operation_data_seq = open_video_info.data_seq
    const operation_seq = open_video_info.operation_seq
    const video_seq = open_video_info.video_seq
    const is_all = category_seq === this.CATEGORY_ALL
    const operation_model = this.getOperationDataModel()
    const video_model = this.getVideoModel()
    if (is_all) {
      await operation_model.updateOpenVideo(operation_data_seq, false)
    }
    await video_model.deleteOpenChannelVideoInfo(operation_seq, is_all ? null : video_seq)

    const category_model = this.getCategoryModel()
    await category_model.setCategoryVideoCount(group_seq, is_all ? null : category_seq)

    return new StdObject()
  }

  getStatusByDomain = async (domain, request) => {
    const group_model = this.getGroupModel()
    const group_seq_info = await group_model.getGroupSeqByDomain(domain)
    if (!group_seq_info || !group_seq_info.seq) {
      throw new StdObject(8871, '존재하지 않는 채널입니다.', 400)
    }
    const group_seq = group_seq_info.seq
    await this.getGroupInfo(group_seq)
    const token_info = request.token_info
    let member_seq = null
    if (token_info) {
      member_seq = Util.parseInt(token_info.getId(), null)
    }

    const result = {
      domain,
      group_seq,
      member_seq,
      token_info,
      is_channel_manager: false,
      is_join_channel: false,
      group_member_status: 'N',
      group_grade: '0',
      group_grade_number: 0
    }
    if (group_seq && member_seq) {
      const group_member_model = this.getGroupMemberModel()
      const group_member_info = await group_member_model.getGroupMemberInfo(group_seq, member_seq)
      if (group_member_info) {
        group_member_info.group_member_status = group_member_info.status
        const member_status = GroupService.checkGroupMemberStatus(group_member_info)
        result.is_channel_manager = member_status.is_group_admin
        result.is_join_channel = member_status.is_active_group_member
        result.group_member_status = member_status.group_member_status
        result.group_grade = member_status.group_grade
        result.group_grade_number = member_status.group_grade_number
      }
    }

    return result
  }

  getOpenVideoInfo = async (operation_seq, is_join_channel) => {
    const video_model = this.getVideoModel()
    const video_info = await video_model.getOpenChannelVideoInfo(operation_seq, true, is_join_channel)
    const output = new StdObject()
    output.add('video_info', video_info)
    return output
  }

  updateRecentVideoList = async (group_seq) => {

  }

  updateOpenPageData = () => {
    (
      async () => {
        try {
          const group_model = this.getGroupModel()
          const group_list = await group_model.getAllGroupInfo()
          logger.debug(this.log_prefix, '[updateOpenPageData]', 'start update => group count:', group_list.length)
          for (let i = 0; i < group_list.length; i++) {
            const group_info = group_list[i]
            try {
              await this.updateOpenPageDataByGroupSeq(group_info)
              await Util.sleep(500)
            } catch (error) {
              logger.error(this.log_prefix, '[updateOpenPageData] update group data', group_info.seq, error)
            }
          }
        } catch (error) {
          logger.error(this.log_prefix, '[updateOpenPageData]', error)
        }
      }
    )()
  }

  updateOpenPageDataByGroupSeq = async (group_info) => {
    const group_seq = group_info.seq
    const data_model = this.getDataModel()
    const video_model = this.getVideoModel()

    const update_data = {}
    update_data[data_model.FIELD_COUNT_VIDEO] = 0
    update_data[data_model.FIELD_COUNT_VIEW] = 0
    update_data[data_model.FIELD_COUNT_COMMENT] = 0
    update_data[data_model.FIELD_COUNT_RECOMMEND] = 0
    update_data[data_model.FIELD_LIST_MOST_VIEW] = []
    update_data[data_model.FIELD_LIST_MOST_COMMENT] = []
    update_data[data_model.FIELD_LIST_MOST_RECOMMEND] = []
    update_data[data_model.FIELD_DATE_RECENT_OPEN_VIDEO] = null

    const page_params = {}
    const order_params = {}
    page_params.page = 1
    page_params.list_count = 10
    page_params.page_count = 10
    page_params.no_paging = 'n'

    order_params.field = 'reg_date'
    order_params.type = 'desc'
    let list_result = await this.getDataVideoList(video_model, group_seq, page_params, order_params)
    update_data[data_model.FIELD_LIST_RECENT] = list_result.video_list
    update_data[data_model.FIELD_DATE_RECENT_OPEN_VIDEO] = list_result.first_date
    update_data[data_model.FIELD_COUNT_VIDEO] = list_result.video_count

    await data_model.updateData(group_seq, update_data)
    await this.onChannelOpenChange(group_seq, Util.parseInt(group_info.group_open, 0) === 1)
  }

  getDataVideoList = async (video_model, group_seq, page_params, order_params) => {
    let video_count = 0
    let first_date = null
    const video_list = []
    const query_result = await video_model.getOpenChannelVideoList(group_seq, true, null, page_params, {}, order_params)
    if (query_result) {
      video_count = Util.parseInt(query_result.calc_total_count, 0)
      if (query_result.data && query_result.data.length) {
        for (let i = 0; i < query_result.data.length; i++) {
          if (i === 0) {
            first_date = query_result.data[i].reg_date
          }
          video_list.push(query_result.data[i].getDataJSON())
        }
      }
    }
    return { video_count, first_date, video_list }
  }

  onChannelOpenChange = async (group_seq, is_open) => {
    const data_model = this.getDataModel()
    return data_model.setChannelOpenDate(group_seq, is_open)
  }

  getOpenChannelList = async (request) => {
    const { page_params, order_params, filter_params} = this.getListParams(request)
    const data_model = this.getDataModel()
    const channel_list = await data_model.getOpenChannelList(page_params, filter_params, order_params)

    const output = new StdObject()
    output.adds(channel_list)
    return output
  }

  getOpenVideoList = async (request) => {
    const { page_params, order_params, filter_params} = this.getListParams(request)
    const video_model = this.getVideoModel()
    const video_list = await video_model.getOpenChannelVideoList(null, true, null, page_params, filter_params, order_params, true)

    const output = new StdObject()
    output.adds(video_list)
    return output
  }
}
const OpenChannelManagerService = new OpenChannelManagerServiceClass()

export default OpenChannelManagerService
