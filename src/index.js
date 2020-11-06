import React from '../react'

// class List extends React.Component {
//   constructor(props) {
//     super(props)
//     this.state = { odd: true }
//   }
//   componentDidMount() {
//     setTimeout(() => {
//       this.setState({ odd: !this.state.odd })
//     }, 1000)
//   }
//   render() {
//     if (this.state.odd) {
//       return React.createElement(
//         'ul',
//         null,
//         React.createElement('li', { key: 'A' }, 'A'),
//         React.createElement('li', { key: 'B' }, 'B'),
//         React.createElement('li', { key: 'C' }, 'C'),
//         React.createElement('li', { key: 'D' }, 'D')
//       )
//     } else {
//       return React.createElement(
//         'ul',
//         null,
//         React.createElement('li', { key: 'A' }, 'A1'),
//         React.createElement('li', { key: 'C' }, 'C1'),
//         React.createElement('li', { key: 'B' }, 'B1'),
//         React.createElement('li', { key: 'E' }, 'E1'),
//         React.createElement('li', { key: 'F' }, 'F')
//       )
//     }
//   }
// }

class Todos extends React.Component {
  constructor(props) {
    super(props)
    this.state = { list: [], text: '' }
  }
  onChange(event) {
    this.setState({ text: event.target.value })
  }
  handleClick() {
    let text = this.state.text
    if (text === '') return
    this.setState({
      text: '',
      list: [...this.state.list, text]
    })
  }
  onDel(index) {
    this.setState({
      list: [...this.state.list.slice(0, index), ...this.state.list.slice(index + 1)]
    })
  }
  render() {
    let lists = this.state.list.map((item, index) => {
      return React.createElement('div', {}, item, React.createElement('button', { onClick: this.onDel.bind(this, index) }, 'x'))
    })
    let input = React.createElement('input', { onKeyup: this.onChange.bind(this), value: this.state.text })
    let button = React.createElement('button', { onClick: this.handleClick.bind(this) }, "+")
    return React.createElement('div', {}, input, button, ...lists)
  }
}

React.render(<Todos />, document.getElementById('root'))