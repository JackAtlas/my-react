export class ReactElement {
  constructor(type, props) {
    this.type = type
    this.props = props
  }
}

export function createElement(type, props, ...children) {
  props = props || {}
  props.children = children
  return new ReactElement(type, props)
}