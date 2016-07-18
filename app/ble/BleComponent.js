'use strict';

import React, { Component } from 'react';
import { connect } from 'react-redux';

import BleManager from './BleManager';
import { bleDeviceFoundAction } from './BleActions';

class BleComponent extends Component {
  componentWillMount() {
    this.manager = new BleManager();
  }

  // componentWillUnMount() {
  //   this.manager.destroyClient()
  //   delete this.manager
  // }

  render() {
    if (this.props.scanning === true) {
      this.manager.startPeripheralScan((error, peripheral) => {
        // TODO: Handle error
        this.props.peripheralScanned(peripheral)
      })
    } else {
      this.manager.stopPeripheralScan();
    }

    // if(this.props.connecting === true) {
    //   this.manager.connecToDevice(this.props.selectedDevice)
    // }

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
    peripheralScanned: (peripheral) => { dispatch(bleDeviceFoundAction.create(peripheral)) }
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(BleComponent)
