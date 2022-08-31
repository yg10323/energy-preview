
export const API_CONFIG = {
  // 分隔符
  sep: '/',
  // 请求前缀，用于版本控制
  prefixPath: '/api',
  baseURL: 'http://localhost:1288',
  // 携带token的前缀
  prefixToken: 'Bearer ',
  // 是否开启控制台conlose打印, 发布时关闭
  debug: true
}

export const AXIOS_CONFIG = {
  timeout: 5000,
  headers: {
    "Content-Type": "application/json;charset=utf-8"
  }
}