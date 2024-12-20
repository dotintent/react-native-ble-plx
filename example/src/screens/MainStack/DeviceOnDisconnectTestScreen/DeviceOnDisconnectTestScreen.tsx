import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { BleError, Device, type Subscription, type DeviceId } from 'react-native-ble-plx'
import { ScrollView } from 'react-native'
import Toast from 'react-native-toast-message'
import { wait } from '../../../utils/wait'
import type { TestStateType } from '../../../types'
import { BLEService, usePersistentDeviceName } from '../../../services'
import type { MainStackParamList } from '../../../navigation/navigators'
import { AppButton, AppTextInput, ScreenDefaultContainer, TestStateDisplay } from '../../../components/atoms'
import { deviceTimeService } from '../../../consts/nRFDeviceConsts'

type DeviceOnDisconnectTestScreenProps = NativeStackScreenProps<MainStackParamList, 'DEVICE_ON_DISCONNECT_TEST_SCREEN'>

export function DeviceOnDisconnectTestScreen(_props: DeviceOnDisconnectTestScreenProps) {
  const [expectedDeviceName, setExpectedDeviceName] = usePersistentDeviceName()
  const [testScanDevicesState, setTestScanDevicesState] = useState<TestStateType>('WAITING')
  const [deviceId, setDeviceId] = useState('')
  const [currentTest, setCurrentTest] = useState<null | 'disconnectByDevice' | 'disconnectByPLX'>(null)
  const onDisconnectRef = useRef<Subscription | null>(null)

  const checkDeviceName = (device: Device) =>
    device.name?.toLocaleLowerCase() === expectedDeviceName?.toLocaleLowerCase()

  const connectAndDiscover = async () => {
    setTestScanDevicesState('IN_PROGRESS')
    await BLEService.initializeBLE()
    await BLEService.scanDevices(
      async (device: Device) => {
        if (checkDeviceName(device)) {
          console.info(`connecting to ${device.id}`)
          await startConnectToDevice(device)
          await BLEService.discoverAllServicesAndCharacteristicsForDevice()
          setTestScanDevicesState('DONE')
          setDeviceId(device.id)
        }
      },
      [deviceTimeService]
    )
  }

  const startConnectToDevice = (device: Device) => BLEService.connectToDevice(device.id)

  const setupOnDeviceDisconnected = useCallback(
    (directDeviceId?: DeviceId) => {
      if (!deviceId && !directDeviceId) {
        console.error('Device not ready')
        return
      }
      if (onDisconnectRef.current?.remove) {
        onDisconnectRef.current.remove()
        onDisconnectRef.current = null
      }
      onDisconnectRef.current = BLEService.onDeviceDisconnectedCustom(directDeviceId || deviceId, disconnectedListener)
      console.info('on device disconnected ready')
    },
    [deviceId]
  )

  const disconnectedListener = (error: BleError | null, device: Device | null) => {
    console.warn('Disconnect listener called')
    if (error) {
      console.error('onDeviceDisconnected error')
    }
    if (device) {
      console.info('onDeviceDisconnected device')
    }
    setDeviceId('')
    setCurrentTest(null)
  }

  // https://github.com/dotintent/react-native-ble-plx/issues/1126
  const start1126Test = () => connectAndDiscover().then(() => setCurrentTest('disconnectByPLX'))

  // https://github.com/dotintent/react-native-ble-plx/issues/1126
  const start1126DeviceTest = () => connectAndDiscover().then(() => setCurrentTest('disconnectByDevice'))

  const disconnectByPLX = useCallback(async () => {
    try {
      setupOnDeviceDisconnected()
      await wait(1000)
      console.info('expected warn: "Disconnect listener called"')
      BLEService.disconnectDevice()
      console.info('Finished')
    } catch (error) {
      console.error(error)
    }
  }, [setupOnDeviceDisconnected])

  const disconnectByDevice = useCallback(async () => {
    try {
      setupOnDeviceDisconnected()
      wait(1000)
      Toast.show({
        type: 'info',
        text1: 'Disconnect device',
        text2: 'and expect warn: "Disconnect listener called"'
      })
      console.info('Disconnect device and expect warn: "Disconnect listener called"')
    } catch (error) {
      console.error(error)
    }
  }, [setupOnDeviceDisconnected])

  useEffect(() => {
    if (!deviceId) {
      return
    }
    if (currentTest === 'disconnectByPLX') {
      disconnectByPLX()
    }
    if (currentTest === 'disconnectByDevice') {
      disconnectByDevice()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId])

  return (
    <ScreenDefaultContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <AppTextInput
          placeholder="Device name to connect"
          value={expectedDeviceName}
          onChangeText={setExpectedDeviceName}
        />
        <AppButton label="Connect and discover" onPress={connectAndDiscover} />
        <AppButton label="Setup on device disconnected" onPress={() => setupOnDeviceDisconnected()} />
        <TestStateDisplay label="Looking for device" state={testScanDevicesState} />
        <AppButton label="Start 1126 test (trigger by ble-plx)" onPress={() => start1126Test()} />
        <AppButton label="Start 1126 test (trigger by device)" onPress={() => start1126DeviceTest()} />
      </ScrollView>
    </ScreenDefaultContainer>
  )
}
