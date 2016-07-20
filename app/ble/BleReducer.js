'use strict';

import * as ble from './BleActions'

const defaultState = {
  devices: [],
  services: [],
  state: ble.DEVICE_STATE_DISCONNECTED
};

export default (state = defaultState, action) => {
  switch (action.type) {
    case ble.START_SCAN:
      return {...state, scanning: true}
    case ble.STOP_SCAN:
      return {...state, scanning: false}
    case ble.DEVICE_FOUND: {
      var found = false;
      var devices = state.devices.map((device) => {
      if (device.uuid !== action.device.uuid) {
        return device
      } else {
        found = true;
        return action.device;
      }});
      devices = !found ? devices.concat([action.device]) : devices;
      return {...state, devices: devices };
    }
    case ble.CHANGE_DEVICE_STATE:
      return {...state, scanning: false, state: action.state, selectedDevice: action.deviceId}
    case ble.UPDATE_SERVICES:
      const resultServices = action.services.map(service => ({
        uuid: service,
        characteristicsCount: 0,
        isPrimary: false
      }));
      return {...state, services: resultServices}
    case ble.WRITE_CHARACTERISTIC:
      return {...state, writing: true,
              deviceId: action.deviceId,
              serviceId: action.serviceId,
              characteristicId: action.characteristicId,
              value: action.base64Value,
              transactionId: action.transactionId}
    case ble.READ_CHARACTERISTIC:
      return {...state, reading: true,
              deviceId: action.deviceId,
              serviceId: action.serviceId,
              characteristicId: action.characteristicId,
              transactionId: action.transactionId}
    default:
      return state;
  }
}
