'use strict';

export const START_SCAN = 'START_SCAN'
export const STOP_SCAN = 'STOP_SCAN'
export const DEVICE_FOUND = 'DEVICE_FOUND'
export const CHANGE_DEVICE_STATE = 'CHANGE_DEVICE_STATE'

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

export const DEVICE_STATE_DISCONNECTED = 'DISCONNECTED'
export const DEVICE_STATE_CONNECT = 'CONNECT'
export const DEVICE_STATE_CONNECTING = 'CONNECTING'
export const DEVICE_STATE_CONNECTED = 'CONNECTED'
export const DEVICE_STATE_DISCOVER_SERVICES = 'DISCOVER'
export const DEVICE_STATE_DISCOVERING_SERVICES = 'DISCOVERING'
export const DEVICE_STATE_DISCOVERED_SERVICES = 'DISCOVERED'

export function changeDeviceState(deviceId, state) {
  return {
    type: CHANGE_DEVICE_STATE,
    deviceId: deviceId,
    state: state
  }
}
