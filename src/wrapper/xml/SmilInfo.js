import _ from 'lodash'
import JsonWrapper from '../json-wrapper'
import Util from '../../utils/Util'
import ServiceConfig from '../../service/service-config'

class SmilVideoInfo extends JsonWrapper {
  constructor (video_node) {
    const data = {}
    if (video_node && video_node.$) {
      data.file_name = video_node.$.src
      data.resolution = parseInt(video_node.$.height, 10)
      data.width = parseInt(video_node.$.width, 10)
      data.height = parseInt(video_node.$.height, 10)
    }
    super(data, [])
  }
}

export default class SmilInfo extends JsonWrapper {
  constructor (data = null, private_keys = []) {
    if (!data) {
      data = {}
    }
    data.video_info_map = {}
    data.video_info_list = []
    super(data, private_keys)
    this.is_empty = true
  }

  loadFromXml = async (file_path, smil_file_name) => {
    const smil_xml_info = await Util.loadXmlFile(file_path, smil_file_name)
    if (smil_xml_info && smil_xml_info.smil && smil_xml_info.smil.body) {
      const body_node = _.isArray(smil_xml_info.smil.body) ? smil_xml_info.smil.body[0] : smil_xml_info.smil.body
      const switch_node = _.isArray(body_node.switch) ? body_node.switch[0] : body_node.switch
      const video_node_list = switch_node.video
      if (video_node_list) {
        for (let i = 0; i < video_node_list.length; i++) {
          const video_info = new SmilVideoInfo(video_node_list[i])
          this.video_info_map[video_info.file_name] = video_info
          this.video_info_list.push(video_info)
        }
        this.is_empty = false
      }
    }

    return this
  }

  isTransVideo = (file_name) => {
    const video_info = this.video_info_map[file_name]
    return video_info && !video_info.isEmpty()
  }

  findProxyVideoInfo = () => {
    const proxy_max_resolution = ServiceConfig.get('proxy_max_resolution') ? parseInt(ServiceConfig.get('proxy_max_resolution'), 10) : 360
    let proxy_file_name = null
    let proxy_resolution = null
    let max_resolution = 0
    let min_resolution = 0
    let min_file_name = null
    for (let i = 0; i < this.video_info_list.length; i++) {
      const video_info = this.video_info_list[i]
      const resolution = video_info.resolution
      if (resolution <= proxy_max_resolution) {
        if (resolution > max_resolution) {
          max_resolution = resolution
          proxy_file_name = video_info.file_name
          proxy_resolution = resolution
        }
      } else {
        if (min_resolution === 0 || resolution < min_resolution) {
          min_resolution = resolution
          min_file_name = video_info.file_name
        }
      }
    }

    if (proxy_file_name == null) {
      proxy_file_name = min_file_name
      proxy_resolution = min_resolution
    }
    return {
      name: proxy_file_name,
      resolution: proxy_resolution
    }
  }
}
