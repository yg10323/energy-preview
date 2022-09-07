import Koa from "koa";
import cors from 'koa2-cors'
import koaBody from 'koa-body'
import koaStatic from 'koa-static'
import path from 'path'
import mapRoutes from './router'
import config from './config'

const { Port } = config
const app = new Koa();

// 注册插件
app.use(cors({ origin: '*' }))
app.use(koaBody())
app.use(koaStatic(path.join(__dirname, 'static')))
mapRoutes(app)

app.listen(Port, () => {
  console.log('koa服务已启动, 端口:', Port)
});