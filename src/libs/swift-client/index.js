'use strict'

import URL from 'url-parse'
import RequestPromise from 'request-promise'
import SwiftContainer from './SwiftContainer'
import SwiftEntity from './SwiftEntity'
import SwiftAuthenticator from './SwiftAuthenticator'
import KeystoneV3Authenticator from './KeystoneV3Authenticator'

class SwiftClient extends SwiftEntity {
  constructor (authenticator) {
    super('Container', null, authenticator)
  }

  create (name, publicRead, meta, extra) {
    if (typeof publicRead === 'undefined') {
      publicRead = false
    }

    if (publicRead) {
      if (!extra)
        extra = {}

      extra['x-container-read'] = '.r:*'
    }

    return this.authenticator.authenticate().then(auth => RequestPromise({
      method: 'PUT',
      uri: `${auth.url}/${name}`,
      headers: this.headers(meta, extra, auth.token)
    }))
  }

  /**
   * Gets cluster configuration parameters
   * @returns {Promise.<Object>}
   */
  async info () {
    const auth = await this.authenticator.authenticate()
    const infoUrl = (new URL(auth.url)).origin + '/info'
    return RequestPromise({
      method: 'GET',
      uri: infoUrl,
      json: true
    })
  }

  container (name) {
    return new SwiftContainer(name, this.authenticator)
  }
}

SwiftClient.SwiftAuthenticator = SwiftAuthenticator
SwiftClient.KeystoneV3Authenticator = KeystoneV3Authenticator

module.exports = SwiftClient
