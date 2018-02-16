// @flow

import { BleManager } from 'react-native-ble-plx'
import type { UUID, Device, Service, Characteristic } from 'react-native-ble-plx'
import * as ba from './BleActions'
import type { BleState, DeviceWithServices, ServiceWithCharacteristics } from './BleState'

const manager = new BleManager()
// TODO: handle manager 'UNKNOWN' state (on iOS it lasts ~1s after app launch) which makes impossible to use ble
// all apis work when manager.state() == 'PoweredOn'
// consider using manager.onStateChange()

type Dispatch = (action: ba.BleAction) => ba.BleAction
type GetState = () => BleState

export const startScanning = (uuids: ?Array<UUID>) => {
  return (dispatch: Dispatch) => {
    dispatch(ba.startScan())
    manager.startDeviceScan(uuids, null, (error, scannedDevice) => {
      if (error != null) {
        dispatch(ba.stopScan())
        dispatch(ba.pushError(error.message))
        return
      }
      dispatch(ba.deviceFound(scannedDevice))
    })
  }
}

export const stopScanning = () => {
  return (dispatch: Dispatch) => {
    manager.stopDeviceScan()
    dispatch(ba.stopScan())
  }
}

export const connectToDevice = (deviceIdentifier: string) => {
  return async (dispatch: Dispatch, getState: GetState) => {
    let deviceWithServices: DeviceWithServices = getState().devices[deviceIdentifier]
    if (deviceWithServices == null) {
      dispatch(ba.pushError('Failed to connect to device: device not found.'))
    }
    let device = deviceWithServices.device

    dispatch(ba.changeSelectedDeviceState(device, 'CONNECTING'))
    let connectedDevice = await manager.connectToDevice(deviceIdentifier)
    const subscription = connectedDevice.onDisconnected((error, disconnectedDevice) => {
      subscription.remove()
      if (error != null) {
        dispatch(ba.pushError(error))
      }
      dispatch(ba.changeSelectedDeviceState(disconnectedDevice, 'DISCONNECTED'))
    })

    try {
      dispatch(ba.changeSelectedDeviceState(connectedDevice, 'DISCOVERING'))
      let discoveredDevice = await connectedDevice.discoverAllServicesAndCharacteristics()
      dispatch(ba.changeSelectedDeviceState(discoveredDevice, 'FETCHING SERVICES AND CHARACTERISTICS'))
      let fetchedDevice = await fetchServicesAndCharacteristicsForDevice(discoveredDevice)
      dispatch(ba.fetchedServicesAndCharacteristics(fetchedDevice))
      dispatch(ba.changeSelectedDeviceState(fetchedDevice.device, 'CONNECTED'))
    } catch (error) {
      dispatch(ba.changeSelectedDeviceState(null, null))
      dispatch(ba.pushError(error))

      try {
        await manager.cancelDeviceConnection(deviceIdentifier)
      } catch (error) {
        dispatch(ba.pushError(error))
      }
    }
  }
}

const fetchServicesAndCharacteristicsForDevice = async (device: Device): Promise<DeviceWithServices> => {
  let deviceWithServices: DeviceWithServices = { device, services: [] }
  let services: Service[] = await device.services()
  for (var service: Service of services) {
    let serviceWithCharacteristics: ServiceWithCharacteristics = { service, characteristics: [] }
    let characteristics: Characteristic[] = await service.characteristics()
    for (var characteristic: Characteristic of characteristics) {
      serviceWithCharacteristics.characteristics.push(characteristic)
    }
    deviceWithServices.services.push(serviceWithCharacteristics)
  }
  return deviceWithServices
}

export const disconnectFromDevice = (deviceIdentifier: string) => {
  return async (dispatch: Dispatch, getState: GetState) => {
    let selected = getState().selectedDeviceID == deviceIdentifier
    if (selected) {
      dispatch(ba.changeSelectedDeviceState(null, null))
    }

    // TODO: check how redux-thunk handles uncatched error
    await manager.cancelDeviceConnection(deviceIdentifier)
  }
}

export const writeCharacteristic = (characteristic: Characteristic, base64Value: string) => {
  return async (dispatch: Dispatch) => {
    try {
      if (characteristic.isWritableWithResponse) {
        await characteristic.writeWithResponse(base64Value)
      } else {
        await characteristic.writeWithoutResponse(base64Value)
      }
    } catch (error) {
      dispatch(ba.pushError(error))
    }
  }
}

export const readCharacteristic = (characteristic: Characteristic) => {
  return async (dispatch: Dispatch) => {
    try {
      let characteristicAfterRead: Characteristic = await characteristic.read()
      dispatch(ba.readCharacteristic(characteristicAfterRead))
    } catch (error) {
      dispatch(ba.pushError(error))
    }
  }
}
