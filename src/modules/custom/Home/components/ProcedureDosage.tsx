import { useState, useEffect } from 'react'
import { Empty } from 'antd'
import { $api } from 'src/plugins'
import 'src/styles/modules/components/procedureDosage.less'

const ProcedureDosage = () => {
  const [localData, setLocalData] = useState<any>({})
  // useEffect(() => {
  //   $api['getProcedureDosage']().then((res: any) => {
  //     console.log('res', res)
  //     res && setLocalData(res)
  //   })
  // }, [])

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
    <div className='procedureDosage'>
      ProcedureDosage
    </div>
  )
}

export default ProcedureDosage