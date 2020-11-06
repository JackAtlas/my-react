import $ from 'jquery'
import { ReactElement } from './element'
import types from './types'
let diffQueue = []
let updateDepth = 0

function createReactUnit(element) {
  if (typeof element === 'string' || typeof element === 'number') {
    return new ReactTextUnit(element)
  }
  if (typeof element === 'object' && typeof element.type === 'string') {
    return new ReactNativeUnit(element)
  }
  if (typeof element === 'object' && typeof element.type === 'function') {
    return new ReactCompositUnit(element)
  }
}

class ReactUnit {
  constructor(element) {
    this._currentElement = element
  }
  setState(newState) {
    // console.log(newState)
  }
}

class ReactTextUnit extends ReactUnit {
  getMarkup(rootId) {
    this._reactid = rootId
    return `<span data-reactid="${this._reactid}">${this._currentElement}</span>`
  }
  update(nextElement) {
    if (this._currentElement === nextElement) return
    this._currentElement = nextElement
    $(`[data-reactid="${this._reactid}"]`).html(this._currentElement)
  }
}

class ReactNativeUnit extends ReactUnit {
  getMarkup(rootId) {
    this._reactid = rootId
    let { type, props } = this._currentElement
    let tagStart = `<${type} data-reactid="${this._reactid}"`
    let tagEnd = `</${type}>`
    this._renderedChildrenUnits = []
    let contentStr = ''
    for (let propName in props) {
      if (/on[A-Z]/.test(propName)) {
        let eventType = propName.slice(2).toLocaleLowerCase()
        $(document).delegate(`[data-reactid="${this._reactid}"]`, `${eventType}.${this._reactid}`, props[propName])
      } else if (propName === 'style') {
        let styleObj = props[propName]
        let styles = Object.entries(styleObj).map(([attr, value]) => {
          return `${attr.replace(/[A-Z]/g, m => `-${m.toLocaleLowerCase()}`)}:${value}`
        }).join(';')
        tagStart += ` style="${styles}"`
      } else if (propName === 'className') {
        tagStart += ` class="${porps[propName]}"`
      } else if (propName === 'children') {
        contentStr = props[propName].map((child, idx) => {
          let childUnit = createReactUnit(child)
          childUnit._mountIndex = idx
          this._renderedChildrenUnits.push(childUnit)
          return childUnit.getMarkup(`${this._reactid}.${idx}`)
        }).join('')
      } else {
        tagStart += (`${propName}="${props[propName]}"`)
      }
    }
    return tagStart + '>' + contentStr + tagEnd
  }
  update(nextElement) {
    let oldProps = this._currentElement.props
    let newProps = nextElement.props
    this.updateDOMProperties(oldProps, newProps)
    this.updateDOMChildren(nextElement.props.children)
  }
  updateDOMProperties(oldProps, newProps) {
    for (let propName in oldProps) {
      if (!newProps.hasOwnProperty(propName)) {
        $(`[data-reactid=${this._reactid}]`).removeAttr(propName)
      }
      if (/^on[A-Z]/.test(propName)) {
        $(document).undelegate(`.${this._reactid}`)
      }
    }
    for (let propName in newProps) {
      if (propName === 'children') {
        continue
      } else if (/^on[A-Z]/.test(propName)) {
        let eventType = propName.slice(2).toLocaleLowerCase()
        $(document).delegate(`[data-reactid="${this._reactid}"]`, `${eventType}.${this._reactid}`, newProps[propName])
      } else if (propName === 'style') {
        let styleObj = newProps[propName]
        let styles = Object.entries(styleObj).map(([attr, value]) => {
          $(`[data-reactid="${this._reactid}"]`).css(attr, value)
        })
      } else if (propName === 'className') {
        $(`[data-reactid="${this._reactid}"]`).attr('class', newProps[propName])
      } else {
        $(`[data-reactid="${this._reactid}"]`).prop(propName, newProps[propName])
      }
    }
  }
  updateDOMChildren(newChildrenElements) {
    updateDepth++
    this.diff(diffQueue, newChildrenElements)
    updateDepth--
    if (updateDepth === 0) {
      this.patch(diffQueue)
      diffQueue = []
    }
  }
  diff(diffQueue, newChildrenElements) {
    let oldChildrenUnitMap = this.getOldChildrenMap(this._renderedChildrenUnits)
    let { newChildrenUnitMap, newChildrenUnits } = this.getNewChildren(oldChildrenUnitMap, newChildrenElements)
    let lastIndex = 0 // 上一个已经确定位置的索引
    for (let i = 0; i < newChildrenUnits.length; i++) {
      let newUnit = newChildrenUnits[i]
      let newKey = (newUnit._currentElement.props && newUnit._currentElement.props.key) || i.toString()
      let oldChildUnit = oldChildrenUnitMap[newKey]
      if (oldChildUnit === newUnit) {
        if (oldChildUnit._mountIndex < lastIndex) {
          diffQueue.push({
            parentId: this._reactid,
            parentNode: $(`[data-reactid="${this._reactid}"]`),
            type: types.MOVE,
            fromIndex: oldChildUnit._mountIndex,
            toIndex: i
          })
        }
        lastIndex = Math.max(lastIndex, oldChildUnit._mountIndex)
      } else {
        if (oldChildUnit) {
          diffQueue.push({
            parentId: this._reactid,
            parentNode: $(`[data-reactid="${this._reactid}"]`),
            type: types.REMOVE,
            fromIndex: oldChildUnit._mountIndex
          })
          this._renderedChildrenUnits = this._renderedChildrenUnits.filter(item => item !== oldChildUnit)
          $(document).undelegate(`.${oldChildUnit._reactid}`)
        }
        diffQueue.push({
          parentId: this._reactid,
          parentNode: $(`[data-reactid="${this._reactid}"]`),
          type: types.INSERT,
          toIndex: i,
          markup: newUnit.getMarkup(`${this._reactid}.${i}`)
        })
      }
      newUnit._mountIndex = i
    }
    for (let oldKey in oldChildrenUnitMap) {
      let oldChildUnit = oldChildrenUnitMap[oldKey]
      if (!newChildrenUnitMap.hasOwnProperty(oldKey)) {
        diffQueue.push({
          parentId: this._reactid,
          parentNode: $(`[data-reactid="${this._reactid}"]`),
          type: types.REMOVE,
          fromIndex: oldChildUnit._mountIndex
        })
        this._renderedChildrenUnits = this._renderedChildrenUnits.filter(item => item !== oldChildUnit)
        $(document).undelegate(`.${oldChildUnit._reactid}`)
      }
    }
  }
  getOldChildrenMap(childrenUnits = []) {
    let map = {}
    for (let i = 0; i < childrenUnits.length; i++) {
      let unit = childrenUnits[i]
      let key = (unit._currentElement.props && unit._currentElement.props.key) || i.toString()
      map[key] = unit
    }
    return map
  }
  getNewChildren(oldChildrenUnitMap, newChildrenElements) {
    let newChildrenUnits = []
    let newChildrenUnitMap = {}
    newChildrenElements.forEach((newElement, index) => {
      let newKey = (newElement.props && newElement.props.key) || index.toString()
      let oldUnit = oldChildrenUnitMap[newKey]
      let oldElement = oldUnit && oldUnit._currentElement
      if (shouldDeepCompare(oldElement, newElement)) {
        oldUnit.update(newElement)
        newChildrenUnits.push(oldUnit)
        newChildrenUnitMap[newKey] = oldUnit
      } else {
        let nextUnit = createReactUnit(newElement)
        newChildrenUnits.push(nextUnit)
        newChildrenUnitMap[newKey] = nextUnit
        this._renderedChildrenUnits[index] = nextUnit
      }
    })
    return { newChildrenUnitMap, newChildrenUnits }
  }
  patch(diffQueue) {
    let deleteNodes = [] // 存放所有将要删除的节点
    let deleteMap = {} // 存放能复用的节点
    for (let i = 0; i < diffQueue.length; i++) {
      let difference = diffQueue[i]
      if (difference.type === types.MOVE || difference.type === types.REMOVE) {
        let fromIndex = difference.fromIndex
        let oldNode = $(difference.parentNode.children().get(fromIndex))
        if (!deleteMap[difference.parentId]) deleteMap[difference.parentId] = {}
        deleteMap[difference.parentId][fromIndex] = oldNode
        deleteNodes.push(oldNode)
      }
    }
    $.each(deleteNodes, (idx, item) => $(item).remove())

    for (let i = 0; i < diffQueue.length; i++) {
      let difference = diffQueue[i]
      switch(difference.type) {
        case types.INSERT:
          this.insertChildAt(difference.parentNode, difference.toIndex, $(difference.markup))
          break
        case types.MOVE:
          this.insertChildAt(difference.parentNode, difference.toIndex, deleteMap[difference.parentId][difference.fromIndex])
          break
        default:
      }
    }
  }
  insertChildAt(parentNode, toIndex, newNode) {
    let oldChild = parentNode.children().get(toIndex)
    oldChild ? newNode.insertBefore(oldChild) : newNode.appendTo(parentNode)
  }
}

