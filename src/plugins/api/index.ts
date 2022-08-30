import axios from './axios'
import APIS from './service'
import { API_CONFIG } from './config'

type Options = {
  sep: string,
  baseURL: string,
  prefixPath: string,
  debug: boolean
}

type Config = {
  [propsName: string]: any
}

type ConfigItem = {
  name: string,
  method: string,
  path: string,
  params: any,
  axiosOptions: any,
  desc: string
}

const assert = (condition: boolean | string, msg: string): void => {
  if (!condition) {
    throw new Error(`[ApiError] ${msg}`)
  }
}

class MakeApi {
  api: Config
  options: Options

  constructor (config: Config) {
    this.api = {}
    this.options = API_CONFIG
    this.register(config)
  }

  register (config: Config) {
    Object.keys(config).forEach((namespace: string) => {
      this.__build(config[namespace])
    })
  }

  __build (config: any[]) {
    const { sep, baseURL, debug } = this.options
    config.forEach((item: ConfigItem) => {
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