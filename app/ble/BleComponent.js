'use strict';

import React, { Component } from 'react';
import { connect } from 'react-redux';

import BleManager from './BleManager';
import * as ble from './BleActions';
import {Actions} from 'react-native-router-flux';

class BleComponent extends Component {
  componentWillMount() {
    this.manager = new BleManager();
  }

  componentWillUnmount() {
    this.manager.destroy();
    delete this.manager;
  }

  componentWillReceiveProps(props) {
    // Handle scanning
    if (props.scanning === true) {
      this.manager.startDeviceScan((error, device) => {
        // TODO: Handle error
        props.deviceFound(device)
      })
    } else {
      this.manager.stopDeviceScan();
    }

    switch (props.state) {
      case ble.DEVICE_STATE_DISCONNECTED:
        // TODO
        break;
      case ble.DEVICE_STATE_CONNECT:
        this.manager.connectToDevice(props.selectedDevice)
        .then((success) => {
          props.changeDeviceState(props.selectedDevice, ble.DEVICE_STATE_CONNECTED);
        }, (rejected) => {
          // TODO: Handle error
          props.changeDeviceState(props.selectedDevice, ble.DEVICE_STATE_DISCONNECTED);
        })
        props.changeDeviceState(props.selectedDevice, ble.DEVICE_STATE_CONNECTING);
        Actions.services();
        break;
      case ble.DEVICE_STATE_CONNECTING:
        break;
      case ble.DEVICE_STATE_CONNECTED:
        props.changeDeviceState(props.selectedDevice, ble.DEVICE_STATE_DISCOVER_SERVICES);
        break;
      case ble.DEVICE_STATE_DISCOVER_SERVICES:
        this.manager.discoverServices(props.selectedDevice)
        .then((success) => {
          props.changeDeviceState(props.selectedDevice, ble.DEVICE_STATE_DISCOVERED_SERVICES);
        }, (rejected) => {
          //TODO: Handle
        })
        props.changeDeviceState(props.selectedDevice, ble.DEVICE_STATE_DISCOVERING_SERVICES);
        break;
      case ble.DEVICE_STATE_DISCOVERING_SERVICES:
        break;
      case ble.DEVICE_STATE_DISCOVERED_SERVICES:
        break;
    }
  }

  render() {
    return null;
  }
}

export default connect(
  state => ({
    scanning: state.ble.scanning,
    state: state.ble.state,
    selectedDevice: state.ble.selectedDevice
  }),
  {
    deviceFound: ble.deviceFound,
    changeDeviceState: ble.changeDeviceState
  })
(BleComponent)