class ReactCompositUnit extends ReactUnit {
  getMarkup(rootId) {
    this._reactid = rootId
    let { type:Component, props } = this._currentElement
    let componentInstance = this._componentInstance = new Component(props)
    componentInstance._currentUnit = this
    componentInstance.componentWillMount && componentInstance.componentWillMount()
    let renderedElement = componentInstance.render()
    let renderedUnitInstance = this._renderedUnitInstance = createReactUnit(renderedElement)
    let markup = renderedUnitInstance.getMarkup(this._reactid)
    $(document).on('mounted', () => {
      componentInstance.componentDidMount && componentInstance.componentDidMount()
    })
    return markup
  }
  update(nextElement, partitialState) {
    this._currentElement = nextElement || this._currentElement
    let nextState = this._componentInstance.state = Object.assign(this._componentInstance.state, partitialState)
    let nextProps = this._currentElement.props
    if (this._componentInstance.shouldComponentUpdate && !this._componentInstance.shouldComponentUpdate(nextProps, nextState)) return
    let preRenderedUnitInstance = this._renderedUnitInstance
    let preRenderedElement = preRenderedUnitInstance._currentElement
    let nextRenderedElement = this._componentInstance.render()
    if (shouldDeepCompare(preRenderedElement, nextRenderedElement)) {
      preRenderedUnitInstance.update(nextRenderedElement)
      this._componentInstance.componentDidUpdate && this._componentInstance.componentDidUpdate()
    } else {
      this._renderedUnitInstance = createReactUnit(nextRenderedElement)
      let nextMarkup = this._renderedUnitInstance.getMarkup(this._reactid)
      $(`[data-reactid="${this._reactid}"]`).replaceWith(nextMarkup)
    }
  }
}

function shouldDeepCompare(oldElement, newElement) {
  if (oldElement !== null && newElement !== null) {
    let oldType = typeof oldElement
    let newType = typeof newElement
    if ((oldType === 'string' || oldType === 'number') && (newType === 'string' || newType === 'number')) {
      return true
    }
    if (oldElement instanceof ReactElement && newElement instanceof ReactElement) {
      return oldElement.type === newElement.type
    }
  }
  return false
}

export default createReactUnit