import { useState, useEffect } from 'react'
import { ChartBar } from 'src/modules/components'
import { $api } from 'src/plugins'
import 'src/styles/modules/components/monthMonitor.less'

const MonthMonitor = () => {
  const [btnType, setBtnType] = useState<number>(0)
  const [localState, setLocalState] = useState<any>(null)
  const getMonthData = (KeyWord: number = 0) => {
    const path = KeyWord === 0 ? 'getMonthData' : 'getMonthData2'
    setBtnType(KeyWord)
    $api[path]().then((res: any) => {
      res && res.chartDataModel && setLocalState(res.chartDataModel)
    })
  }

  useEffect(() => {
    getMonthData()
  }, [])

  return (
    <div className='month-monitor'>
      <div className='month-monitor__btns'>
        <div
          onClick={() => getMonthData(0)}
          className={`month-monitor__btns--button ${!btnType && 'gradient'}`}
        >近30天</div>
        <div
          onClick={() => getMonthData(1)}
          className={`month-monitor__btns--button ${btnType && 'gradient'}`}
        >自然月</div>
      </div>
      <div className='chart' style={{ width: '100%', height: ' 3.9rem' }}>
        <ChartBar chartData={localState} />
      </div>
    </div>
  )
}

export default MonthMonitor