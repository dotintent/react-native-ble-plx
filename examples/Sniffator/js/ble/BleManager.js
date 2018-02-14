// @flow

import { BleManager, type UUID, type Device } from 'react-native-ble-plx'
import * as ba from './BleActions'
import type { BleState } from './BleState'

const manager = new BleManager()

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
    let device: Device = getState().devices[deviceIdentifier]
    if (device == null) {
      dispatch(ba.pushError('Failed to connect to device: device not found.'))
    }

    try {
      dispatch(ba.changeSelectedDeviceState(device, 'CONNECTING'))
      let connectedDevice = await manager.connectToDevice(deviceIdentifier)

      dispatch(ba.changeSelectedDeviceState(connectedDevice, 'DISCOVERING SERVICES AND CHARACTERISTICS'))
      let discoveredDevice = await connectedDevice.discoverAllServicesAndCharacteristics()

      dispatch(ba.changeSelectedDeviceState(discoveredDevice, 'CONNECTED'))
    } catch (error) {
      dispatch(ba.changeSelectedDeviceState(null, null))
      dispatch(ba.pushError(error))
      manager.cancelDeviceConnection(deviceIdentifier)
    }
  }
}

export const disconnectFromDevice = (deviceIdentifier: string) => {
  return async (dispatch: Dispatch, getState: GetState) => {
    let selected = getState().selectedDeviceID == deviceIdentifier
    if (selected) {
      dispatch(ba.changeSelectedDeviceState(null, null))
    }
    await manager.cancelDeviceConnection(deviceIdentifier)
  }
}

export const writeCharacteristic = (
  deviceIdentifier: string,
  serviceUUID: string,
  characteristicUUID: string,
  base64Value: string
) => {
  return async (dispatch: Dispatch) => {
    try {
      await manager.writeCharacteristicWithResponseForDevice(
        deviceIdentifier,
        serviceUUID,
        characteristicUUID,
        base64Value
      )
    } catch (error) {
      dispatch(ba.pushError(error))
    }
  }
}

export const readCharacteristic = (deviceIdentifier: string, serviceUUID: string, characteristicUUID: string) => {
  return async (dispatch: Dispatch) => {
    try {
      let characteristic = await manager.readCharacteristicForDevice(deviceIdentifier, serviceUUID, characteristicUUID)
      dispatch(ba.readCharacteristic(characteristic))
    } catch (error) {
      dispatch(ba.pushError(error))
    }
  }
}
