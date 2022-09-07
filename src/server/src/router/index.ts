import Koa from 'koa'
import fs from 'fs'
import Router from 'koa-router'

type RouterFile = {
  default: Router<any, {}>
}

const mapRoutes = (app: Koa) => {
  fs.readdirSync(__dirname).forEach(file => {
    try {
      if (file === 'index.js') return;
      import(`./${file}`).then((res: RouterFile) => {
        const router = res.default
        // 注册路由
        app.use(router.routes());
        app.use(router.allowedMethods());
      })
    } catch (error) {
    }
  })
}

export default mapRoutes