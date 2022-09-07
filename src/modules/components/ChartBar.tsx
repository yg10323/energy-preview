/* eslint-disable react-hooks/exhaustive-deps */
import type { CSSProperties } from 'react'
import type { ECharts } from 'echarts'
import { useMemo, useRef, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'
import moment from 'moment'

type Props = {
  chartData: any,
  autoPlay?: boolean,
  onChartReady?: Function,
  style?: CSSProperties
}

const presetColors: string[] = [
  '#f5222d',
  '#fadb14',
  '#13c2c2',
  '#52c41a',
  '#faad14',
]

const ChartBar = (props: Props) => {
  const timer = useRef<any>()
  const counter = useRef<number>(0)
  const chartRef = useRef<ECharts>()
  const handleChartReady = (chartInstance: any) => {
    chartRef.current = chartInstance
    props.onChartReady?.(chartInstance)
  }

  useEffect(() => {
    props.autoPlay && props.chartData && handleStart()
  }, [props.autoPlay, props.chartData])

  const handleStart = () => {
    timer.current = setInterval(() => {
      chartRef.current?.dispatchAction({
        type: 'downplay'
      })
      chartRef.current?.dispatchAction({
        type: 'highlight',
        seriesIndex: 1,
        dataIndex: counter.current
      })
      chartRef.current?.dispatchAction({
        type: 'showTip',
        seriesIndex: 1,
        dataIndex: counter.current
      })
      counter.current++
      if (counter.current > props.chartData?.XAxis[0].Data.length) {
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

  const seriesOption = (type: string, option: any) => {
    if (type === 'line') {
      return {
        type: 'line',
        yAxisIndex: 1,
        symbol: 'circle',
        symbolSize: 4,
        showAllSymbol: true,
        label: {
          color: '#ffffff'
        },
        lineStyle: {
          width: 2,
          color: option.Color
        },
        itemStyle: {
          color: option.Color
        }
      }
    }

    if (type === 'bar') {
      return {
        type: 'bar',
        stack: 'x',
        barMinWidth: 13,
        label: {
          color: '#ffffff'
        },
        itemStyle: {
          color: option.Color
        }
      }
    }
  }

  const chartOption = useMemo(() => {
    const { chartData = {} } = props

    const option = {
      legend: {
        top: '1%',
        itemWidth: 16,
        itemHeight: 10,
        textStyle: {
          color: '#ffffff',
          fontSize: 14
        },
        data: chartData?.Data?.map((item: any) => item.Name)
      },
      grid: {
        top: '10%',
        right: '4%',
        bottom: '10%',
        left: '6%',
        containLabel: false
      },
      tooltip: {
        trigger: 'axis',
        textStyle: {
          align: 'left'
        },
        axisPointer: {
          type: 'shadow',
          shadowStyle: {
            color: '#2f3bca',
            opacity: 0.3
          }
        }
      },
      xAxis: {
        type: 'category',
        axisLine: {
          lineStyle: {
            color: '#BFBFBF'
          }
        },
        boundaryGap: true,
        axisTick: {
          alignWithLabel: true
        },
        axisLabel: {
          color: '#BFBFBF',
          fontSize: 11,
          formatter: (value: string) => moment(value).format('MM-DD')
        },
        data: chartData?.XAxis[0]?.Data || []
      },
      yAxis: chartData?.YAxis?.map((item: any, index: number) => {
        return {
          type: 'value',
          name: item.Name,
          nameGap: 6,
          nameTextStyle: {
            align: index === 0 ? 'left' : 'right'
          },
          axisLine: {
            show: true,
            lineStyle: {
              color: '#BFBFBF'
            }
          },
          axisTick: {
            show: true,
            lineStyle: {
              color: '#C5C5C5'
            }
          },
          splitLine: {
            show: false
          },
          axisLabel: {
            color: '#7B7B7B',
            fontSize: 11,
            formatter: index === 0 && ((value: number | string) => {
              const number = Number(value)
              return number > 10000000 ? `${number / 10000000}千万` : number > 10000 ? `${number / 10000}万` : number
            })
          },
          min: item.Min || 0,
          max: item.Max || 'dataMax',
          position: index === 0 ? 'left' : 'right',
          offset: index === 0 ? 0 : -(chartData.length - index - 1) * 50
        }
      }),
      series: chartData?.Data?.map((item: any, index: number) => {
        const Name = item.Name
        const Color = presetColors[index % presetColors.length]
        const Data = item.Data.map((item: any) => item.Value)
        return {
          name: Name,
          data: Data,
          ...seriesOption(item.Type, { Color })
        }
      })
    }

    return option
  }, [props.chartData])

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

ChartBar.defaultProps = {
  autoPlay: true
}

export default ChartBar