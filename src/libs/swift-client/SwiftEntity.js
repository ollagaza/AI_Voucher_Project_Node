import RequestPromise from 'request-promise'
import QueryString from 'query-string'
import log from '../../libs/logger'

class SwiftEntity {
  constructor (childName, urlSuffix, authenticator) {
    this.childName = childName
    this.urlSuffix = urlSuffix ? `/${urlSuffix}` : ''
    this.authenticator = authenticator
  }

  list (extra, query) {
    const querystring = query ? '?' + QueryString.stringify(query) : ''
    return this.authenticator.authenticate().then(auth => {
      const request_params = {
        uri: auth.url + this.urlSuffix + querystring,
        headers: this.headers(null, extra, auth.token),
        json: true
      }
      log.debug('SwiftEntity.list', extra, query, querystring, request_params)
      return RequestPromise(request_params)
    })
  }

  update (name, meta, extra) {
    return this.authenticator.authenticate().then(auth => RequestPromise({
      method: 'POST',
      uri: `${auth.url + this.urlSuffix}/${name}`,
      headers: this.headers(meta, extra, auth.token)
    }))
  }

  meta (name) {
    return this.authenticator.authenticate().then(auth => RequestPromise({
      method: 'HEAD',
      uri: `${auth.url + this.urlSuffix}/${name}`,
      headers: this.headers(null, null, auth.token),
      resolveWithFullResponse: true
    }).then(response => {
      return response.headers
    }))
  }

  delete (name, is_slo = false) {
    return this.authenticator.authenticate().then(auth => {
      const request_params = {
        method: 'DELETE',
        uri: `${auth.url + this.urlSuffix}/${name}`,
        headers: this.headers(null, null, auth.token)
      }
      if (is_slo === true) {
        request_params.uri = request_params.uri + '?multipart-manifest=delete'
      }
      return RequestPromise(request_params)
    })
  }

  headers (meta, extra, token) {
    const headers = Object.assign({
      'accept': 'application/json',
      'x-auth-token': token
    }, extra)

    if (meta != null) {
      for (const key in meta) {
        if (meta[key]) {
          headers[`X-${this.childName}-Meta-${key}`] = meta[key]
        }
      }
    }

    return headers
  }
}

export default SwiftEntity
