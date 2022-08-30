import axios from 'axios'
import { AXIOS_CONFIG } from './config'
import interceptors from './interceptors'

const axiosInstance = axios.create(AXIOS_CONFIG)
axiosInstance.interceptors.request.use(interceptors.reqSuccess, interceptors.reqFailure)
axiosInstance.interceptors.response.use(interceptors.resSuccess, interceptors.resFailure)

export default axiosInstance