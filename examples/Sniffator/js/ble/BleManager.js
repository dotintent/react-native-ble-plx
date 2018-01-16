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
    // add device not found error
    let device: Device = getState().devices[deviceIdentifier]
    debugger
    dispatch(ba.changeSelectedDeviceState(device, 'CONNECTING'))
    device = await manager.connectToDevice(deviceIdentifier)
    debugger
    dispatch(ba.changeSelectedDeviceState(device, 'DISCOVERING SERVICES AND CHARACTERISTICS'))
    await device.discoverAllServicesAndCharacteristics()
    debugger
    dispatch(ba.changeSelectedDeviceState(device, 'CONNECTED'))
  }
}
