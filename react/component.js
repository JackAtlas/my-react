class Component {
  constructor(props) {
    this.props = props
  }
  setState(partialState) {
    if (this._currentUnit) this._currentUnit.update(null, partialState)
  }
}

export default Component