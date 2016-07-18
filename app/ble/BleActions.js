'use strict';

let BLE_START_SCAN_ACTION = 'BLE_START_SCAN_ACTION'
let BLE_STOP_SCAN_ACTION = 'BLE_STOP_SCAN_ACTION'
let BLE_DEVICE_FOUND_ACTION = 'BLE_DEVICE_FOUND_ACTION'
let BLE_DEVICE_CONNECT_ACTION = 'BLE_DEVICE_CONNECT_ACTION'

export const bleStartScanAction = {
  create: () => {
    return {
      type: BLE_START_SCAN_ACTION
    }
  },
  type: BLE_START_SCAN_ACTION
}

export const bleStopScanAction = {
  create: () => {
    return {
      type: BLE_STOP_SCAN_ACTION
    }
  },
  type: BLE_STOP_SCAN_ACTION
}

export const bleDeviceFoundAction = {
  create: (device) => {
    return {
      type: BLE_DEVICE_FOUND_ACTION,
      peripheral: device
    }
  },
  type: BLE_DEVICE_FOUND_ACTION
}

export const bleDeviceConnectAction = {
  create: (deviceId) => {
    return {
      type: BLE_DEVICE_CONNECT_ACTION,
      deviceId: deviceId
    }
  },
  type: BLE_DEVICE_CONNECT_ACTION
}
