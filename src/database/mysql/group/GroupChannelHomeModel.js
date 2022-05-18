import MySQLModel from '../../mysql-model'
import Util from '../../../utils/Util'
import GroupInfo from '../../../wrapper/member/GroupInfo'
import log from '../../../libs/logger'

export default class GroupChannelHomeModel extends MySQLModel {
  constructor(database) {
    super(database)

    this.table_name = 'group_recommend_list'
    this.selectable_fields = ['*']
    this.log_prefix = '[GroupChannelHomeModel]'
  }

  getGroupOwnerTreatLists = async () => {
    const oQuery = this.database.select('member.treatcode')
      .from('group_info')
      .innerJoin('member', 'member.seq', 'group_info.member_seq')
      .where('group_info.group_type', 'G')
      .andWhere('group_info.status', 'Y')
      .andWhere('group_info.group_open', '1')

    return oQuery
  }

  getMyGroupNewNews = async (arr_group_seq) => {
    const oQuery = this.database.select(['op_data.group_seq as group_seq', 'op_data.seq as target_seq', 'op.seq as board_seq', 'op_data.title', this.database.raw('\'operation\' as gubun'), 'mem.user_name as name', 'op_data.reg_date as regist_date'])
      .from('operation as op')
      .innerJoin('operation_data as op_data', (query) => {
        query.on('op_data.operation_seq', 'op.seq')
        query.andOnVal('op_data.status', 'Y')
      })
      .innerJoin('member as mem', 'mem.seq', 'op.member_seq')
      .where('op.group_seq', arr_group_seq)
      .andWhere('op_data.reg_date', '>=', this.database.raw('date_sub(now(), interval 7 day)'))
      .unionAll([
        this.database.select(['board.group_seq as group_seq', 'board.seq as target_seq', 'board.board_seq as board_seq', 'board.subject as title', this.database.raw('\'board\' as gubun'), 'board.write_name as name', 'board.regist_date as regist_date'])
          .from('board_data as board')
          .where('board.group_seq', arr_group_seq)
          .andWhere('status', 'Y')
          .andWhere('board.regist_date', '>=', this.database.raw('date_sub(now(), interval 7 day)'))
      ])
      .orderBy([{column: 'regist_date', order: 'desc'}])
      .limit(3)

    return oQuery
  }

  getOpenOperationTop5 = async () => {
    const oQuery = this.database.select(['op_data.*', 'group_info.profile_image_path', 'group_info.group_name'])
      .from('operation_data as op_data')
      .innerJoin('group_info', (query) => {
        query.on('group_info.seq', 'op_data.group_seq')
        query.andOnVal('group_info.group_type', 'G')
      })
      .where('op_data.is_open_video', 1)
      .andWhere('op_data.status', 'Y')
      .orderBy('op_data.view_count', 'desc')
      .limit(5)

    return oQuery
  }

  getOpenBoardTop5 = async () => {
    const oQuery = this.database.select(['board.*', 'group_info.profile_image_path', 'group_info.group_name'])
      .from('board_data as board')
      .innerJoin('group_info', (query) => {
        query.on('group_info.seq', 'board.group_seq')
        query.andOnVal('group_info.group_type', 'G')
      })
      .where('board.is_open', 1)
      .andWhere('board.status', 'Y')
      .andWhere('board.depth', 0)
      .orderBy('board.view_cnt', 'desc')
      .limit(5)

    return oQuery
  }

  getRecommendGroupList = async (order, limit) => {
    const oQuery = this.database.select(`${this.table_name}.*`)
      .from(this.table_name)
      .innerJoin('group_info', (query) => {
        query.on('group_info.seq', `${this.table_name}.group_seq`)
        query.andOnVal('group_info.group_open', 1)
      })
      .where(this.database.raw('date_format(regist_date, \'%y%m%d\') = date_format(now(), \'%y%m%d\')'))
      .orderBy(order)

    if (limit) {
      oQuery.limit(limit)
    }
    return oQuery
  }

