// @flow

import { Device, Characteristic } from 'react-native-ble-plx'
import type { DeviceState } from './BleState'

export type StartScan = {|
  type: 'START_SCAN'
|}

export function startScan(): StartScan {
  return {
    type: 'START_SCAN'
  }
}

export type StopScan = {|
  type: 'STOP_SCAN'
|}

export function stopScan(): StopScan {
  return {
    type: 'STOP_SCAN'
  }
}

export type DeviceFound = {|
  type: 'DEVICE_FOUND',
  device: Device
|}

export function deviceFound(device: Device): DeviceFound {
  return {
    type: 'DEVICE_FOUND',
    device
  }
}

export type ChangeSelectedDeviceState = {|
  type: 'CHANGE_SELECTED_DEVICE_STATE',
  device: ?Device,
  state: ?DeviceState
|}

export function changeSelectedDeviceState(device: ?Device, state: ?DeviceState): ChangeSelectedDeviceState {
  return {
    type: 'CHANGE_SELECTED_DEVICE_STATE',
    device,
    state
  }
}

export type ReadCharacteristic = {|
  type: 'READ_CHARACTERISTIC',
  characteristic: Characteristic
|}

export function readCharacteristic(characteristic: Characteristic): ReadCharacteristic {
  return {
    type: 'READ_CHARACTERISTIC',
    characteristic
  }
}

export type MonitorCharacteristic = {|
  type: 'MONITOR_CHARACTERISTIC',
  characteristic: Characteristic,
  monitor: boolean
|}

export function monitorCharacteristic(characteristic: Characteristic, monitor: boolean): MonitorCharacteristic {
  return {
    type: 'MONITOR_CHARACTERISTIC',
    characteristic,
    monitor
  }
}

export type SelectService = {|
  type: 'SELECT_SERVICE',
  deviceID: string,
  serviceID: string
|}

export function selectService(deviceID: string, serviceID: string): SelectService {
  return {
    type: 'SELECT_SERVICE',
    deviceID,
    serviceID
  }
}

export type SelectCharacteristic = {|
  type: 'SELECT_CHARACTERISTIC',
  deviceID: string,
  serviceID: string,
  characteristicID: string
|}

export function selectCharacteristic(
  deviceID: string,
  serviceID: string,
  characteristicID: string
): SelectCharacteristic {
  return {
    type: 'SELECT_CHARACTERISTIC',
    deviceID,
    serviceID,
    characteristicID
  }
}

export type PushError = {|
  type: 'PUSH_ERROR',
  errorMessage: string
|}

export function pushError(errorMessage: string): PushError {
  return {
    type: 'PUSH_ERROR',
    errorMessage
  }
}

export type PopError = {|
  type: 'POP_ERROR'
|}

export function popError(): PopError {
  return {
    type: 'POP_ERROR'
  }
}

export type BleAction =
  | StartScan
  | StopScan
  | DeviceFound
  | ChangeSelectedDeviceState
  | ReadCharacteristic
  | MonitorCharacteristic
  | SelectService
  | SelectCharacteristic
  | PushError
  | PopError
