import Router from 'koa-router'
import config from '../config'

const previewRouter = new Router({ prefix: config.Prefix })


export default previewRouter