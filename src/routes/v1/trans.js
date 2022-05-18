import { Router } from 'express'
import querystring from 'querystring'
import Wrap from '../../utils/express-async'
import StdObject from '../../wrapper/std-object'
import log from '../../libs/logger'
import TranscoderSyncService from '../../service/sync/TranscoderSyncService'
import Util from '../../utils/Util'

const routes = Router()

const on_complete = Wrap(async (req, res) => {
  const query_str = querystring.stringify(req.query)
  const log_id = Util.getRandomId()
  log.d(req, 'api 호출', log_id, query_str, req.headers)

  const content_id = req.query.content_id
  const video_file_name = req.query.video_file_name
  const smil_file_name = req.query.smil_file_name
  const error = req.query.error

  if (error) {
    await TranscoderSyncService.onTranscodingError(content_id, log_id, error, req)
  } else {
    await TranscoderSyncService.onTranscodingComplete(content_id, log_id, video_file_name, smil_file_name, req)
  }

  res.json(new StdObject())
})

const on_error = Wrap(async (req, res) => {
  const query_str = querystring.stringify(req.query)
  const log_id = Util.getRandomId()
  log.d(req, '트랜스코딩 에러', log_id, query_str)

  const content_id = req.query.content_id
  const message = req.query.message
  await TranscoderSyncService.onTranscodingError(content_id, log_id, message)

  res.json(new StdObject())
})

routes.get('/complete', on_complete)
routes.post('/complete', on_complete)
routes.get('/error', on_error)
routes.post('/error', on_error)

export default routes
