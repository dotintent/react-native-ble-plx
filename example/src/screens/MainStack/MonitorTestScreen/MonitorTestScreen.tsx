import React, { useRef, useState } from 'react'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { BleError, Characteristic, Device, type Subscription } from 'react-native-ble-plx'
import { ScrollView } from 'react-native'
import base64 from 'react-native-base64'
import type { TestStateType } from '../../../types'
import { BLEService } from '../../../services'
import type { MainStackParamList } from '../../../navigation/navigators'
import { AppButton, AppTextInput, ScreenDefaultContainer, TestStateDisplay } from '../../../components/atoms'
import { currentTimeCharacteristic, deviceTimeService } from '../../../consts/nRFDeviceConsts'

type MonitorTestScreenProps = NativeStackScreenProps<MainStackParamList, 'MONITOR_TEST_SCREEN'>

export function MonitorTestScreen(_props: MonitorTestScreenProps) {
  const [expectedDeviceName, setExpectedDeviceName] = useState('')
  const [testScanDevicesState, setTestScanDevicesState] = useState<TestStateType>('WAITING')
  const [deviceId, setDeviceId] = useState('')
  const [monitorMessages, setMonitorMessages] = useState<string[]>([])
  const monitorSubscriptionRef = useRef<Subscription | null>(null)

  const addMonitorMessage = (message: string) => setMonitorMessages(prevMessages => [...prevMessages, message])

  const checkDeviceName = (device: Device) =>
    device.name?.toLocaleLowerCase() === expectedDeviceName.toLocaleLowerCase()

  const startConnectToDevice = (device: Device) => BLEService.connectToDevice(device.id)

  const startDiscoverServices = () => BLEService.discoverAllServicesAndCharacteristicsForDevice()

  const startCharacteristicMonitor = (directDeviceId?: string) => {
    if (!deviceId && !directDeviceId) {
      console.error('Device not ready')
      return
    }
    monitorSubscriptionRef.current = BLEService.setupCustomMonitor(
      directDeviceId || deviceId,
      deviceTimeService,
      currentTimeCharacteristic,
      characteristicListener
    )
  }

  const characteristicListener = (error: BleError | null, characteristic: Characteristic | null) => {
    if (error) {
      if (error.errorCode === 302) {
        startDiscoverServices().then(() => startCharacteristicMonitor())
        return
      }
      console.error(JSON.stringify(error))
    }
    if (characteristic) {
      if (characteristic.value) {
        const message = base64.decode(characteristic.value)
        console.info(message)
        addMonitorMessage(message)
      }
    }
  }

  const startMonitor = async () => {
    setTestScanDevicesState('IN_PROGRESS')
    await BLEService.initializeBLE()
    await BLEService.scanDevices(
      async (device: Device) => {
        if (checkDeviceName(device)) {
          console.info(`connecting to ${device.id}`)
          await startConnectToDevice(device)
          setTestScanDevicesState('DONE')
          setDeviceId(device.id)
          await startDiscoverServices()
          startCharacteristicMonitor(device.id)
        }
      },
      [deviceTimeService]
    )
  }

  return (
    <ScreenDefaultContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <AppTextInput
          placeholder="Device name to connect"
          value={expectedDeviceName}
          onChangeText={setExpectedDeviceName}
        />
        <AppButton label="Connect and start Monitor" onPress={startMonitor} />
        <TestStateDisplay label="Looking for device" state={testScanDevicesState} />
        <AppButton label="Setup monitor" onPress={() => startCharacteristicMonitor()} />
        <AppButton label="Remove monitor" onPress={monitorSubscriptionRef.current?.remove} />
        <TestStateDisplay label="Message counter" value={monitorMessages.length.toString()} />
      </ScrollView>
    </ScreenDefaultContainer>
  )
}
