import React, { useState, type Dispatch } from 'react'
import { AppButton, AppTextInput, ScreenDefaultContainer, TestStateDisplay } from '../../../components/atoms'
import type { TextStateType } from 'example/types'
import type { MainStackParamList } from '../../../navigation'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { BLEService } from '../../../services'
import { Device, fullUUID } from 'react-native-ble-plx'

type DevicenRFTestScreenProps = NativeStackScreenProps<MainStackParamList, 'DEVICE_NRF_TEST_SCREEN'>

const deviceTimeService = fullUUID('1847')
const currentTimeCharacteristic = fullUUID('2A2B')
const deviceTimeCharacteristic = fullUUID('2B90')

export const DevicenRFTestScreen = ({ navigation }: DevicenRFTestScreenProps) => {
  const [expectedDeviceName, setExpectedDeviceName] = useState('')
  const [lookingForDevice, setLookingForDevice] = useState<TextStateType>('WAITING')
  const [deviceConnected, setDeviceConnected] = useState<TextStateType>('WAITING')
  const [discoverServicesAndCharacteristicsFound, setDiscoverServicesAndCharacteristicsFound] =
    useState<TextStateType>('WAITING')
  const [characteristicRead, setCharacteristicRead] = useState<TextStateType>('WAITING')

  const onStartHandler = () => {
    setDeviceConnected('WAITING')
    setDiscoverServicesAndCharacteristicsFound('WAITING')
    BLEService.initializeBLE().then(() => BLEService.scanDevices(onDeviceFound, [deviceTimeService]))
    setLookingForDevice('IN_PROGRESS')
  }

  const onDeviceFound = (device: Device) => {
    console.log(device.id, device.name, device.localName)
    if (device.name?.toLocaleLowerCase() === expectedDeviceName.toLocaleLowerCase()) {
      setLookingForDevice('DONE')
      startConnectToDevice(device).then(startDiscoverServicesAndCharacteristicsFound)
    }
  }

  const runTest = (functionToRun: () => Promise<any>, stateSetter: Dispatch<TextStateType>) => {
    stateSetter('IN_PROGRESS')
    return functionToRun()
      .then(() => {
        stateSetter('DONE')
      })
      .catch(() => {
        stateSetter('ERROR')
      })
  }

  const startConnectToDevice = (device: Device) =>
    runTest(() => BLEService.connectToDevice(device.id), setDeviceConnected)

  const startDiscoverServicesAndCharacteristicsFound = () =>
    runTest(BLEService.discoverServicesAndCharacteristics, setDiscoverServicesAndCharacteristicsFound)

  const startCharacteristicsRead = () =>
    runTest(BLEService.discoverServicesAndCharacteristics, setDiscoverServicesAndCharacteristicsFound)

  return (
    <ScreenDefaultContainer>
      <AppTextInput
        placeholder="Device name to connect"
        value={expectedDeviceName}
        onChangeText={setExpectedDeviceName}
      />
      <AppButton label="Start" onPress={onStartHandler} />
      <TestStateDisplay label="Looking for device" state={lookingForDevice} />
      <TestStateDisplay label="Device connected" state={deviceConnected} />
      <TestStateDisplay
        label="Discover services and characteristics found"
        state={discoverServicesAndCharacteristicsFound}
      />
    </ScreenDefaultContainer>
  )
}
