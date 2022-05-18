import JsonWrapper from '../json-wrapper'

export default class IndexInfo extends JsonWrapper {
  constructor (data = null, private_keys = []) {
    super(data, private_keys)
    this.setKeys(['unique_id', 'creator', 'original_url', 'thumbnail_url', 'start_time', 'end_time', 'start_frame', 'end_frame', 'tags'])
  }

  getXmlJson = () => {
    return {
      '$': {
        'ID': this.unique_id,
        'Creator': this.creator,
        'Frame': this.start_frame,
        'Time': this.start_time
      },
      'Original': this.original_url,
      'Thumbnail': this.thumbnail_url
    }
  }
}
