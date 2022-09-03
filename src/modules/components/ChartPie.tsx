/* eslint-disable react-hooks/exhaustive-deps */
import type { CSSProperties } from 'react'
import type { ECharts } from 'echarts'
import { useMemo, useRef, useEffect } from 'react'
import ReactECharts from 'echarts-for-react';

type Props = {
  chartData: any,
  autoPlay?: boolean,
  onChartReady?: Function,
  style?: CSSProperties
}

const ChartPie = (props: Props) => {
  const timer = useRef<any>()
  const counter = useRef<number>(0)
  const chartRef = useRef<ECharts>()
  const handleChartReady = (chartInstance: any) => {
    chartRef.current = chartInstance
    props.onChartReady?.(chartInstance)
  }

  useEffect(() => {
    props.autoPlay && props.chartData.Data && handleStart()
  }, [props.autoPlay, props.chartData.Data])

  const chartOption = useMemo(() => {
    const { Name = '', Data = [] } = props.chartData
    const preColor = ['#880af2', '#6000ff', '#00a8ff', '#00ffd2', '#0048ff', '#00fcff']

    const tooltip = {
      trigger: 'item',
      formatter: (params: any) => {
        if (params.seriesName) return `${params.seriesName}<br />${params.name}：${params.value} ${params.percent}`
        return `${params.name}<br />用量：${params.value}<br />占比：${params.percent}`
      }
    }
    const series = [
      {
        name: '外环',
        type: 'pie',
        center: ['50%', '55%'],
        radius: ['25.44%', '59.62%'],
        label: { show: false },
        itemStyle: { color: '#08187a' },
        labelLine: { show: false },
        silent: true,
        emphasis: {
          disabled: true,
          scale: false
        },
        data: [{ value: 1 }]
      },
      {
        name: '内环',
        type: 'pie',
        center: ['50%', '55%'],
        radius: ['17.36%', '21.77%'],
        label: { show: false },
        itemStyle: { color: '#031a65' },
        labelLine: { show: false },
        silent: true,
        emphasis: {
          disabled: true,
          scale: false
        },
        data: [{ value: 1 }]
      },
      {
        name: Name,
        type: 'pie',
        center: ['50%', '55%'],
        radius: ['25,45%', '56.82%'],
        startAngle: 110,
        label: {
          fontSize: '14px',
          color: '#ffffff',
          formatter: ['', '{b}', '{d}%'].join('\n')
        },
        emphasis: { scaleSize: 12 },
        data: Data.map(({ Name, Total }: any, index: number) => {
          return {
            name: Name,
            value: Total,
            itemStyle: {
              color: preColor[index % 6]
            }
          }
        })
      }
    ]

    return {
      tooltip,
      series
    }
  }, [props.chartData])

  const handleStart = () => {
    timer.current = setInterval(() => {
      chartRef.current?.dispatchAction({
        type: 'downplay'
      })
      chartRef.current?.dispatchAction({
        type: 'highlight',
        seriesIndex: 2,
        dataIndex: counter.current
      })
      chartRef.current?.dispatchAction({
        type: 'showTip',
        seriesIndex: 2,
        dataIndex: counter.current
      })
      counter.current++
      if (counter.current > props.chartData?.Data?.length) {
        counter.current = 0
      }
    }, 2000)
  }

  const handleStop = () => {
    clearInterval(timer.current)
    chartRef.current?.dispatchAction({
      type: 'downplay'
    })
  }

  return (
    <div
      onMouseEnter={handleStop}
      onMouseLeave={handleStart}
      style={{ width: '100%', height: '100%' }}
    >
      <ReactECharts
        notMerge
        lazyUpdate
        option={chartOption}
        onChartReady={handleChartReady}
        style={{ width: '100%', height: '100%', ...props.style }}
      />
    </div>
  )
}

ChartPie.defaultProps = {
  autoPlay: true
}

export default ChartPie