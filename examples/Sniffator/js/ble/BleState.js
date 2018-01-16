// @flow

import { Device } from 'react-native-ble-plx'

export type BleState = {
  devices: Devices,
  selectedDeviceID: ?string,
  selectedServiceID: ?string,
  selectedCharacteristicID: ?string,
  scanning: boolean,
  selectedDeviceState: ?DeviceState,
  errors: string[]
}

type Devices = {
  [id: string]: Device
}

export type DeviceState =
  | 'CONNECTING'
  | 'DISCOVERING SERVICES AND CHARACTERISTICS'
  | 'CONNECTED'
