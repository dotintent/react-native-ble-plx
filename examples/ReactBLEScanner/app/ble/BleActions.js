'use strict';

export const START_SCAN = 'START_SCAN'
export const STOP_SCAN = 'STOP_SCAN'
export const DEVICE_FOUND = 'DEVICE_FOUND'
export const CHANGE_DEVICE_STATE = 'CHANGE_DEVICE_STATE'
export const WRITE_CHARACTERISTIC = 'WRITE_CHARACTERISTIC'
export const READ_CHARACTERISTIC = 'READ_CHARACTERISTIC'
export const MONITOR_CHARACTERISTIC = 'NOTIFY_CHARACTERISTIC'
export const UPDATE_SERVICES = 'UPDATE_SERVICES'
export const UPDATE_CHARACTERISTIC = 'UPDATE_CHARACTERISTIC'
export const SELECT_SERVICE = 'SELECT_SERVICE'
export const SELECT_CHARACTERISTIC = 'SELECT_CHARACTERISTIC'
export const PUSH_ERROR = 'PUSH_ERROR'
export const POP_ERROR = 'POP_ERROR'
export const EXECUTE_TRANSACTION = 'EXECUTE_TRANSACTION'
export const COMPLETE_TRANSACTION = 'COMPLETE_TRANSACTION'

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

export function updateServices(deviceIdentifier, services) {
  return {
    type: UPDATE_SERVICES,
    deviceIdentifier: deviceIdentifier,
    services: services,
  }
}

export function updateCharacteristic(deviceIdentifier, serviceUUID, characteristicUUID, characteristic) {
  return {
    type: UPDATE_CHARACTERISTIC,
    deviceIdentifier,
    serviceUUID,
    characteristicUUID,
    characteristic
  }
}

export function writeCharacteristic(deviceIdentifier, serviceUUID, characteristicUUID, base64Value) {
  return {
    type: WRITE_CHARACTERISTIC,
    deviceIdentifier: deviceIdentifier,
    serviceUUID: serviceUUID,
    characteristicUUID: characteristicUUID,
    base64Value: base64Value 
  }
}

export function readCharacteristic(deviceIdentifier, serviceUUID, characteristicUUID) {
  return {
    type: READ_CHARACTERISTIC,
    deviceIdentifier: deviceIdentifier,
    serviceUUID: serviceUUID,
    characteristicUUID: characteristicUUID 
  }
}

export function monitorCharacteristic(deviceIdentifier, serviceUUID, characteristicUUID, monitor) {
  return {
    type: MONITOR_CHARACTERISTIC,
    deviceIdentifier,
    serviceUUID,
    characteristicUUID,
    monitor
  }
}

export const DEVICE_STATE_DISCONNECT = 'DISCONNECT'
export const DEVICE_STATE_DISCONNECTING = 'DISCONNECTING'
export const DEVICE_STATE_DISCONNECTED = 'DISCONNECTED'
export const DEVICE_STATE_CONNECT = 'CONNECT'
export const DEVICE_STATE_CONNECTING = 'CONNECTING'
export const DEVICE_STATE_DISCOVERING = 'DISCOVERING'
export const DEVICE_STATE_FETCHING = 'FETCHING SERVICES AND CHARACTERISTICS'
export const DEVICE_STATE_CONNECTED = 'CONNECTED'

export function changeDeviceState(deviceIdentifier, state) {
  return {
    type: CHANGE_DEVICE_STATE,
    deviceIdentifier: deviceIdentifier,
    state: state
  }
}

export function selectService(deviceIdentifier, serviceUUID) {
  return {
    type: SELECT_SERVICE,
    deviceIdentifier: deviceIdentifier,
    serviceUUID: serviceUUID
  }
}

export function selectCharacteristic(deviceIdentifier, serviceUUID, characteristicUUID) {
  return {
    type: SELECT_CHARACTERISTIC,
    deviceIdentifier: deviceIdentifier,
    serviceUUID: serviceUUID,
    characteristicUUID: characteristicUUID
  }
}

export function pushError(errorMessage) {
  return {
    type: PUSH_ERROR,
    errorMessage
  }
}

export function popError() {
  return {
    type: POP_ERROR,
  }
}

export function executeTransaction(transactionId) {
  return {
    type: EXECUTE_TRANSACTION,
    transactionId,
  }
}

export function completeTransaction(transactionId) {
  return {
    type: COMPLETE_TRANSACTION,
    transactionId
  }
}