'use strict';

import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import BleManager from './BleManager';
import { deviceFound } from './BleActions';

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

function mapStateToProps(state) {
  return {
    scanning: state.ble.scanning
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({ deviceFound }, dispatch)
}

export default connect(mapStateToProps, mapDispatchToProps)(BleComponent)