  getRecommendGroupListOtherDay = async (order, limit) => {
    const oQuery = this.database.select(`${this.table_name}.*`)
      .from(this.table_name)
      .innerJoin('group_info', (query) => {
        query.on('group_info.seq', `${this.table_name}.group_seq`)
        query.andOnVal('group_info.group_open', 1)
      })
      .where(this.database.raw('date_format(regist_date, \'%y%m%d\') = date_format(date_sub(now(), interval 1 day), \'%y%m%d\')'))
      .orderBy(order)

    if (limit) {
      oQuery.limit(limit)
    }
    return oQuery
  }

  getSearchGroupInfo = async (search_keyword, search_tab, paging) => {
    const oQuery = this.database.select('*')
      .from('group_info')
      .whereRaw('(MATCH (`group_name`, `group_explain`) AGAINST (? IN BOOLEAN MODE)', search_keyword)
      .orWhereRaw(`JSON_SEARCH(JSON_EXTRACT(search_keyword, '$[0]'), 'all', '%${search_keyword}%') is not null)`)
      .andWhere('group_info.group_open', 1)

    return await this.queryPaginated(oQuery, paging.list_count, paging.cur_page, paging.page_count, paging.no_paging)
  }

  getSearchOperationData = async (search_keyword, paging) => {
    const select_fields = ['operation_data.seq', 'operation_data.operation_seq', 'operation_data.group_seq'
      , 'operation_data.thumbnail', 'operation_data.title', 'operation_data.view_count', 'operation_data.reg_date'
      , 'group_info.group_name', 'group_info.profile_image_path', 'operation_data.total_time']
    const oQuery = this.database.select(select_fields)
      .from('operation_data')
      .innerJoin('group_info', query => {
        query.on('group_info.seq', 'operation_data.group_seq')
        query.andOnVal('group_info.group_open', 1)
      })
      .whereRaw('operation_data.is_open_video = 1 and MATCH (`operation_data`.`title`, `operation_data`.`group_name`, `operation_data`.`doc_text`, `operation_data`.`hospital`) AGAINST (? IN BOOLEAN MODE)', search_keyword)
      .andWhere('operation_data.status', 'Y')
    return await this.queryPaginated(oQuery, paging.list_count, paging.cur_page, paging.page_count, paging.no_paging)
  }

  getSearchBoardData = async (search_keyword, paging) => {
    const select_fields = ['board_data.seq', 'board_data.group_seq', 'board_data.write_name', 'board_data.subject', 'board_data.content_text', 'board_data.content'
      , 'board_data.comment_cnt', 'board_data.view_cnt', 'board_data.recommend_cnt', 'board_data.regist_date']
    const oQuery = this.database.select(select_fields)
      .from('board_data')
      .innerJoin('group_info', query => {
        query.on('group_info.seq', 'board_data.group_seq')
        query.andOnVal('group_info.group_open', 1)
      })
      .whereRaw('board_data.is_open = ? and MATCH (`write_name`, `subject`, `content_text`) AGAINST (? IN BOOLEAN MODE)', ['1', search_keyword])
      .andWhere('board_data.status', 'Y')
    return await this.queryPaginated(oQuery, paging.list_count, paging.cur_page, paging.page_count, paging.no_paging)
  }

  getRecommendGroupInfo = async (group_seq) => {
    const oQuery = this.database.select('*')
      .from('group_info')
      .where('seq', group_seq)

    return oQuery.first()
  }

  getRecommendOperationList = async (group_seq, limit) => {
    const oQuery = this.database.select('*')
      .from('operation_data')
      .where('group_seq', group_seq)
      .andWhere('is_open_video', 1)
      .andWhere('status', 'Y')
      // .andWhere(this.database.raw('date_format(reg_date, \'%y%m%d\') >= date_format(date_sub(now(), interval 7 day), \'%y%m%d\')'))

    if (limit) {
      oQuery.limit(limit)
    }
    return oQuery
  }

  getRecommendBoardList = async (group_seq, limit) => {
    const oQuery = this.database.select('*')
      .from('board_data')
      .where('group_seq', group_seq)
      .andWhere('is_open', 1)
      .andWhere('status', 'Y')
      // .andWhere(this.database.raw('date_format(regist_date, \'%y%m%d\') >= date_format(date_sub(now(), interval 7 day), \'%y%m%d\')'))

    if (limit) {
      oQuery.limit(limit)
    }
    return oQuery
  }

