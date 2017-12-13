// @flow

import * as bt from './BleTypes'
import type { deviceState } from './BleState'

export type startScan = {|
  type: 'START_SCAN'
|}

export type stopScan = {|
  type: 'STOP_SCAN'
|}

export type deviceFound = {|
  type: 'DEVICE_FOUND',
  device: bt.device
|}

export type changeDeviceState = {|
  type: 'CHANGE_DEVICE_STATE',
  deviceUUID: string,
  state: deviceState
|}

export type updateServices = {|
  type: 'UPDATE_SERVICES',
  deviceUUID: string,
  services: bt.services
|}

export type updateCharacteristics = {|
  type: 'UPDATE_CHARACTERISTICS',
  deviceUUID: string,
  serviceUUID: string,
  characteristics: bt.characteristics
|}

export type writeCharacteristic = {|
  type: 'WRITE_CHARACTERISTIC',
  deviceUUID: string,
  serviceUUID: string,
  characteristicUUID: string,
  base64Value: string
|}

export type readCharacteristic = {|
  type: 'READ_CHARACTERISTIC',
  deviceUUID: string,
  serviceUUID: string,
  characteristicUUID: string
|}

export type monitorCharacteristic = {|
  type: 'MONITOR_CHARACTERISTIC',
  deviceUUID: string,
  serviceUUID: string,
  characteristicUUID: string,
  monitor: boolean
|}

export type selectService = {|
  type: 'SELECT_SERVICE',
  deviceUUID: string,
  serviceUUID: string
|}

export type selectCharacteristic = {|
  type: 'SELECT_CHARACTERISTIC',
  deviceUUID: string,
  serviceUUID: string,
  characteristicUUID: string
|}

export type pushError = {|
  type: 'PUSH_ERROR',
  errorMessage: string
|}

export type popError = {|
  type: 'POP_ERROR'
|}

export type executeTransaction = {|
  type: 'EXECUTE_TRANSACTION',
  operationId: string
|}

export type completeTransaction = {|
  type: 'COMPLETE_TRANSACTION',
  operationId: string
|}

export type bleAction =
  | startScan
  | stopScan
  | deviceFound
  | changeDeviceState
  | updateServices
  | updateCharacteristics
  | writeCharacteristic
  | readCharacteristic
  | monitorCharacteristic
  | selectService
  | selectCharacteristic
  | pushError
  | popError
  | executeTransaction
  | completeTransaction
