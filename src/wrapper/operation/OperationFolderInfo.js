import JsonWrapper from '../json-wrapper'

const default_key_list = [
  'seq', 'group_seq', 'member_seq', 'folder_name', 'folder_explain', 'parent_seq', 'parent_folder_list'
  , 'sort', 'status', 'depth', 'user_name', 'user_nickname'
  , 'access_type', 'is_access_way', 'access_list', 'access_users', 'reg_date', 'modify_date', 'children', 'is_favorite', 'total_folder_size'
  , 'is_delete_by_admin', 'delete_member_seq', 'delete_user_name', 'delete_user_nickname', 'video_count', 'file_count'
]

export default class OperationFolderInfo extends JsonWrapper {
  constructor (data = null, private_keys = []) {
    super(data, private_keys)

    this.setKeys(default_key_list)

    if (data) {
      if (data.parent_folder_list && typeof data.parent_folder_list === 'string') {
        this.parent_folder_list = JSON.parse(data.parent_folder_list)
      }
      if (data.access_users && typeof data.access_users === 'string') {
        this.access_users = JSON.parse(data.access_users)
      }
    }
  }
}
