import { useEffect, useState } from 'react'
import { LayoutContent } from 'src/layout'
import { Overview, ProcedureEngery, ProcedureDosage } from './components'
import { $api } from 'src/plugins'
import 'src/styles/modules/home/index.less'

const Home = () => {
  const [baseConfig, setBaseConfig] = useState<any>(null)
  useEffect(() => {
    $api['getBaseConfig']().then((res: any) => {
      res && setBaseConfig(res)
    })
  }, [])

  return (
    <div className="route-home">
      <div className="route-home__left">
        <LayoutContent
          style={{ width: '4.9rem', height: '4.36rem', marginTop: '0.36rem' }}
        >
          <Overview />
        </LayoutContent>
        <LayoutContent
          title='器具监测'
          style={{ width: '4.9rem', height: '5.44rem', marginTop: '0.2rem' }}
        >

        </LayoutContent>
      </div>
      <div className="route-home__center">
        <div className="route-home__center--title">
          <p>{baseConfig?.Title}</p>
          <span></span>
        </div>
        <LayoutContent
          title='24小时实时用能监测'
          cornerVisible={false}
          style={{ width: '8.51rem', height: '4.65rem', marginTop: '0.13rem' }}
        >

        </LayoutContent>
        <LayoutContent
          title='月统计峰谷平用电监测'
          cornerVisible={false}
          style={{ width: '8.51rem', height: '4.65rem', marginTop: '0.2rem' }}
        >

        </LayoutContent>
      </div>
      <div className="route-home__right">
        <LayoutContent
          title='本月排行'
          cornerPosition='bottom-right'
          style={{ width: '4.9rem', height: '4.36rem', marginTop: '0.36rem' }}
        >
          <ProcedureEngery />
        </LayoutContent>
        <LayoutContent
          title='本月排行'
          cornerPosition='bottom-right'
          style={{ width: '4.9rem', height: '5.44rem', marginTop: '0.2rem' }}
        >
          <ProcedureDosage />
        </LayoutContent>
      </div>
    </div>
  )
}

export default Home