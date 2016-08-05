'use strict';

export const START_SCAN = 'START_SCAN'
export const STOP_SCAN = 'STOP_SCAN'
export const DEVICE_FOUND = 'DEVICE_FOUND'
export const CHANGE_DEVICE_STATE = 'CHANGE_DEVICE_STATE'
export const WRITE_CHARACTERISTIC = 'WRITE_CHARACTERISTIC'
export const READ_CHARACTERISTIC = 'READ_CHARACTERISTIC'
export const NOTIFY_CHARACTERISTIC = 'NOTIFY_CHARACTERISTIC'
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

export function updateServices(deviceId, services) {
  return {
    type: UPDATE_SERVICES,
    deviceId: deviceId,
    services: services,
  }
}

export function updateCharacteristic(deviceId, serviceId, characteristicId, characteristic) {
  return {
    type: UPDATE_CHARACTERISTIC,
    deviceId,
    serviceId,
    characteristicId,
    characteristic
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

export function notifyCharacteristic(deviceId, serviceId, characteristicId, notify, transactionId) {
  return {
    type: NOTIFY_CHARACTERISTIC,
    deviceId,
    serviceId,
    characteristicId,
    notify,
    transactionId
  }
}

export const DEVICE_STATE_DISCONNECT = 'DISCONNECT'
export const DEVICE_STATE_DISCONNECTING = 'DISCONNECTING'
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

export function selectCharacteristic(deviceId, serviceId, characteristicId) {
  return {
    type: SELECT_CHARACTERISTIC,
    deviceId: deviceId,
    serviceId: serviceId,
    characteristicId: characteristicId
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
    transactionId
  }
}

export function completeTransaction(transactionId) {
  return {
    type: COMPLETE_TRANSACTION,
    transactionId
  }
}