import _ from 'lodash'
import log from '../../../libs/logger'
import MySQLModel from '../../mysql-model'
import Util from "../../../utils/Util";

export default class GroupBoardDataModel extends MySQLModel {
  constructor (...args) {
    super(...args)

    this.table_name = 'board_data'
    this.log_prefix = '[GroupBoardDataModel]'
    this.selectable_fields = ['*']
  }

  getGroupBoardDataCount = async (group_seq, menu_seq) => {
    return this.getTotalCount({ group_seq, board_seq: menu_seq, status: 'Y' })
  }

  getTemporarilyCnt = async (group_seq, member_seq) => {
    return this.getTotalCount({ group_seq, member_seq, status: 'T' })
  }

  getTemporarilyList = async (group_seq, member_seq) => {
    return this.find({ group_seq, member_seq, status: 'T' })
  }

  getLastBoardDataNum = async (board_seq) => {
    return this.findOne({ board_seq }, ['board_data_num'], { name: 'board_data_num', direction: 'desc' })
  }

  getLinkCodeCheck = async (link_code) => {
    return this.findOne({ link_code }, ['link_code'])
  }

  getLastBoardSortNum = async (origin_seq) => {
    return this.findOne({ origin_seq }, ['sort_num'], { name: 'sort_num', direction: 'desc' })
  }

  getBoardNoticeCount = async (group_seq, board_seq) => {
    const oKnex = this.database.select('*')
      .from(this.table_name)
      .where('group_seq', group_seq)
      .andWhere('is_notice', '1')
      .andWhere('status', 'Y')
      .unionAll([
        this.database.select('*')
          .from(this.table_name)
          .where('group_seq', group_seq)
          .andWhere('is_notice', '2')
          .andWhere('board_seq', board_seq)
          .andWhere('status', 'Y')
      ])

    const list = await oKnex;
    return list.length
  }

  getBoardDataMainList = async (group_seq, group_grade_number) => {
    const oKnex = this.database.raw(
      '(select `board_data`.* from `board_data` ' +
      'where `board_data`.`group_seq` = ? and `is_notice` = 1 and `status` = \'Y\' ' +
      'order by `regist_date` desc limit 6)' +
      'union all' +
      '(select `board_data`.* from `board_data` ' +
      'inner join `group_board_list` on `group_board_list`.`group_seq` = ? and `group_board_list`.`seq` = `board_data`.`board_seq` ' +
      'and if(`group_board_list`.`read_grade` = \'O\' or `group_board_list`.`read_grade` = \'A\', \'99\', `group_board_list`.`read_grade`) <= ? ' +
      'where `board_data`.`group_seq` = ? and `board_data`.`status` = \'Y\' and `is_notice` != 1 ' +
      'order by `regist_date` desc limit 6)' +
      'limit 6', [group_seq, group_seq, group_grade_number, group_seq]
    )

    const data = await oKnex;
    return { data: data[0] } ;
  }

  getBoardDataPagingList = async (group_seq, board_seq, use_nickname, paging, order, group_grade_number = null, search_option = null, search_keyword = '') => {
    let oKnex = null;
    if (Util.parseInt(paging.cur_page) === 1 && !search_keyword) {
      oKnex = this.database.select('*')
        .from(this.table_name)
        .where('board_data.group_seq', group_seq)
        .andWhere('board_data.is_notice', '1')
        .andWhere('board_data.status', 'Y')
        .unionAll([
          this.database.select('*')
            .from(this.table_name)
            .where('board_data.group_seq', group_seq)
            .andWhere('board_data.is_notice', '2')
            .andWhere('board_data.board_seq', board_seq)
            .andWhere('board_data.status', 'Y')
          ,
          this.database.select('*')
            .from(this.table_name)
            .where('board_data.group_seq', group_seq)
            .andWhere('board_data.is_notice', '3')
            .andWhere('board_data.board_seq', board_seq)
            .andWhere('board_data.status', 'Y')
        ])
      oKnex.orderBy([{column: 'is_notice', order: 'asc'}, {column: 'origin_seq', order: 'desc'}, {column: 'sort_num', order: 'asc'}, {column: 'parent_seq', order: 'asc'}, {column: 'depth', order: 'asc'}])
    } else {
      oKnex = this.database.select(`${this.table_name}.*`)
        .from(this.table_name)
        .where('board_data.group_seq', group_seq)
        .andWhere('board_data.board_seq', board_seq)
        .andWhere('board_data.status', 'Y')

      if (search_keyword) {
        switch (search_option) {
          case 'title_desc':
            oKnex.andWhere((query) => {
              query.orWhere('subject', 'like', `%${search_keyword}%`)
              query.orWhere('content_text', 'like', `%${search_keyword}%`)
            })
            break;
          case 'title':
            oKnex.andWhere('subject', 'like', `%${search_keyword}%`)
            break;
          case 'write':
            if (use_nickname) {
              oKnex.andWhere('board_data.user_nickname', 'like', `%${search_keyword}%`)
            } else {
              oKnex.andWhere('board_data.user_name', 'like', `%${search_keyword}%`)
            }
            break;
          case 'comment_desc':
            oKnex.andWhere('seq', (query) => {
              query.select('board_data_seq')
              query.from('board_comment')
              query.where('status', 'Y')
              query.andWhere('board_comment.content_text', 'like', `%${search_keyword}%`)
            })
            break;
          case 'comment_write':
            oKnex.whereIn('seq', (query) => {
              query.select('board_data_seq')
              query.from('board_comment')
              query.where('status', 'Y')
              query.andWhere((sub_query) => {
                if (use_nickname) {
                  sub_query.orWhere('board_comment.user_nickname', 'like', `%${search_keyword}%`)
                } else {
                  sub_query.orWhere('board_comment.user_name', 'like', `%${search_keyword}%`)
                }
              })
            })
            break;
          default:
            break;
        }
      } else {
        oKnex.andWhere('board_data.is_notice', '3')
      }
      oKnex.orderBy([{column: 'board_data.is_notice', order: 'asc'}, {column: 'board_data.origin_seq', order: 'desc'}, {column: 'board_data.sort_num', order: 'asc'}, {column: 'board_data.parent_seq', order: 'asc'}, {column: 'board_data.depth', order: 'asc'}])
    }
    return await this.queryPaginated(oKnex, paging.list_count, paging.cur_page, paging.page_count, paging.no_paging, paging.start_count)
  }

