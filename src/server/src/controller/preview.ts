import type { Context, Next } from './types'
import fs from 'fs'
import path from 'path'

const readJsonFile = () => {
  try {
    const pathUrl = path.resolve(__dirname, '../db/db.json')
    const data = fs.readFileSync(pathUrl, { encoding: 'UTF-8' } as any).toString()
    return JSON.parse(data)
  } catch (error) {
    console.log('readJsonFile_', error)
  }
}

class PreviewController {
  async getAlertInfo (ctx: Context, next: Next) {
    ctx.body = readJsonFile().alertInfo
  }

  async getApplicationInfo (ctx: Context, next: Next) {
    ctx.body = readJsonFile().applicationInfo
  }

  async getEnergyMonitor (ctx: Context, next: Next) {
    ctx.body = readJsonFile().energyMonitor
  }

  async getMonthData (ctx: Context, next: Next) {
    const monthDataType = ctx.request.url.split('/').pop()
    const pathKey = monthDataType === '0' ? 'monthData' : 'monthData2'
    ctx.body = readJsonFile()[pathKey]
  }

  async getBaseConfig (ctx: Context, next: Next) {
    ctx.body = readJsonFile().baseConfig
  }

  async getProcedureDosage (ctx: Context, next: Next) {
    ctx.body = readJsonFile().procedureDosage
  }

  async getProcedureEngery (ctx: Context, next: Next) {
    ctx.body = readJsonFile().procedureEngery
  }

  async getSummaryInfo (ctx: Context, next: Next) {
    ctx.body = readJsonFile().summaryInfo
  }
}

const previewController = new PreviewController()

export default previewController