import { useState, useEffect } from 'react'
import { Carousel } from 'antd';
import { TongHuanBi } from 'src/modules/components';
import { $api } from 'src/plugins'
import 'src/styles/modules/components/overview.less'

const Overview = () => {
  const [overViewData, setOverViewData] = useState<any>({})
  useEffect(() => {
    $api['getSummaryInfo']().then((res: any) => {
      if (res) {
        setOverViewData({
          EnergyDosageSummary: res.EnergyDosageSummary,
          topDatas: [res.Cons, res.Carbon]
        })
      }
    })
  }, [])

  const { EnergyDosageSummary } = overViewData

  return (
    <div className="overview">
      <div style={{ width: '100%', height: '1.02rem' }}>
        <Carousel autoplay autoplaySpeed={3000} dots={false} dotPosition='left'>
          {
            overViewData.topDatas?.map((item: any, index: number) => {
              return (
                <div className="overview-section" key={index}>
                  <div className="overview-section__title">
                    <span>{item.Title}</span>
                    <span>{`日累计量：${item.DayCarbon || 0} ${item.Unit}`}</span>
                  </div>
                  <div className="overview-section__content">
                    <div className="overview-section__content--left">
                      <span className='total'>{item.MonthEnergy}</span>
                      <span className='unit'>{item.Unit}</span>
                    </div>
                    <div className="overview-section__content--right">
                      <TongHuanBi title='月同比' value={item.YearOnYear} />
                      <TongHuanBi title='月环比' value={item.MonthOnMonth} />
                    </div>
                  </div>
                </div>
              )
            })
          }
        </Carousel>
      </div>
      <div className='overview-scroll' style={{ width: '100%', height: '3.34rem' }}>
        <Carousel autoplay autoplaySpeed={3200} dots={false} dotPosition='left'>
          {
            EnergyDosageSummary?.map((item: any, index: number) => {
              return (
                <div className="overview-section" key={index}>
                  <div className="overview-section__title">
                    <span>{item.Title}</span>
                    <span>{`日用${item.Name}量：${item.DayEnergyDosage}`}{item.Unit}</span>
                  </div>
                  <div className="overview-section__content">
                    <div className="overview-section__content--left">
                      <span className='total'>{item.MonthEnergyDosage}</span>
                      <span className='unit'>{item.Unit}</span>
                    </div>
                    <div className="overview-section__content--right">
                      <TongHuanBi title='月同比' value={item.YearOnYearDosage} />
                      <TongHuanBi title='月环比' value={item.MonthOnMonthDosage} />
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

export default Overview