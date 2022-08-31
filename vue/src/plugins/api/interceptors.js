const reqSuccess = (reqObj) => {
  // todo 请求拦截
  return reqObj
}
const reqFailure = (error) => { Promise.reject(error) }

const resSuccess = ({ data, config }) => {
  // todo 响应拦截
  return config.fullData ? data : data.Data
}
const resFailure = (error) => { Promise.reject(error) }

const interceptors = {
  reqSuccess,
  reqFailure,
  resSuccess,
  resFailure
}

export default interceptors