import { Router } from 'express'
import Wrap from '../../utils/express-async'
import StdObject from '../../wrapper/std-object'
import logger from '../../libs/logger'
import DBMySQL from "../../database/knex-mysql";

const routes = Router()

routes.get('/', Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject(0, 'data', 200)
  res.json(output)
}))

routes.get('/page/:data', Wrap(async (req, res) => {
  req.accepts('application/json')
  const param_data = req.params.data;
  const result = `return : 12${param_data}`;
  const output = new StdObject(0, result, 200)
  res.json(output)
}))

export default routes
