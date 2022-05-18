const NONE = -1
const ALL = 0
const REFRESH = 0.5
const BOX = 1
const AGENT = 2
const API = 3
const MEMBER = 5
const MANAGER = 6
const ADMIN = 99

export default {
  'NONE': NONE,
  'ALL': ALL,
  'API': API,
  'BOX': BOX,
  'AGENT': AGENT,
  'REFRESH': REFRESH,
  'MEMBER': MEMBER,
  'MANAGER': MANAGER,
  'ADMIN': ADMIN,
  'ADMINS': [MANAGER, ADMIN],
  'LOGIN_USER': [MEMBER, MANAGER, ADMIN],
  'DEFAULT': [MEMBER, MANAGER, ADMIN],
}
