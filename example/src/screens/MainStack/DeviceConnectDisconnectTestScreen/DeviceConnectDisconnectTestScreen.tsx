import React, { useRef, useState } from 'react'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { BleError, Characteristic, Device, type Subscription, type DeviceId } from 'react-native-ble-plx'
import { ScrollView } from 'react-native'
import base64 from 'react-native-base64'
import Toast from 'react-native-toast-message'
import type { TestStateType } from '../../../types'
import { BLEService } from '../../../services'
import type { MainStackParamList } from '../../../navigation/navigators'
import { AppButton, AppTextInput, ScreenDefaultContainer, TestStateDisplay } from '../../../components/atoms'
import { currentTimeCharacteristic, deviceTimeService } from '../../../consts/nRFDeviceConsts'
import { wait } from '../../../utils/wait'

type DeviceConnectDisconnectTestScreenProps = NativeStackScreenProps<
  MainStackParamList,
  'DEVICE_CONNECT_DISCONNECT_TEST_SCREEN'
>

export function DeviceConnectDisconnectTestScreen(_props: DeviceConnectDisconnectTestScreenProps) {
  const [expectedDeviceName, setExpectedDeviceName] = useState('')
  const [testScanDevicesState, setTestScanDevicesState] = useState<TestStateType>('WAITING')
  const [deviceId, setDeviceId] = useState('')
  const [connectCounter, setConnectCounter] = useState(0)
  const [characteristicDiscoverCounter, setCharacteristicDiscoverCounter] = useState(0)
  const [connectInDisconnectTestCounter, setConnectInDisconnectTestCounter] = useState(0)
  const [disconnectCounter, setDisconnectCounter] = useState(0)
  const [monitorMessages, setMonitorMessages] = useState<string[]>([])
  const monitorSubscriptionRef = useRef<Subscription | null>(null)

  const addMonitorMessage = (message: string) => setMonitorMessages(prevMessages => [...prevMessages, message])

  const checkDeviceName = (device: Device) =>
    device.name?.toLocaleLowerCase() === expectedDeviceName.toLocaleLowerCase()

  const startConnectAndDiscover = async () => {
    setTestScanDevicesState('IN_PROGRESS')
    await BLEService.initializeBLE()
    await BLEService.scanDevices(connectAndDiscoverOnDeviceFound, [deviceTimeService])
  }

  const startConnectAndDisconnect = async () => {
    setTestScanDevicesState('IN_PROGRESS')
    await BLEService.initializeBLE()
    await BLEService.scanDevices(connectAndDisconnectOnDeviceFound, [deviceTimeService])
  }

  const startConnectOnly = async () => {
    setTestScanDevicesState('IN_PROGRESS')
    await BLEService.initializeBLE()
    await BLEService.scanDevices(
      async (device: Device) => {
        if (checkDeviceName(device)) {
          console.info(`connecting to ${device.id}`)
          await startConnectToDevice(device)
          setConnectCounter(prevCount => prevCount + 1)
          setTestScanDevicesState('DONE')
          setDeviceId(device.id)
        }
      },
      [deviceTimeService]
    )
  }

  const connectAndDiscoverOnDeviceFound = async (device: Device) => {
    if (checkDeviceName(device)) {
      setTestScanDevicesState('DONE')
      setDeviceId(device.id)
      try {
        for (let i = 0; i < 10; i += 1) {
          console.info(`connecting to ${device.id}`)
          await startConnectToDevice(device)
          setConnectCounter(prevCount => prevCount + 1)
          console.info(`discovering in ${device.id}`)
          await startDiscoverServices()
          setCharacteristicDiscoverCounter(prevCount => prevCount + 1)
        }
        console.info('Multiple connect success')
      } catch (error) {
        console.error('Multiple connect error')
      }
    }
  }
  const connectAndDisconnectOnDeviceFound = async (device: Device) => {
    if (checkDeviceName(device)) {
      setTestScanDevicesState('DONE')
      setDeviceId(device.id)
      try {
        for (let i = 0; i < 10; i += 1) {
          await startConnectToDevice(device)
          console.info(`connecting to ${device.id}`)
          setConnectInDisconnectTestCounter(prevCount => prevCount + 1)
          await startDisconnect(device)
          console.info(`disconnecting from ${device.id}`)
          setDisconnectCounter(prevCount => prevCount + 1)
        }
        console.info('connect/disconnect success')
      } catch (error) {
        console.error('Connect/disconnect error')
      }
    }
  }

  const discoverCharacteristicsOnly = async () => {
    if (!deviceId) {
      console.error('Device not ready')
      return
    }
    try {
      for (let i = 0; i < 10; i += 1) {
        console.info(`discovering in ${deviceId}`)
        await startDiscoverServices()
        setCharacteristicDiscoverCounter(prevCount => prevCount + 1)
      }
      console.info('Multiple discovering success')
    } catch (error) {
      console.error('Multiple discovering error')
    }
  }

  const startConnectToDevice = (device: Device) => BLEService.connectToDevice(device.id)

  const startDiscoverServices = () => BLEService.discoverAllServicesAndCharacteristicsForDevice()

  const startDisconnect = (device: Device) => BLEService.disconnectDeviceById(device.id)

  const startCharacteristicMonitor = (directDeviceId?: DeviceId) => {
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

  const setupOnDeviceDisconnected = (directDeviceId?: DeviceId) => {
    if (!deviceId && !directDeviceId) {
      console.error('Device not ready')
      return
    }
    BLEService.onDeviceDisconnectedCustom(directDeviceId || deviceId, disconnectedListener)
  }

  const disconnectedListener = (error: BleError | null, device: Device | null) => {
    if (error) {
      console.error('onDeviceDisconnected')
      console.error(JSON.stringify(error, null, 4))
    }
    if (device) {
      console.info(JSON.stringify(device, null, 4))
    }
  }

  const show1103Crash = async () => {
    setTestScanDevicesState('IN_PROGRESS')
    await BLEService.initializeBLE()
    await BLEService.scanDevices(
      async (device: Device) => {
        if (checkDeviceName(device)) {
          console.info(`connecting to ${device.id}`)
          await startConnectToDevice(device)
          setConnectCounter(prevCount => prevCount + 1)
          setTestScanDevicesState('DONE')
          setDeviceId(device.id)
          await startDiscoverServices()
          await wait(1000)
          setupOnDeviceDisconnected(device.id)
          await wait(1000)
          startCharacteristicMonitor(device.id)
          await wait(1000)
          const info = 'Now disconnect device'
          console.info(info)
          Toast.show({
            type: 'info',
            text1: info
          })
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
        <AppButton label="#1103" onPress={show1103Crash} />
        <AppButton label="Just connect" onPress={startConnectOnly} />
        <AppButton label="Setup on device disconnected" onPress={() => setupOnDeviceDisconnected()} />
        <TestStateDisplay label="Looking for device" state={testScanDevicesState} />
        <AppButton label="Start connect and discover" onPress={startConnectAndDiscover} />
        <AppButton label="Discover characteristics only" onPress={discoverCharacteristicsOnly} />
        <TestStateDisplay label="Connect counter" value={connectCounter.toString()} />
        <TestStateDisplay label="Characteristic discover counter" value={characteristicDiscoverCounter.toString()} />
        <AppButton label="Start connect and disconnect" onPress={startConnectAndDisconnect} />
        <TestStateDisplay
          label="Connect in disconnect test counter"
          value={connectInDisconnectTestCounter.toString()}
        />
        <TestStateDisplay label="Disconnect counter" value={disconnectCounter.toString()} />
        <AppButton label="Setup monitor" onPress={() => startCharacteristicMonitor()} />
        <AppButton label="Remove monitor" onPress={monitorSubscriptionRef.current?.remove} />
        <TestStateDisplay label="Connect in disconnect test counter" value={JSON.stringify(monitorMessages, null, 4)} />
      </ScrollView>
    </ScreenDefaultContainer>
  )
}
