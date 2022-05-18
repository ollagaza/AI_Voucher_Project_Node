import Request from 'request'
import RequestPromise from 'request-promise'
import Promise from 'promise'
import SwiftEntity from './SwiftEntity'
import log from '../../libs/logger'

class SwiftContainer extends SwiftEntity {
  constructor (containerName, authenticator) {
    super('Object', containerName, authenticator)
  }

  create (name, stream, meta, extra) {
    return this.authenticator.authenticate().then(auth => new Promise((resolve, reject) => {
      const request_params = {
        method: 'PUT',
        uri: `${auth.url + this.urlSuffix}/${name}`,
        headers: this.headers(meta, extra, auth.token)
      }
      log.debug('SwiftContainer.create', name, meta, extra, request_params)
      const req = Request(request_params)
        .on('error', err => {
          reject(err)
        })
        .on('response', response => {
          if (response.statusCode === 201) {
            log.debug('SwiftContainer.create', response.headers, response.statusMessage)
            resolve(response.headers)
          } else {
            log.error('SwiftContainer.create', response)
            reject(new Error(`HTTP ${response.statusCode}`))
          }
        })
      if (stream) {
        stream.pipe(req)
      }
    }))
  }

  createSLO (name, body, meta, extra) {
    return this.authenticator.authenticate().then(auth => new Promise((resolve, reject) => {
      const request_params = {
        method: 'PUT',
        uri: `${auth.url + this.urlSuffix}/${name}?multipart-manifest=put`,
        headers: this.headers(meta, extra, auth.token),
        body: body
      }
      log.debug('SwiftContainer.createSLO', name, meta, extra, request_params)
      Request(request_params)
        .on('error', err => {
          reject(err)
        })
        .on('response', response => {
          if (response.statusCode === 201) {
            log.debug('SwiftContainer.createSLO', response.headers, response.statusMessage)
            resolve(response.headers)
          } else {
            log.error('SwiftContainer.createSLO', response.headers, response.body)
            reject(new Error(`HTTP ${response.statusCode}`))
          }
        })
    }))
  }

  delete (name, is_slo = false, when = null) {
    if (when) {
      const h = {}

      if (when instanceof Date) {
        h['X-Delete-At'] = +when / 1000
      } else if (typeof when === 'number' || when instanceof Number) {
        h['X-Delete-After'] = when
      } else {
        throw new Error('expected when to be a number of seconds or a date')
      }

      return this.authenticator.authenticate().then(auth => {
        return RequestPromise({
          method: 'POST',
          uri: `${auth.url + this.urlSuffix}/${name}`,
          headers: this.headers(null, h, auth.token)
        })
      })
    } else {
      return SwiftEntity.prototype.delete.call(this, name, is_slo)
    }
  }

  get (name, stream) {
    return this.authenticator.authenticate().then(auth => new Promise((resolve, reject) => {
      const request_params = {
        method: 'GET',
        uri: `${auth.url + this.urlSuffix}/${name}`,
        headers: {
          'x-auth-token': auth.token
        }
      }
      log.debug('SwiftContainer.get', request_params)
      Request(request_params)
        .on('error', err => {
          reject(err)
        })
        .on('response', response => {
          log.debug('SwiftContainer.get', response.headers, response.statusMessage)
        })
        .on('end', () => {
          resolve()
        }).pipe(stream)
    }))
  }
}

export default SwiftContainer
