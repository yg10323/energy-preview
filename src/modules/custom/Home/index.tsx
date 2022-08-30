import { LayoutContent } from 'src/layout'
import { Overview } from './components'
import 'src/styles/modules/home/index.less'

const Home = () => {
  return (
    <div className="route-home">
      <div className="route-home__left">
        <LayoutContent
          title='overview'
          style={{ width: '4.9rem', height: '4.36rem', marginTop: '0.36rem' }}
        >
          <Overview />
        </LayoutContent>
      </div>
    </div>
  )
}

export default Home