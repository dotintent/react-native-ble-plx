import React, { Component } from 'react';
import { connect } from 'react-redux';

import BleManager from './BleManager';
import { blePeripheralFoundAction } from './BleActions';

class BleComponent extends Component {
  componentWillMount() {
    this.manager = new BleManager();
  }

  render() {
    if (this.props.scanning === true) {
      this.manager.startPeripheralScan((error, peripheral) => {
        // TODO: Handle error
        this.props.peripheralScanned(peripheral)
      })
    }

    if (this.props.scanning === false) {
      this.manager.stopPeripheralScan();
    }

    return null;
  }
}

function mapStateToProps(state) {
  return {
    scanning: state.ble.scanning
  }
}

function mapDispatchToProps(dispatch) {
  return {
    peripheralScanned: (peripheral) => { dispatch(blePeripheralFoundAction.create(peripheral)) }
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(BleComponent)
