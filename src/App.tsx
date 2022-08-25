import React, { useState, useRef } from 'react'
import { DatePicker, Button, Dropdown, Menu } from 'antd'
import moment from 'moment'

const App = () => {
  const dataPickerRef = useRef<any>(null)
  const [pickerType, setPickerType] = useState<any>('year')
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  // 控制日历的展开和关闭
  const handelOpenChange = (open: boolean, isClicked: boolean = false) => {
    if (isClicked) return
    if (!open) dataPickerRef.current.blur()
    setDatePickerOpen(open)
  }

  const handleValueChange = (date: any, dateString: string) => {
    handelOpenChange(false)
    console.log('dateString', dateString)
  }

  const menuItems = [
    { key: 'year', label: '年' },
    { key: 'month', label: '月' },
    { key: 'range', label: '日期区间-时分秒' }
  ]

  // 控制下拉组件 item 点击
  const menuItemLabel = useRef<any>('查询条件-年')
  const handleMenuClick = (e: any) => {
    setPickerType(e.key)
    menuItemLabel.current = `查询条件-${menuItems.find((item: any) => item.key === e.key)?.label || '年'}`
  }

  // 	自定义渲染面板
  const renderPanelNode = (datePicker: any) => {
    return (
      <div className='panel-node'>
        <Dropdown overlay={<Menu items={menuItems} onClick={handleMenuClick} />}>
          <Button onClick={() => handelOpenChange(false, true)}>{menuItemLabel.current}</Button>
        </Dropdown >
        {
          pickerType !== 'range' ?
            datePicker
            :
            <DatePicker.RangePicker
              showTime
            />
        }
      </div>
    )
  }

  return (
    <div>
      <DatePicker
        picker={pickerType}
        ref={dataPickerRef}
        defaultValue={moment()}
        open={datePickerOpen}
        onFocus={() => handelOpenChange(true)}
        onBlur={() => handelOpenChange(false)}
        onChange={handleValueChange}
        panelRender={(panelNode: any) => renderPanelNode(panelNode)}
      />
    </div>
  )
}

export default App