import Koa from 'koa'
import fs from 'fs'

const mapRoutes = (app: Koa) => {
  fs.readdirSync(__dirname).forEach((file: string) => {
    try {
      if (file === 'index.js') return;
      // export default 导出的模块需要使用 require().default 获取
      const router = require(`./${file}`).default;
      app.use(router.routes());
      app.use(router.allowedMethods());
    } catch (error: any) { }
  })
}

export default mapRoutes