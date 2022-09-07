import Router from 'koa-router'
import config from '../config'
import previewController from '../controller/preview'

const {
  getAlertInfo,
  getApplicationInfo,
  getEnergyMonitor,
  getMonthData,
  getBaseConfig,
  getProcedureDosage,
  getProcedureEngery,
  getSummaryInfo
} = previewController

const previewRouter = new Router({ prefix: config.Prefix })

previewRouter.get('/getAlertInfo', getAlertInfo)
previewRouter.get('/getApplicationInfo', getApplicationInfo)
previewRouter.get('/getEnergyMonitor', getEnergyMonitor)
previewRouter.get('/getMonthData/:type', getMonthData)
previewRouter.get('/getBaseConfig', getBaseConfig)
previewRouter.get('/getProcedureDosage', getProcedureDosage)
previewRouter.get('/getProcedureEngery', getProcedureEngery)
previewRouter.get('/getSummaryInfo', getSummaryInfo)

export default previewRouter