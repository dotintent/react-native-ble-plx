'use strict';

import React, { Component } from 'react';
import { connect } from 'react-redux';

import BleManager from './BleManager';
import * as ble from './BleActions';
import {Actions} from 'react-native-router-flux';
import * as SceneConst from '../scene/Const'

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
        
        var characteristics = {};
        for (let charId of characteristicsIds) {
          var characteristicDetails = await this.manager.characteristicDetails(deviceIdentifier, serviceId, charId);
          characteristics[charId] = characteristicDetails;
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
      this.props.pushError(e.message)
    }
    return null;
  }

  componentWillReceiveProps(newProps) {
    // Handle scanning
    if (newProps.scanning === true) {
      this.manager.startDeviceScan(null, (error, device) => {
        if (error) {
          newProps.pushError(error.message)
          newProps.stopScan()
          return
        }
        device['services'] = {}
        newProps.deviceFound(device)
      })
    } else {
      this.manager.stopDeviceScan();
    }

    // Handle connection state
    switch (newProps.state) {
      case ble.DEVICE_STATE_DISCONNECT:
        this.manager.closeConnection(newProps.selectedDeviceId)
        .then((successIdentifier) => {
          newProps.changeDeviceState(newProps.selectedDeviceId, ble.DEVICE_STATE_DISCONNECTED);
        }, (rejected) => {
          newProps.pushError(rejected.message)
          newProps.changeDeviceState(newProps.selectedDeviceId, ble.DEVICE_STATE_DISCONNECTED);
        });
        newProps.changeDeviceState(newProps.selectedDeviceId, ble.DEVICE_STATE_DISCONNECTING);
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
          newProps.pushError(rejected.message)
          newProps.changeDeviceState(newProps.selectedDeviceId, ble.DEVICE_STATE_DISCONNECTED);
        });

        newProps.changeDeviceState(newProps.selectedDeviceId, ble.DEVICE_STATE_CONNECTING);
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
    updateCharacteristics: ble.updateCharacteristics,
    pushError: ble.pushError
  })
(BleComponent)
