import { useState, useEffect } from 'react'
import { ChartPie } from 'src/modules/components'
import { $api } from 'src/plugins'

const ProcedureEngery = () => {
  const [chartData, setChartData] = useState<any>({})
  useEffect(() => {
    $api['getProcedureEngery']().then((res: any) => {
      res && setChartData({ Data: res })
    })
  }, [])

  return (
    <div className='procedureEngery' style={{ width: '100%', height: '4.08rem' }}>
      <ChartPie
        chartData={chartData}
      />
    </div>
  )
}

export default ProcedureEngery