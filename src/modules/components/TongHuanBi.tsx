import React from 'react'

type Props = {
  title: string,
  value: number,
}

const TongHuanBi = (props: Props) => {
  const { title, value } = props
  const className = value > 0 ? 'warning' : 'success'
  const prefix = value > 0 ? '+' : '-'
  return (
    <React.Fragment>
      <span>
        {title}
        <i className={className}>{prefix}{value.toFixed(2)}%</i>
      </span>
    </React.Fragment>
  )
}

export default TongHuanBi