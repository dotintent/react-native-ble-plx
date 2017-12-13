// @flow

import type { devices } from './BleTypes'

export type bleState = {
  devices: devices,
  selectedDeviceUUID: ?string,
  selectedServiceUUID: ?string,
  selectedCharacteristicUUID: ?string,
  scanning: boolean,
  errors: string[],
  state: deviceState,
  operations: operations,
  operationId: ?string
}

export type deviceState =
  | 'DISCONNECT'
  | 'DISCONNECTING'
  | 'DISCONNECTED'
  | 'CONNECT'
  | 'CONNECTING'
  | 'DISCOVERING'
  | 'FETCHING SERVICES AND CHARACTERISTICS'
  | 'CONNECTED'

export type operations = {
  [operationId: string]: operation
}

export type operation = {|
  type: operationType,
  state: operationState,
  deviceUUID: string,
  serviceUUID: string,
  characteristicUUID: string,
  base64Value: ?string,
  operationId: string
|}

export type operationType = 'WRITE' | 'READ' | 'MONITOR'

export type operationState = 'NEW' | 'IN_PROGRESS' | 'CANCEL'
