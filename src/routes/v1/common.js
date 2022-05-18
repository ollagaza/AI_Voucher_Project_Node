import { Router } from 'express'
import ServiceConfig from '../../service/service-config'
import Wrap from '../../utils/express-async'
import Util from '../../utils/Util'
import Auth from '../../middlewares/auth.middleware'
import Role from '../../constants/roles'
import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql'
import log from '../../libs/logger'
import MemberModel from '../../database/mysql/member/MemberModel'
import GroupService from "../../service/group/GroupService";
import OperationFolderService from "../../service/operation/OperationFolderService";
import GroupBoardListService from "../../service/board/GroupBoardListService";

const routes = Router()

routes.post('/newcontentid', Wrap(async (req, res) => {
  const output = new StdObject()
  output.add('contentid', Util.getContentId())
  res.json(output)
}))
routes.get('/newcontentid', Wrap(async (req, res) => {
  const output = new StdObject()
  output.add('contentid', Util.getContentId())
  res.json(output)
}))

routes.get('/last_update', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const { group_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const folder_last_update = await OperationFolderService.getGroupFolderLastUpdate(DBMySQL, group_seq)
  const board_last_update = await GroupBoardListService.getGroupBoardLastUpdate(DBMySQL, group_seq)
  const output = new StdObject()
  output.add('folder_last_update', folder_last_update)
  output.add('board_last_update', board_last_update)
  res.json(output)
}))

export default routes
