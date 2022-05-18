import JsonWrapper from '../json-wrapper'

export default class OperationExpansionDataInfo extends JsonWrapper {
  constructor (data = null, private_keys = []) {
    super(data, private_keys)
    this.setKeys([
      'seq', 'list_no', 'operation_seq',
      'doc', 'view_permission', 'edit_permission', 'reg_date', 'modify_date',
      '0x00000001',
      '0x00000002',
      '0x00000004',
      '0x00000010',
      '0x00000200',
      '0x00004000',
      '0x02000000',
      '0x00000020',
      '0x00000040',
      '0x00000080',
      '0x00000100',
      '0x00000400',
      '0x00000800',
      '0x00800000',
      '0x08000000',
      'operation_name', 'operation_date', 'thumbnail_url', 'operation_reg_date',
      'user_nickname', 'user_id', 'hospital', 'major', 'position',
      'hour', 'minute', 'total_time', 'media_height'
    ])
  }
}
