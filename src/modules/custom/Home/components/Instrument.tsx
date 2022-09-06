import { useState, useEffect, useMemo } from 'react'
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

  const splitArr = useMemo(() => {
    const arr: any[] = []
    localState.applicationInfo?.forEach((item: any, index: number) => {
      const splitIndex = Math.floor(index / 3)
      const itemIndex = index % 3
      !arr[splitIndex] && (arr[splitIndex] = [])
      arr[splitIndex][itemIndex] = item
    })
    return arr
  }, [localState])

  return (
    <div className='instrument'>
      <div className="instrument-scroll">
        <Carousel autoplay autoplaySpeed={3000} dots={false} dotPosition='left'>
          {
            splitArr?.map((spItem: any, spIndex: number) => {
              return (
                <div className="instrument-wrap" key={`applicationInfo_${spIndex}`}>
                  {
                    spItem.map((item: any, index: number) => {
                      return (
                        <div className="instrument-wrap__section" key={`instrument-wrap__section_${index}`}>
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
                      )
                    })
                  }
                </div>
              )
            })
          }
        </Carousel>
      </div>
      <div className="instrument-table">
        <div className="instrument-table__title">器具设备预警报警</div>
        <div className="th">
          <div className="row">时间</div>
          <div className="row">器具设备</div>
          <div className="row">事件</div>
        </div>
        {
          localState.alertInfo?.map((item: any, index: number) => {
            return (
              <div key={`alertInfo_${index}`} className={`td ${index % 2 === 0 ? 'old' : ''}`}>
                <div className="row">{item.CREATE_TIME}</div>
                <div className="row">{(item.Nav_Appliance.NAME || '') + (item.Equipment?.NAME || '')}</div>
                <div className="row">{item.Nav_AlarmTask.NAME}</div>
              </div>
            )
          })
        }
      </div>
    </div>
  )
}

export default Instrument