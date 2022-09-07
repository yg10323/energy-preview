/* eslint-disable react-hooks/exhaustive-deps */
import type { CSSProperties } from 'react'
import type { ECharts } from 'echarts'
import { useMemo, useRef, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'
import moment from 'moment'

const presetColors: string[] = [
  '133,84,158',
  '0,183,238',
  '50,177,108',
  '250,140,22'
]

type Props = {
  chartData: any,
  autoPlay?: boolean,
  onChartReady?: Function,
  style?: CSSProperties
}

const ChartLine = (props: Props) => {
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
      if (counter.current > props.chartData[0]?.EnergyList?.length) {
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

  const chartOption = useMemo(() => {
    const { chartData = [] } = props

    const option = {
      legend: {
        top: '8%',
        itemWidth: 16,
        itemHeight: 10,
        icon: 'roundRect',
        textStyle: {
          color: '#ffffff',
          fontSize: 14
        },
        data: chartData?.map((item: any) => `${item.Name}(${item.Unit})`) || []
      },
      grid: {
        top: '16%',
        right: '4%',
        bottom: '16%',
        left: '4%',
        containLabel: false
      },
      tooltip: {
        trigger: 'axis',
        textStyle: {
          align: 'left'
        },
        axisPointer: {
          lineStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color: 'rgba(255, 255, 255, 0)'
                },
                {
                  offset: 0.34,
                  color: 'rgba(255, 255, 255, 0.78)'
                }
                ,
                {
                  offset: 0.53,
                  color: 'rgba(255, 255, 255, 0.84)'
                }
                ,
                {
                  offset: 1,
                  color: 'rgba(218, 218, 218, 0)'
                }
              ],
              global: false
            }
          }
        }
      },
      xAxis: {
        type: 'category',
        axisLine: {
          lineStyle: {
            color: '#A0A0A0'
          }
        },
        axisLabel: {
          color: '#fff',
          fontSize: 11,
          formatter: (value: string) => {
            const md = moment(value).format('MM-DD')
            const hm = moment(value).format('HH:mm')
            return [md, hm].join('\n')
          }
        },
        boundaryGap: false,
        data: chartData[0]?.EnergyList?.map((item: any) => item.Time),
      },
      yAxis: chartData?.map((item: any, index: number) => {
        const color = presetColors[index % presetColors.length]
        return {
          type: 'value',
          splitLine: {
            show: index === 0,
            lineStyle: {
              color: 'rgba(0, 53, 103, 1)'
            }
          },
          axisLabel: {
            inside: true,
            color: `rgba(${color}, 1)`,
            verticalAlign: 'bottom'
          },
          axisTick: {
            show: false
          },
          position: index === 0 ? 'left' : 'right',
          offset: index === 0 ? 0 : -(chartData.length - index - 1) * 50
        }
      }),
      series: chartData?.map((item: any, index: number) => {
        const Name = `${item.Name}(${item.Unit})`
        const Color = presetColors[index % presetColors.length]
        const Data = item.EnergyList.map((item: any) => item.Value)
        return {
          type: 'line',
          name: Name,
          yAxisIndex: index,
          symbol: 'circle',
          symbolSize: 4,
          showAllSymbol: true,
          label: {
            color: '#fff'
          },
          lineStyle: {
            color: `rgba(${Color},1)`
          },
          itemStyle: {
            width: 2,
            color: `rgba(${Color},1)`
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color: `rgba(${Color}, 0.6)`
                },
                {
                  offset: 1,
                  color: `rgba(${Color}, 0)`
                }
              ],
              global: false
            }
          },
          data: Data
        }
      })
    }

    return option
  }, [props.chartData])

  return (
    <div className='chart-line'
      onMouseEnter={handleStop}
      onMouseLeave={handleStart}
      style={{ width: '100%', height: '100%' }}>
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

ChartLine.defaultProps = {
  autoPlay: true
}

export default ChartLine