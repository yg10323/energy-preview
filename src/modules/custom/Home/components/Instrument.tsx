import { useState, useEffect } from 'react'
import { Carousel } from 'antd';
import { $api } from 'src/plugins'

import 'src/styles/layout/layoutContent.less'
import 'src/styles/modules/components/instrument.less'

const Instrument = () => {
  const [localState, setLocalState] = useState<any>({})
  useEffect(() => {
    Promise.all([
      $api['getAlertInfo'](),
      $api['getApplicationInfo']()
    ]).then((res: any) => {
      if (res && res.length) {
        const [alertInfo, applicationInfo] = res
        setLocalState({ alertInfo, applicationInfo })
      }
    })
  }, [])

  return (
    <div className='instrument'>
      <div className="instrument-scroll">
        <Carousel autoplay autoplaySpeed={3000} dots={false} dotPosition='left'>
          {
            localState.applicationInfo?.map((item: any, index: number) => {
              return (
                <div className="instrument-wrap" key={`applicationInfo_${index}`}>
                  <div className="instrument-wrap__section">
                    <div className="instrument-wrap__section--icon">
                      <img src={item.Img} alt="" />
                    </div>
                    <div className="instrument-wrap__section--zone">
                      <div className="instrument-wrap__section--zone-title">{`${item.Name}-器具`}</div>
                      <div className="instrument-wrap__section--zone-detail">
                        <span>{`在线数：${item.Online}`}<i />{`总数：${item.Total}`}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          }
        </Carousel>
      </div>

    </div>
  )
}

export default Instrument