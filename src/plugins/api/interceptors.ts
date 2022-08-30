const reqSuccess = (reqObj: any) => {
  // todo 请求拦截
  return reqObj
}
const reqFailure = (error: any) => { Promise.reject(error) }

const resSuccess = ({ data, config }: any) => {
  // todo 响应拦截
  return config.fullData ? data : data.Data
}
const resFailure = (error: any) => { Promise.reject(error) }

const interceptors = {
  reqSuccess,
  reqFailure,
  resSuccess,
  resFailure
}

export default interceptors