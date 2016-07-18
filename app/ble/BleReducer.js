'use strict';

import * as ble from './BleActions'

export default (state = { devices: [] }, action) => {
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
    case ble.CONNECT_TO_DEVICE:
      return {...state, scanning: false, connecting: true, selectedDevice: action.deviceId}
    default:
      return state;
  }
}
