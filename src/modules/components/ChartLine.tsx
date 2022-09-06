import type { CSSProperties } from 'react'
import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react';

type Props = {
  chartData: any,
  style?: CSSProperties
}

const ChartLine = (props: Props) => {


  const chartOption = useMemo(() => {
    const { chartData = [] } = props
    const seriesData = chartData.map((item: any) => item.EnergyList)

    const legend = {
      data: chartData?.map((item: any) => `${item.Name}(${item.Unit})`)
    }

    const series = seriesData.map((option: any[]) => {
      return {
        type: 'line',
        data: option.map((item: any) => {
          return item.Value
        })
      }
    })

    const option = {
      legend,
      xAxis: {
        type: 'category',
        data: chartData[0]?.EnergyList?.map((item: any) => item.Time),
        axisLabel: {
          color: '#fff',
          formatter: (value: string) => {
            const label = value.split(' ')
            return `${label[0]}\n${label[1]}`
          }
        }
      },
      yAxis: [
        {
          type: 'value',
          min: 0,
          max: 4000,
          position: 'left',
          axisLabel: {
            formatter: '{value}'
          }
        },
        {
          type: 'value',
          min: 0,
          max: 250,
          position: 'right',
          axisLabel: {
            formatter: '{value}'
          }
        },
        // {
        //   type: 'value',
        //   name: '温度',
        //   min: 0,
        //   max: 25,
        //   position: 'right',
        //   axisLabel: {
        //     formatter: '{value} °C'
        //   }
        // }
      ],
      series
    }
    console.log('series', series);

    return option
  }, [props.chartData])

  return (
    <div className='chart-line'>
      <ReactECharts
        notMerge
        lazyUpdate
        option={chartOption}
      // style={{ width: '100%', height: '100%', ...props.style }}
      />
    </div>
  )
}

export default ChartLine