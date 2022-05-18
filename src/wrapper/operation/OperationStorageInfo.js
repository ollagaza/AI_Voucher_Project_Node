import JsonWrapper from '../json-wrapper'

const default_key_list = [
  'seq', 'operation_seq', 'total_file_size', 'total_file_count', 'clip_count', 'report_count',
  'index1_file_count', 'index2_file_count', 'index3_file_count'
]

export default class OperationStorageInfo extends JsonWrapper {
  constructor (data = null, private_keys = []) {
    super(data, private_keys)

    this.setKeys(default_key_list)
  }
}
