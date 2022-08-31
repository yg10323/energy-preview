import axios from './axios'
import APIS from './service'
import { API_CONFIG } from './config'

const assert = (condition) => {
  if (!condition) {
    throw new Error(`[ApiError] ${msg}`)
  }
}

class MakeApi {

  constructor (config) {
    this.api = {}
    this.options = API_CONFIG
    this.register(config)
  }

  register (config) {
    Object.keys(config).forEach((namespace) => {
      this.__build(config[namespace])
    })
  }

  __build (config) {
    const { sep, baseURL, debug } = this.options
    config.forEach((item) => {
      const { name: apiName, method, path: apiUrl } = item

      // api配置项容错判断, 发布时设置 debug为 false
      debug && assert(apiName, `${apiUrl}的name项不能为空`)
      debug && assert(apiUrl.indexOf(sep) === 0, `${apiName}的${apiUrl}必须以${sep}开头`)

      Object.defineProperty(this.api, apiName, { value: () => axios({ baseURL, url: apiUrl, method }) })
    })
  }
}

const $api = new MakeApi(APIS)

export default $api['api']