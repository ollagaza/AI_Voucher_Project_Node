import mongoose from 'mongoose'
import { autoIncrement } from 'mongoose-plugin-autoinc'

const Schema = mongoose.Schema

const getFieldInfos = () => {
  return {
    group_seq: { type: Number, index: true, require: false, message: '그룹 아이디가 없습니다.' },
    member_seq: { type: Number, index: true, require: false, message: '사용자 아이디가 없습니다.' },
    content_id: { type: String, index: true, unique: true, require: false, message: '콘텐츠 아이디가 없습니다.' },
    user_name: { type: String, index: false, require: false, message: '사용자 이름이 없습니다.' },
    user_nickname: { type: String, index: false, require: false, message: '사용자 닉네임이 없습니다.' },
    operation_seq_list: { type: [Number], default: [], require: false, message: '사용한 수술 목록이 없습니다.' },
    project_name: { type: String, require: false, message: '프로젝트 제목이 없습니다.' },
    project_path: { type: String, require: false, message: '프로젝트 저장 경로가 없습니다.' },
    video_file_name: { type: String, require: false, message: '비디오 파일 이름이 없습니다.' },
    smil_file_name: { type: String, require: false, message: 'HLS 스트리밍 설정 파일 이름이 없습니다.' },
    total_time: { type: Number, default: 0, require: false, message: '총 재생 시간이 없습니다.' },
    total_size: { type: Number, default: 0, require: false, message: '총 파일 크기가 없습니다.' },
    video_file_size: { type: Number, default: 0, require: false, message: '비디오 파일 크기가 없습니다.' },
    group_list: { type: [Number], default: [], require: false, message: '그룹 코드 목록이 없습니다.' },
    status: { type: String, default: 'Y', require: false, message: '프로젝트 상태값이 없습니다.' },
    request_status: { type: String, default: 'N', require: false, message: '동영상 제작 요청 상태값이 없습니다.' },
    progress: { type: Number, default: 0, require: false, message: '동영상 제작 진행률이 없습니다.' },
    sequence_count: { type: Number, default: 0, require: false, message: '시퀀스 개수가 없습니다.' },
    sequence_list: { type: Array, default: [], require: false, message: '시퀀스 목록이 없습니다.' },
    is_favorite: { type: Boolean, default: false, require: false, message: '즐겨찾기 여부가 없습니다.' },
    download_url: { type: String, default: null, require: false, message: '다운로드 URL이 없습니다.' },
    stream_url: { type: String, default: null, require: false, message: '스트리밍 URL이 없습니다.' },
    created_date: { type: Date, default: Date.now, require: false, message: '생성 일자가 없습니다.' },
    modify_date: { type: Date, default: Date.now, require: false, message: '수정 일자가 없습니다.' },
    delete_date: { type: Date, default: Date.now, require: false, message: '삭제 일자가 없습니다.' },
    operation_history_list: { type: [Number], default: [], require: false, message: '사용한 수술 히스토리 목록이 없습니다.' },
    subtitle_list: { type: Array, default: [], require: false, message: '자막 목록이 없습니다.' },
  }
}

const schema_field_infos = getFieldInfos()
schema_field_infos.group_seq.require = true
schema_field_infos.member_seq.require = true
schema_field_infos.content_id.require = true
schema_field_infos.project_name.require = true
schema_field_infos.status.require = true
schema_field_infos.request_status.require = true

const video_project_schema = new Schema(schema_field_infos)

video_project_schema.plugin(autoIncrement, { model: 'VideoProject', startAt: 1, incrementBy: 1 })
video_project_schema.indexes()
video_project_schema.index({ group_seq: 1, operation_seq_list: 1 })
video_project_schema.index({ member_seq: 1, operation_seq_list: 1 })
video_project_schema.index({ group_seq: 1, status: 1 })
video_project_schema.index({ member_seq: 1, status: 1 })
video_project_schema.index({ member_seq: 1, group_list: 1 })

video_project_schema.statics.createVideoProject = function (payload) {
  const model = new this(payload)
  return model.save()
}

video_project_schema.statics.updateFromEditor = function (id, payload) {
  return this.updateOne({ _id: id }, payload)
}

video_project_schema.statics.updateRequestStatus = function (id, request_status, progress = 0) {
  const update = {
    request_status,
    progress,
    modify_date: Date.now()
  }
  return this.findByIdAndUpdate(id, update)
}

