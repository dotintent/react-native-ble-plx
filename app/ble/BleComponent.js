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
      //this.manager.startDeviceScan(["53bc4f57-545f-4881-9dfc-69d319695571"], (error, device) => {
      this.manager.startDeviceScan(null, (error, device) => {
        if (error) {
          console.log("Cannot scan devices: " + error.message)
          props.stopScan()
          return
        }
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
          return this.manager.servicesForDevice(props.selectedDevice)
        })
        .then((services) => {
          props.changeDeviceState(props.selectedDevice, ble.DEVICE_STATE_CONNECTED);
          props.updateServices(props.selectedDevice, services)
        }, (rejected) => {
          // TODO: Handle error
          props.changeDeviceState(props.selectedDevice, ble.DEVICE_STATE_DISCONNECTED);
        })

        props.changeDeviceState(props.selectedDevice, ble.DEVICE_STATE_CONNECTING);
        Actions.services();
        break;
      case ble.DEVICE_STATE_CONNECTED:
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
    changeDeviceState: ble.changeDeviceState,
    servicesForDevice: ble.servicesForDevice,
    stopScan: ble.stopScan,
    updateServices: ble.updateServices
  })
(BleComponent)
