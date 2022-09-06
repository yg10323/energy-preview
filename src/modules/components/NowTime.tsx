import { useState, useEffect } from 'react'
import dayjs from 'dayjs'

type Props = {
  extraText?: string,
  className?: string
  style?: Object
}

const NowTime = (props: Props) => {
  const [nowTime, setNowTime] = useState(dayjs().format('YYYY-MM-DD HH:mm:ss'))

  useEffect(() => {
    let timer = setInterval(() => {
      setNowTime(dayjs().format('YYYY-MM-DD HH:mm:ss'))
    })
    return () => clearInterval(timer)
  }, [])

  return <span className={props.className} style={props.style}>{`${props.extraText}${nowTime}`}</span>
}

NowTime.defaultProps = {
  extraText: '当前时间：',
  className: 'now-time'
}

export default NowTime