  getBoardDataDetail = async (board_data_seq) => {
    const oKnex = this.database.select(['board.*', 'mem.profile_image_path as member_profile_image'])
      .from(`${this.table_name} as board`)
      .innerJoin('member as mem', { 'mem.seq': 'board.member_seq' })
      .where('board.seq', board_data_seq)
      .first()
    return oKnex
  }

  getOpenBoardDataDetail = async (link_code) => {
    const oKnex = this.database.select(['board.*', 'mem.profile_image_path as member_profile_image'])
      .from(`${this.table_name} as board`)
      .innerJoin('member as mem', { 'mem.seq': 'board.member_seq' })
      .where('link_code', link_code)
      .first()
    return oKnex
  }

  CreateBoardData = async (board_data) => {
    return this.create(board_data, 'seq')
  }

  UpdateBoardData = async (seq, board_data) => {
    return this.update({ seq }, board_data)
  }

  updateParentDataSubject = async (board_seq) => {
    return this.update({ parent_seq: board_seq }, { subject: this.database.raw('concat(\'<span style="color: #ff0000;">[본글이 삭제된 답글]</span> \', subject)') })
  }

  updateBoardOriginSeq = async (board_seq) => {
    return this.update({ seq: board_seq }, { origin_seq: board_seq })
  }

  incrementBoardReCommendCnt = async (board_seq) => {
    return this.increment({ seq: board_seq }, { recommend_cnt: 1 })
  }
  decrementBoardReCommendCnt = async (board_seq) => {
    return this.decrement({ seq: board_seq }, { recommend_cnt: 1 })
  }

  updateBoardViewCnt = async (board_seq) => {
    return this.update({ seq: board_seq }, { view_cnt: this.database.raw('view_cnt + 1') })
  }

  incrementBoardCommentCnt = async (board_seq, count = 1) => {
    return this.increment({ seq: board_seq }, { comment_cnt: count })
  }
  decrementBoardCommentCnt = async (board_seq, count = 1) => {
    return this.decrement({ seq: board_seq }, { comment_cnt: count })
  }

  DeleteBoardData = async (board_seq) => {
    return this.update({ seq: board_seq }, { status: 'D' })
  }

  DeleteTempBoardData = async (board_seq) => {
    return this.delete({ seq: board_seq })
  }

  ChangeBoardToNotice = async (board_data_seq, notice_num) => {
    return this.update({ seq: board_data_seq }, { is_notice: notice_num })
  }

  MoveBoardData = async (board_data_seq, board_seq, board_header_text) => {
    await this.update({ origin_seq: board_data_seq }, { board_seq, header_text: board_header_text })
    return this.update({ seq: board_data_seq }, { board_seq, header_text: board_header_text })
  }

  getGroupBoardOpenTopList = async (group_seq) => {
    const oKnex = this.database.select(`${this.table_name}.*`, 'group_board_list.board_open')
    // const oKnex = this.database.select(`${this.table_name}.*`)
      .from(this.table_name)
      .leftJoin('group_board_list', 'group_board_list.seq', `${this.table_name}.board_seq`)
      .where(`${this.table_name}.group_seq`, group_seq)
      .andWhere('group_board_list.board_open', '1')
      .andWhere('status', 'Y')
      .andWhere(`${this.table_name}.is_open`, '1')
      .orderBy([{ column: `${this.table_name}.seq`, order: 'desc' }])
      .limit(5);
    return oKnex;
  }

  fileUpdateBoardData = async (board_data_seq, param) => {
    param.attach_file_cnt = this.database.raw('attach_file_cnt + 1')
    return this.update({ seq: board_data_seq }, param)
  }
  fileDeleteBoardData = async (board_data_seq, param) => {
    param.attach_file_cnt = this.database.raw('attach_file_cnt - 1')
    return this.update({ seq: board_data_seq }, param)
  }

  getBoardDataPagingListByGroupAndSeqMemberSeq = async (group_seq, member_seq, paging) => {
    let oKnex = this.database.select('board_data.*', 'group_board_list.read_grade')
      .from(this.table_name)
      .joinRaw('LEFT JOIN (SELECT seq, read_grade FROM group_board_list) AS group_board_list ON (board_data.board_seq = group_board_list.seq)')
      .where('group_seq', group_seq)
      .andWhere('member_seq', member_seq)
      .andWhere('status', 'Y')
      .orderBy('regist_date', 'desc')
    return await this.queryPaginated(oKnex, paging.list_count, paging.cur_page, paging.page_count, 'n', paging.start_count)
  }
}
