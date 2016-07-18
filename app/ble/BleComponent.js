'use strict';

import React, { Component } from 'react';
import { connect } from 'react-redux';

import BleManager from './BleManager';
import { deviceFound } from './BleActions';

class BleComponent extends Component {
  componentWillMount() {
    this.manager = new BleManager();
  }

  componentWillUnmount() {
    this.manager.destroy();
    delete this.manager;
  }

  render() {
    if (this.props.scanning === true) {
      this.manager.startDeviceScan((error, device) => {
        // TODO: Handle error
        this.props.deviceFound(device)
      })
    } else {
      this.manager.stopDeviceScan();
    }

    // if(this.props.connecting === true) {
    //   this.manager.connecToDevice(this.props.selectedDevice)
    // }

    return null;
  }
}

export default connect(
  state => ({
    scanning: state.ble.scanning
  }),
  {
    deviceFound
  })
(BleComponent)
