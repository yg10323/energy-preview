import { useState, useEffect } from 'react'
import { ChartLine } from 'src/modules/components'
import { $api } from 'src/plugins'

const RealTimeMonitor = () => {
  const [localState, setLocalState] = useState<any>([])
  useEffect(() => {
    $api['getEnergyMonitor']().then((res: any) => {
      res && res.length && setLocalState(res)
    })
  }, [])

  return (
    <div className='realtime-monitor' style={{ width: '100%', height: '4.29rem' }}>
      <ChartLine chartData={localState} />
    </div>
  )
}

export default RealTimeMonitor