import $ from 'jquery'
import createReactUnit from './unit'
import { createElement } from './element'
import Component from './component'

let React = {
  nextRootIndex: 0,
  createElement,
  Component,
  render
}

function render(element, container) {
  // 通过工厂函数来创建元素
  let createReactUnitInstance = createReactUnit(element)
  let markup = createReactUnitInstance.getMarkup(React.nextRootIndex)
  $(container).html(markup)
  $(document).trigger('mounted') // 所有组件都挂载完成
}

export default React