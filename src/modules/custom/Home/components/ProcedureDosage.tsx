import { useState, useEffect, useMemo } from 'react'
import { Empty, Progress, Carousel } from 'antd'
import { $api } from 'src/plugins'
import { chunk, cloneDeep } from 'lodash'
import 'src/styles/modules/components/procedureDosage.less'

const strokeColor = [
  {
    from: '#090979',
    to: '#00d4ff'
  },
  {
    from: '#108ee9',
    to: '#87d068'
  },
  {
    from: '#22c1c3',
    to: '#22c1c3'
  },
  {
    from: '#094079',
    to: '#9e00ff'
  }
]

const ProcedureDosage = () => {
  const [localData, setLocalData] = useState<any>({})
  useEffect(() => {
    $api['getProcedureDosage']().then((res: any) => {
      res && setLocalData(res)
    })
  }, [])

  // 对dataSource数据分组：十个一组进行循环
  const dataSource = useMemo(() => {
    const DIVIDER = 10
    let dataSource: any[] = []
    if (localData.dataSource) {
      dataSource = cloneDeep(localData.dataSource)
      return chunk(dataSource, DIVIDER)
    }
    return dataSource
  }, [localData.dataSource])

  if (!localData.columns) {
    return <div className='procedureDosage'>
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description='暂无数据'
        style={{ color: '#ffffff', marginTop: '50%' }}
      />
    </div>
  }

  return (
    <div className='procedureDosage' >
      <div className='td th'>
        {
          localData?.columns.map((column: any) => {
            return <div className='row' key={column.key}>{column.title}</div>
          })
        }
      </div>
      <div className='scroll' >
        <Carousel autoplay autoplaySpeed={4000} dots={false} dotPosition='left'>
          {
            dataSource.map((datas: any, index: number) => {
              return <div style={{ width: '100%', height: '100%' }} key={index}>
                {
                  datas.map((data: any, index: number) => {
                    return (
                      <div key={data.Ranking} className={`td ${index % 2 === 0 ? 'odd' : ''}`}>
                        <div className='row'>{data.Ranking}</div>
                        <div className='row'>{data.Name}</div>
                        <div className='row'>{data.Value}</div>
                        <div className='row'>
                          <Progress
                            strokeColor={strokeColor[index % 4]}
                            percent={data.Ratio * 100}
                            showInfo={false}
                            status='active'
                          />
                        </div>
                        <div className='row'>{(data.Ratio * 100).toFixed(2)}</div>
                      </div>
                    )
                  })
                }
              </div>
            })
          }
        </Carousel>
      </div>
    </div>
  )
}

export default ProcedureDosage