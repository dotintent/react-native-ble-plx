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

  async allCharacteristicsForServices(deviceIdentifier, serviceIds) {
    try {
      var resultServices = {};
      for (let serviceId of serviceIds) {
        var characteristicsIds = await this.manager.characteristicIdsForDevice(deviceIdentifier, serviceId);
        console.log("CHARS: " + characteristicsIds + " LEN: " + characteristicsIds.length);
        var characteristics = {};
        for (let charId of characteristicsIds) {
          characteristics[charId] = {
            "uuid": charId
          }
        }
        resultServices[serviceId] = {
            "uuid" : serviceId,
            "isPrimary": false,
            "characteristicsCount": characteristicsIds.length,
            "characteristics" : characteristics
        };
      }
      return resultServices;
    } catch (e) {
      console.log('Error: ' + e);
    }
    return null;
  }

  componentWillReceiveProps(newProps) {
    // Handle scanning
    if (newProps.scanning === true) {
      //this.manager.startDeviceScan(["53bc4f57-545f-4881-9dfc-69d319695571"], (error, device) => {
      this.manager.startDeviceScan(null, (error, device) => {
        if (error) {
          console.log("Cannot scan devices: " + error.message)
          newProps.stopScan()
          return
        }
        device['services'] = {}
        newProps.deviceFound(device)
      })
    } else {
      this.manager.stopDeviceScan();
    }

    switch (newProps.state) {
      case ble.DEVICE_STATE_DISCONNECTED:
        // TODO
        break;
      case ble.DEVICE_STATE_CONNECT:
        this.manager.connectToDevice(newProps.selectedDeviceId)
        .then((success) => {
          return this.manager.serviceIdsForDevice(newProps.selectedDeviceId)
        })
        .then((serviceIds) => {
          return this.allCharacteristicsForServices(newProps.selectedDeviceId, serviceIds);
        })
        .then((services) => {
          newProps.updateServices(newProps.selectedDeviceId, services);
          newProps.changeDeviceState(newProps.selectedDeviceId, ble.DEVICE_STATE_CONNECTED);
        }, 
        (rejected) => {
          // TODO: Handle error
          console.log('ERROR: ' + rejected.message);
          newProps.changeDeviceState(newProps.selectedDeviceId, ble.DEVICE_STATE_DISCONNECTED);
        })

        newProps.changeDeviceState(newProps.selectedDeviceId, ble.DEVICE_STATE_CONNECTING);
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
    scanning: state.getIn(['ble', 'scanning']),
    state: state.getIn(['ble', 'state']),
    selectedDeviceId: state.getIn(['ble', 'selectedDeviceId'])
  }),
  {
    deviceFound: ble.deviceFound,
    changeDeviceState: ble.changeDeviceState,
    serviceIdsForDevice: ble.serviceIdsForDevice,
    stopScan: ble.stopScan,
    updateServices: ble.updateServices,
    updateCharacteristics: ble.updateCharacteristics
  })
(BleComponent)