video_project_schema.statics.updateRequestStatusByContentId = function (content_id, request_status, progress = 0, media_info = null) {
  const update = {
    request_status,
    progress,
    modify_date: Date.now()
  }
  if (media_info) {
    if (media_info.video_file_name) {
      update.video_file_name = media_info.video_file_name
    }
    if (media_info.smil_file_name) {
      update.smil_file_name = media_info.smil_file_name
    }
    if (media_info.download_url) {
      update.download_url = media_info.download_url
    }
    if (media_info.stream_url) {
      update.stream_url = media_info.stream_url
    }
    if (media_info.total_size) {
      update.total_size = media_info.total_size
    }
    if (media_info.video_file_size) {
      update.video_file_size = media_info.video_file_size
    }
  }
  return this.updateOne({ content_id: content_id }, update)
}

video_project_schema.statics.updateProgress = function (id, progress) {
  const update = {
    progress,
    modify_date: Date.now()
  }
  return this.updateOne({ _id: id }, update)
}

video_project_schema.statics.updateStatus = function (group_seq, id_list, status) {
  const update = {
    status,
    modify_date: Date.now()
  }
  if (status === 'T') {
    update.delete_date = Date.now()
  }
  return this.updateMany({ group_seq: group_seq, _id: { $in: id_list } }, update, { 'multi': true })
}

video_project_schema.statics.updateStatusTrash = function (group_seq, id_list, status) {
  const update = {
    status
  }
  if (status === 'T') {
    update.delete_date = Date.now()
  }
  return this.updateMany({ group_seq: group_seq, _id: { $in: id_list } }, update, { 'multi': true })
}

video_project_schema.statics.updateFavorite = function (id, is_favorite) {
  const update = {
    is_favorite,
    modify_date: Date.now()
  }
  return this.updateOne({ _id: id }, update)
}

video_project_schema.statics.findOneById = function (id, projection = null) {
  return this.findById(id, projection)
}

video_project_schema.statics.findOneByContentId = function (content_id, projection = null) {
  return this.findOne({ content_id: content_id }, projection)
}

video_project_schema.statics.findByMemberSeq = function (member_seq, projection = null) {
  return this.find({ member_seq: member_seq }, projection)
}

video_project_schema.statics.findByGroupSeq = function (group_seq, projection = null) {
  return this.find({ group_seq: group_seq }, projection)
}

video_project_schema.statics.findByOperationSeq = function (group_seq, operation_seq_list, projection = null) {
  return this.find({ group_seq: group_seq, operation_seq_list: { '$in': operation_seq_list } }, projection)
}

video_project_schema.statics.deleteById = function (group_seq, id) {
  return this.findOneAndDelete({ group_seq: group_seq, _id: id })
}

video_project_schema.statics.updateUserInfo = function (member_seq, user_name, user_nickname) {
  const update = {
    user_name,
    user_nickname
  }
  return this.updateMany({ member_seq: member_seq }, update, { 'multi': true })
}
video_project_schema.statics.getProjectGroupSeqCount = function () {
  return this.aggregate().match({ 'status': 'Y' }).group({ _id: '$group_seq', 'count': { '$sum': 1 } })
}

video_project_schema.statics.getProjectTotalCount = function (search_keyword = null, search_option = null) {
  const filter = {}
  if (search_option && search_option.request_status) {
    filter.request_status = search_option.request_status
  }
  if (search_keyword) {
    filter.project_name = new RegExp(search_keyword)
  }
  return this.count(filter)
}

video_project_schema.statics.getAdmin_projectList = function (page_navigation, sort_field = { _id: -1 }, search_keyword = null, search_option = null) {
  const filter = {}
  if (search_option && search_option.request_status && search_option.request_status !== '0') {
    filter.request_status = search_option.request_status
  }
  if (search_keyword) {
    filter.project_name = new RegExp(search_keyword)
  }
  const find_result = filter ? this.find(filter) : this.find()
  return find_result
    .sort(sort_field)
    .skip(page_navigation.list_count * (page_navigation.cur_page - 1))
    .limit(page_navigation.list_count)
}

const video_project_model = mongoose.model('VideoProject', video_project_schema)
export const VideoProjectModel = video_project_model
export const VideoProjectField = getFieldInfos
