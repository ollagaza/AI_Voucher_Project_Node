import express from 'express'
import routes from './routes'
import path from "path";
import bodyParser from 'body-parser'
import logger from './libs/logger'
import StdObject from './wrapper/std-object'

let cors = require('cors'); // cross domain 허용해주는 미들웨어


const app = express()

app.enable('trust proxy', 1)

// Express 라는 것을 숨김
app.disable('etag')
app.disable('x-powered-by')

// View engine setup
app.set('views', path.join(__dirname, '../views'))
app.set('view engine', 'pug')
app.use(cors());
app.use(logger.express)
app.use(bodyParser.json({
  limit: '50mb'
}))
app.use(bodyParser.urlencoded({
  limit: '50mb',
  extended: false
}))
app.use(express.static(path.join(__dirname, '../public')))
// Routes
app.use('/api', routes)

app.use((req, res, next) => {
  logger.e(req, '요청하신 API Endpoint가 존재하지 않습니다.')
  next(new StdObject(-1, '요청하신 API Endpoint가 존재하지 않습니다.', 404))
})

// Error handler
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  logger.e(req, 'App', err.toJSON ? err.toJSON() : err)
  res.status(err.getHttpStatusCode())
    .json(err)
})


export default app
