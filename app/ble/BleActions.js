'use strict';

export const START_SCAN = 'START_SCAN'
export const STOP_SCAN = 'STOP_SCAN'
export const DEVICE_FOUND = 'DEVICE_FOUND'
export const CONNECT_TO_DEVICE = 'CONNECT_TO_DEVICE'

export function startScan() {
  return {
    type: START_SCAN
  }
}

export function stopScan() {
  return {
    type: STOP_SCAN
  }
}

export function deviceFound(device) {
  return {
    type: DEVICE_FOUND,
    device: device
  }
}

export function connectToDevice(deviceId) {
  return {
    type: CONNECT_TO_DEVICE,
    deviceId: deviceId
  }
}
