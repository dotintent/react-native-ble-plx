// @flow

import { Device, Service, Characteristic } from 'react-native-ble-plx'

export type BleState = {
  devices: Devices,
  selectedDeviceID: ?string,
  selectedServiceID: ?string,
  selectedCharacteristicID: ?string,
  scanning: boolean,
  selectedDeviceState: ?DeviceState,
  errors: string[]
}

export type Devices = {
  [id: string]: DeviceWithServices
}

export type DeviceWithServices = {
  device: Device,
  services: ServiceWithCharacteristics[]
}

export type ServiceWithCharacteristics = {
  service: Service,
  characteristics: Characteristic[]
}

export type DeviceState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'DISCOVERING'
  | 'FETCHING SERVICES AND CHARACTERISTICS'
  | 'CONNECTED'
