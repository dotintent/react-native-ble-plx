'use strict';

export const START_SCAN = 'START_SCAN'
export const STOP_SCAN = 'STOP_SCAN'
export const DEVICE_FOUND = 'DEVICE_FOUND'
export const CHANGE_DEVICE_STATE = 'CHANGE_DEVICE_STATE'
export const WRITE_CHARACTERISTIC = 'WRITE_CHARACTERISTIC'
export const READ_CHARACTERISTIC = 'READ_CHARACTERISTIC'
export const UPDATE_SERVICES = 'UPDATE_SERVICES'
export const SELECT_SERVICE = 'SELECT_SERVICE'

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

export function updateServices(deviceId, services) {
  return {
    type: UPDATE_SERVICES,
    deviceId: deviceId,
    services: services,
  }
}

export function writeCharacteristic(deviceId, serviceId, characteristicId, base64Value, transactionId) {
  return {
    type: WRITE_CHARACTERISTIC,
    deviceId: deviceId,
    serviceId: serviceId,
    characteristicId: characteristicId,
    base64Value: base64Value,
    transactionId: transactionId
  }
}

export function readCharacteristic(deviceId, serviceId, characteristicId, transactionId) {
  return {
    type: READ_CHARACTERISTIC,
    deviceId: deviceId,
    serviceId: serviceId,
    characteristicId: characteristicId,
    transactionId: transactionId
  }
}

export const DEVICE_STATE_DISCONNECTED = 'DISCONNECTED'
export const DEVICE_STATE_CONNECT = 'CONNECT'
export const DEVICE_STATE_CONNECTING = 'CONNECTING'
export const DEVICE_STATE_CONNECTED = 'CONNECTED'

export function changeDeviceState(deviceId, state) {
  return {
    type: CHANGE_DEVICE_STATE,
    deviceId: deviceId,
    state: state
  }
}

export function selectService(deviceId, serviceId) {
  return {
    type: SELECT_SERVICE,
    deviceId: deviceId,
    serviceId: serviceId
  }
}