  getCategoryGroupInfo = async (menu_id, limit) => {
    const oQuery = this.database.select(['group_info.*', 'group_info.seq as group_seq'])
      .from('group_info')
      .innerJoin('member', (query) => {
        query.on('member.seq', 'group_info.member_seq')
        query.andOn(this.database.raw(`JSON_SEARCH(JSON_EXTRACT(member.treatcode, '$[*].code'), 'all', '${menu_id}') IS NOT NULL`))
      })
      .where('group_info.group_type', 'G')
      .andWhere('group_info.group_open', 1)
      .orderBy('group_info.member_count', 'desc')

    if (limit) {
      oQuery.limit(limit)
    }
    return oQuery
  }

  CreateGroupRecommendListCount = async (group_counting) => {
    await this.create(group_counting)
  }

  updateGroupMemberCnts = async (group_member_counting) => {
    const result_map = []
    await this.database.update({vid_cnt: 0, file_cnt: 0, anno_cnt: 0, comment_cnt: 0, board_cnt: 0, board_comment_cnt: 0}).from('group_member')
    for (let cnt = 0; cnt < group_member_counting.length; cnt++) {
      const filter = { group_seq: group_member_counting[cnt].group_seq, member_seq: group_member_counting[cnt].member_seq }
      const params = group_member_counting[cnt];
      delete params.group_seq
      delete params.member_seq
      const result = await this.database.update(params).from('group_member').where(filter)
      if (result === 1) {
        result_map.push(group_member_counting[cnt])
      }
    }
    return result_map;
  }

  checkGroupRecommendCount = async () => {
    return this.findOne(this.database.raw('date_format(regist_date, \'%y%m%d\') = date_format(now(), \'%y%m%d\')'))
  }

  getOperationVideoCount = async (is_all = true) => {
    const oQuery = this.database.select(['group_info.seq as group_seq', this.database.raw('count(op.seq) as count'), this.database.raw('sum(storage.total_file_size) as size')])
      .from('group_info')
      .innerJoin('operation as op', (query) => {
        query.on('op.group_seq', 'group_info.seq')
        query.andOnVal('op.mode', 'operation')
        query.andOnVal('op.status', 'Y')
      })
      .innerJoin('operation_storage as storage', (query) => {
        query.on('op.seq', 'storage.operation_seq')
      })
      .where('group_info.group_type', 'G')
    if (is_all) {
      oQuery.andWhere(this.database.raw('date_format(date_sub(op.reg_date, interval 7 day), \'%y%m%d\') <= date_format(now(), \'%y%m%d\')'))
    }
    oQuery.groupBy('group_info.seq')
    return oQuery
  }
  getOperationFileCount = async (is_all = true) => {
    const oQuery = this.database.select(['group_info.seq as group_seq', this.database.raw('count(op.seq) as count'), this.database.raw('sum(storage.total_file_size) as size')])
      .from('group_info')
      .innerJoin('operation as op', (query) => {
        query.on('op.group_seq', 'group_info.seq')
        query.andOnVal('op.mode', 'file')
        query.andOnVal('op.status', 'Y')
      })
      .innerJoin('operation_storage as storage', (query) => {
        query.on('op.seq', 'storage.operation_seq')
      })
      .where('group_info.group_type', 'G')
    if (is_all) {
      oQuery.andWhere(this.database.raw('date_format(date_sub(op.reg_date, interval 7 day), \'%y%m%d\') <= date_format(now(), \'%y%m%d\')'))
    }
    oQuery.groupBy('group_info.seq')
    return oQuery
  }
  getOperationGroupMemberCount = async (mode) => {
    const oQuery = this.database.select(['op.group_seq', 'op.member_seq', this.database.raw('count(op_data.seq) as count')])
      .from('group_info')
      .innerJoin('operation_data as op_data', (query) => {
        query.on('op_data.group_seq', 'group_info.seq')
        query.andOnVal('op_data.status', 'Y')
      })
      .innerJoin('operation as op', (query) => {
        query.on('op.seq', 'op_data.operation_seq')
        query.andOnVal('op.mode', mode)
      })
      .where('group_info.group_type', 'G')
      .groupBy('op.group_seq', 'op.member_seq')
    return oQuery
  }

