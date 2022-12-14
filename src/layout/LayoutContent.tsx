import 'src/styles/layout/layoutContent.less'

type Props = {
  title?: string,
  cornerVisible?: boolean,
  cornerPosition?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right',
  style?: any,
  [propsName: string]: any
}

const LayoutContent = (props: Props) => {
  const { title, cornerVisible, cornerPosition, style } = props
  return (
    <div className='layout-content' style={style}>
      {title && <div className="layout-content__title">{title}</div>}
      <div className="layout-content__main">{props.children}</div>
      <div className="layout-content__corner" >
        {
          cornerVisible && (
            <img
              className={`corner-img ${cornerPosition}`}
              src={require('../assets/corner.png')}
              alt="" />
          )
        }
      </div>
    </div>
  )
}

LayoutContent.defaultProps = {
  cornerVisible: true,
  cornerPosition: 'bottom-left',
  style: {}
}

export default LayoutContent