  getOperationCommentCount = async (is_all = true) => {
    const oQuery = this.database.select(['group_info.seq as group_seq', this.database.raw('count(op_comment.seq) as count')])
      .from('group_info')
      .innerJoin('operation_comment as op_comment', 'op_comment.group_seq', 'group_info.seq')
      .innerJoin('operation_data', (query) => {
        query.on('operation_data.seq', 'op_comment.operation_data_seq')
        query.andOnVal('operation_data.status', 'Y')
      })
      .where('group_info.group_type', 'G')
    if (is_all) {
      oQuery.andWhere(this.database.raw('date_format(date_sub(op_comment.reg_date, interval 7 day), \'%y%m%d\') <= date_format(now(), \'%y%m%d\')'))
    }
    oQuery.groupBy('group_info.seq')
    return oQuery
  }
  getOperationGroupMemberCommentCount = async () => {
    const oQuery = this.database.select(['op_comment.group_seq', 'op_comment.member_seq', this.database.raw('count(op_comment.seq) as count')])
      .from('group_info')
      .innerJoin('operation_comment as op_comment', 'op_comment.group_seq', 'group_info.seq')
      .innerJoin('operation_data', (query) => {
        query.on('operation_data.seq', 'op_comment.operation_data_seq')
        query.andOnVal('operation_data.status', 'Y')
      })
      .where('group_info.group_type', 'G')
      .groupBy('op_comment.group_seq', 'op_comment.member_seq')
    return oQuery
  }

  getBoardCount = async (is_all = true) => {
    const oQuery = this.database.select(['group_info.seq as group_seq', this.database.raw('count(board.seq) as count')])
      .from('group_info')
      .innerJoin('board_data as board', (query) => {
        query.on('board.group_seq', 'group_info.seq')
        query.andOnVal('board.status', 'Y')
      })
      .where('group_info.group_type', 'G')
    if (is_all) {
      oQuery.andWhere(this.database.raw('date_format(date_sub(board.regist_date, interval 7 day), \'%y%m%d\') <= date_format(now(), \'%y%m%d\')'))
    }
    oQuery.groupBy('group_info.seq')
    return oQuery
  }
  getBoardGroupMemberCount = async () => {
    const oQuery = this.database.select(['board.group_seq', 'board.member_seq', this.database.raw('count(board.seq) as count')])
      .from('group_info')
      .innerJoin('board_data as board', (query) => {
        query.on('board.group_seq', 'group_info.seq')
        query.andOnVal('board.status', 'Y')
      })
      .where('group_info.group_type', 'G')
      .where('board.status', 'Y')
      .groupBy('board.group_seq', 'board.member_seq')
    return oQuery
  }

  getBoardCommentCount = async (is_all = true) => {
    const oQuery = this.database.select(['group_info.seq as group_seq', this.database.raw('count(b_comment.seq) as count')])
      .from('group_info')
      .innerJoin('board_data as board', (query) => {
        query.on('board.group_seq', 'group_info.seq')
        query.andOnVal('board.status', 'Y')
      })
      .innerJoin('board_comment as b_comment', (query) => {
        query.on('b_comment.board_data_seq', 'board.seq')
        query.andOnVal('b_comment.status', 'Y')
      })
      .where('group_info.group_type', 'G')
    if (is_all) {
      oQuery.andWhere(this.database.raw('date_format(date_sub(b_comment.regist_date, interval 7 day), \'%y%m%d\') <= date_format(now(), \'%y%m%d\')'))
    }
    oQuery.groupBy('group_info.seq')
    return oQuery
  }
  getBoardCommentGroupMemberCount = async () => {
    const oQuery = this.database.select(['b_comment.group_seq', 'b_comment.member_seq', this.database.raw('count(b_comment.seq) as count')])
      .from('group_info')
      .innerJoin('board_data as board', (query) => {
        query.on('board.group_seq', 'group_info.seq')
        query.andOnVal('board.status', 'Y')
      })
      .innerJoin('board_comment as b_comment', (query) => {
        query.on('b_comment.board_data_seq', 'board.seq')
        query.andOnVal('b_comment.status', 'Y')
      })
      .where('group_info.group_type', 'G')
      .groupBy('b_comment.group_seq', 'b_comment.member_seq')
    return oQuery
  }
}
