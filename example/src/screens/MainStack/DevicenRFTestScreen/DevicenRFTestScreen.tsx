import React, { useState, type Dispatch } from 'react'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Device, type Base64 } from 'react-native-ble-plx'
import { Platform, ScrollView } from 'react-native'
import base64 from 'react-native-base64'
import type { TestStateType } from '../../../types'
import { BLEService, usePersistentDeviceName } from '../../../services'
import type { MainStackParamList } from '../../../navigation/navigators'
import { AppButton, AppTextInput, ScreenDefaultContainer, TestStateDisplay } from '../../../components/atoms'
import { wait } from '../../../utils/wait'
import {
  currentTimeCharacteristic,
  currentTimeCharacteristicTimeTriggerDescriptor,
  currentTimeCharacteristicTimeTriggerDescriptorValue,
  deviceTimeCharacteristic,
  deviceTimeService,
  monitorExpectedMessage,
  writeWithResponseBase64Time,
  writeWithoutResponseBase64Time
} from '../../../consts/nRFDeviceConsts'

type DevicenRFTestScreenProps = NativeStackScreenProps<MainStackParamList, 'DEVICE_NRF_TEST_SCREEN'>

export function DevicenRFTestScreen(_props: DevicenRFTestScreenProps) {
  const [expectedDeviceName, setExpectedDeviceName] = usePersistentDeviceName()
  const [testScanDevicesState, setTestScanDevicesState] = useState<TestStateType>('WAITING')
  const [testDeviceConnectedState, setTestDeviceConnectedState] = useState<TestStateType>('WAITING')
  const [testDiscoverServicesAndCharacteristicsFoundState, setTestDiscoverServicesAndCharacteristicsFoundState] =
    useState<TestStateType>('WAITING')

  const [testDeviceTimeCharacteristicWriteWithResponseState, setTestDeviceTimeCharacteristicWriteWithResponseState] =
    useState<TestStateType>('WAITING')
  const [
    testDeviceTimeReadCharacteristicForDeviceAfterWriteWithResponseState,
    setTestDeviceTimeReadCharacteristicForDeviceAfterWriteWithResponseState
  ] = useState<TestStateType>('WAITING')
  const [
    testDeviceTimeReadCharacteristicForDeviceAfterWriteWithResponseStateValue,
    setTestDeviceTimeReadCharacteristicForDeviceAfterWriteWithResponseStateValue
  ] = useState('')

  const [
    testWriteDeviceTimeCharacteristicWithoutResponseForDeviceState,
    setTestWriteDeviceTimeCharacteristicWithoutResponseForDeviceState
  ] = useState<TestStateType>('WAITING')
  const [
    testReadDeviceTimeCharacteristicForDeviceAfterWriteWithoutResponseState,
    setTestReadDeviceTimeCharacteristicForDeviceAfterWriteWithoutResponseState
  ] = useState<TestStateType>('WAITING')
  const [
    testReadDeviceTimeCharacteristicForDeviceAfterWriteWithoutResponseStateValue,
    setTestReadDeviceTimeCharacteristicForDeviceAfterWriteWithoutResponseStateValue
  ] = useState('')

  const [testReadTimeTriggerDescriptorForDeviceState, setTestReadTimeTriggerDescriptorForDeviceState] =
    useState<TestStateType>('WAITING')
  const [testWriteTimeTriggerDescriptorForDeviceState, setTestWriteTimeTriggerDescriptorForDeviceState] =
    useState<TestStateType>('WAITING')

  const [testServicesForDeviceState, setTestServicesForDeviceState] = useState<TestStateType>('WAITING')
  const [testServicesForDeviceStateValue, setTestServicesForDeviceStateValue] = useState('')

  const [testCharacteristicsForDeviceState, setTestCharacteristicsForDeviceState] = useState<TestStateType>('WAITING')
  const [testCharacteristicsForDeviceStateValue, setTestCharacteristicsForDeviceStateValue] = useState('')

  const [testDescriptorsForDeviceState, setTestDescriptorsForDeviceState] = useState<TestStateType>('WAITING')
  const [testDescriptorsForDeviceStateValue, setTestDescriptorsForDeviceStateValue] = useState('')

  const [testIsDeviceConnectedStateState, setTestIsDeviceConnectedStateState] = useState<TestStateType>('WAITING')
  const [testOnDeviceDisconnectState, setTestOnDeviceDisconnectState] = useState<TestStateType>('WAITING')
  const [testConnectedDevicesState, setTestConnectedDevicesState] = useState<TestStateType>('WAITING')
  const [testRequestMTUForDeviceState, setTestRequestMTUForDeviceState] = useState<TestStateType>('WAITING')
  const [testCancelTransactionState, setTestCancelTransactionState] = useState<TestStateType>('WAITING')
  const [testReadRSSIForDeviceState, setTestReadRSSIForDeviceState] = useState<TestStateType>('WAITING')
  const [testGetDevicesState, setTestGetDevicesState] = useState<TestStateType>('WAITING')
  const [testBTStateState, setTestBTStateState] = useState<TestStateType>('WAITING')
  const [testRequestConnectionPriorityForDeviceState, setTestRequestConnectionPriorityForDeviceState] =
    useState<TestStateType>('WAITING')
  const [testStartCancelDeviceConnectionState, setTestStartCancelDeviceConnectionState] =
    useState<TestStateType>('WAITING')

  const [testMonitorCurrentTimeCharacteristicForDevice, setTestMonitorCurrentTimeCharacteristicForDevice] =
    useState<TestStateType>('WAITING')
  const [testDeviceDisconnectState, setTestDeviceDisconnectState] = useState<TestStateType>('WAITING')

  const [testEnableState, setTestEnableState] = useState<TestStateType>('WAITING')
  const [testDisableState, setTestDisableState] = useState<TestStateType>('WAITING')

  const onStartHandler = async () => {
    setTestDeviceConnectedState('WAITING')
    setTestDiscoverServicesAndCharacteristicsFoundState('WAITING')
    setTestDeviceTimeCharacteristicWriteWithResponseState('WAITING')
    setTestDeviceTimeReadCharacteristicForDeviceAfterWriteWithResponseState('WAITING')
    setTestWriteDeviceTimeCharacteristicWithoutResponseForDeviceState('WAITING')
    setTestReadDeviceTimeCharacteristicForDeviceAfterWriteWithoutResponseState('WAITING')
    setTestReadTimeTriggerDescriptorForDeviceState('WAITING')
    setTestWriteTimeTriggerDescriptorForDeviceState('WAITING')
    setTestServicesForDeviceState('WAITING')
    setTestCharacteristicsForDeviceState('WAITING')
    setTestDescriptorsForDeviceState('WAITING')
    setTestIsDeviceConnectedStateState('WAITING')
    setTestOnDeviceDisconnectState('WAITING')
    setTestConnectedDevicesState('WAITING')
    setTestRequestMTUForDeviceState('WAITING')
    setTestCancelTransactionState('WAITING')
    setTestReadRSSIForDeviceState('WAITING')
    setTestEnableState('WAITING')
    setTestDisableState('WAITING')
    setTestGetDevicesState('WAITING')
    setTestMonitorCurrentTimeCharacteristicForDevice('WAITING')
    setTestDeviceDisconnectState('WAITING')
    setTestScanDevicesState('WAITING')
    setTestStartCancelDeviceConnectionState('WAITING')
    BLEService.initializeBLE().then(scanDevices)
  }

  const onDeviceFound = (device: Device) => {
    if (device.name?.toLocaleLowerCase() === expectedDeviceName?.toLocaleLowerCase()) {
      setTestScanDevicesState('DONE')
      startConnectToDevice(device)
        .then(onDeviceDisconnected)
        .then(startTestDiscoverServicesAndCharacteristicsFoundState)
        .then(startWriteCharacteristicWithResponseForDevice)
        .then(() =>
          startReadCharacteristicForDevice(
            writeWithResponseBase64Time,
            setTestDeviceTimeReadCharacteristicForDeviceAfterWriteWithResponseState,
            setTestDeviceTimeReadCharacteristicForDeviceAfterWriteWithResponseStateValue
          )
        )
        .then(startTestWriteDeviceTimeCharacteristicWithoutResponseForDeviceState)
        .then(() =>
          startReadCharacteristicForDevice(
            writeWithoutResponseBase64Time,
            setTestReadDeviceTimeCharacteristicForDeviceAfterWriteWithoutResponseState,
            setTestReadDeviceTimeCharacteristicForDeviceAfterWriteWithoutResponseStateValue
          )
        )
        .then(startWriteTimeTriggerDescriptorForDevice)
        .then(startReadTimeTriggerDescriptorForDevice)
        .then(startTestGetServicesForDeviceState)
        .then(startTestGetCharacteristicsForDeviceState)
        .then(startTestGetDescriptorsForDeviceState)
        .then(startIsDeviceConnectedState)
        .then(startGetConnectedDevices)
        .then(startRequestMTUForDevice)
        .then(startTestCancelTransaction)
        .then(startReadRSSIForDevice)
        .then(startGetDevices)
        .then(startGetState)
        .then(startRequestConnectionPriorityForDevice)
        .then(startTestMonitorCurrentTimeCharacteristicForDevice)
        .then(disconnectDevice)
        .then(startCancelDeviceConnection)
        .then(startDisableEnableTest)
        .catch(error => console.error(error.message))
    }
  }

  const startTestInfo = (testName: string) => console.info('starting: ', testName)

  const runTest = (functionToRun: () => Promise<unknown>, stateSetter: Dispatch<TestStateType>, testName: string) => {
    startTestInfo(testName)
    stateSetter('IN_PROGRESS')
    return functionToRun()
      .then(() => {
        console.info('success')
        stateSetter('DONE')
      })
      .catch(error => {
        console.error(error)
        stateSetter('ERROR')
      })
  }

  const scanDevices = () => {
    startTestInfo('scanDevices')
    setTestScanDevicesState('IN_PROGRESS')
    BLEService.scanDevices(onDeviceFound, [deviceTimeService])
  }

  const startConnectToDevice = (device: Device) =>
    runTest(() => BLEService.connectToDevice(device.id), setTestDeviceConnectedState, 'ConnectToDevice')

  const startTestDiscoverServicesAndCharacteristicsFoundState = () =>
    runTest(
      BLEService.discoverAllServicesAndCharacteristicsForDevice,
      setTestDiscoverServicesAndCharacteristicsFoundState,
      'startTestDiscoverServicesAndCharacteristicsFoundState'
    )

  const startWriteCharacteristicWithResponseForDevice = () =>
    runTest(
      () =>
        BLEService.writeCharacteristicWithResponseForDevice(
          deviceTimeService,
          deviceTimeCharacteristic,
          writeWithResponseBase64Time
        ),
      setTestDeviceTimeCharacteristicWriteWithResponseState,
      'startWriteCharacteristicWithResponseForDevice'
    )

  const startReadCharacteristicForDevice = (
    expectedValue: Base64,
    stateSetFunction: Dispatch<TestStateType>,
    valueSetter: Dispatch<string>
  ) => {
    startTestInfo('startReadCharacteristicForDevice')
    stateSetFunction('IN_PROGRESS')
    return BLEService.readCharacteristicForDevice(deviceTimeService, deviceTimeCharacteristic)
      .then(characteristic => {
        if (characteristic.value === expectedValue) {
          stateSetFunction('DONE')
          console.info('success')
          valueSetter(characteristic.value)
        } else {
          throw new Error('Read error')
        }
      })
      .catch(error => {
        console.error(error)
        stateSetFunction('ERROR')
      })
  }

  const startTestWriteDeviceTimeCharacteristicWithoutResponseForDeviceState = () =>
    runTest(
      () =>
        BLEService.writeCharacteristicWithoutResponseForDevice(
          deviceTimeService,
          deviceTimeCharacteristic,
          writeWithoutResponseBase64Time
        ),
      setTestWriteDeviceTimeCharacteristicWithoutResponseForDeviceState,
      'startTestWriteDeviceTimeCharacteristicWithoutResponseForDeviceState'
    )

  const startTestMonitorCurrentTimeCharacteristicForDevice = () =>
    new Promise<void>((resolve, reject) => {
      startTestInfo('startTestMonitorCurrentTimeCharacteristicForDevice')
      setTestMonitorCurrentTimeCharacteristicForDevice('IN_PROGRESS')
      BLEService.setupMonitor(
        deviceTimeService,
        currentTimeCharacteristic,
        async characteristic => {
          if (characteristic.value && base64.decode(characteristic.value) === monitorExpectedMessage) {
            setTestMonitorCurrentTimeCharacteristicForDevice('DONE')
            await BLEService.finishMonitor()
            console.info('success')
            resolve()
          }
        },
        async error => {
          console.error(error)
          setTestMonitorCurrentTimeCharacteristicForDevice('ERROR')
          await BLEService.finishMonitor()
          reject()
        }
      )
    })

  const startWriteTimeTriggerDescriptorForDevice = () =>
    runTest(
      () =>
        BLEService.writeDescriptorForDevice(
          deviceTimeService,
          currentTimeCharacteristic,
          currentTimeCharacteristicTimeTriggerDescriptor,
          currentTimeCharacteristicTimeTriggerDescriptorValue
        ),
      setTestWriteTimeTriggerDescriptorForDeviceState,
      'startWriteTimeTriggerDescriptorForDevice'
    )

  const startReadTimeTriggerDescriptorForDevice = () => {
    setTestReadTimeTriggerDescriptorForDeviceState('IN_PROGRESS')
    startTestInfo('startReadTimeTriggerDescriptorForDevice')
    return BLEService.readDescriptorForDevice(
      deviceTimeService,
      currentTimeCharacteristic,
      currentTimeCharacteristicTimeTriggerDescriptor
    )
      .then(descriptor => {
        if (descriptor?.value === currentTimeCharacteristicTimeTriggerDescriptorValue) {
          setTestReadTimeTriggerDescriptorForDeviceState('DONE')
          console.info('success')
        } else {
          throw new Error('Read error')
        }
      })
      .catch(error => {
        console.error(error)
        setTestReadTimeTriggerDescriptorForDeviceState('ERROR')
      })
  }

  const startTestGetServicesForDeviceState = () =>
    runTest(
      () =>
        BLEService.getServicesForDevice().then(services => {
          if (!services) {
            throw new Error('services error')
          }
          setTestServicesForDeviceStateValue(
            JSON.stringify(
              services.map(({ isPrimary, deviceID, id, uuid }) => ({ isPrimary, deviceID, id, uuid })),
              null,
              4
            )
          )
        }),
      setTestServicesForDeviceState,
      'startTestGetServicesForDeviceState'
    )

  const startTestGetCharacteristicsForDeviceState = () =>
    runTest(
      () =>
        BLEService.getDescriptorsForDevice(deviceTimeService, currentTimeCharacteristic).then(descriptors => {
          if (!descriptors) {
            throw new Error('descriptors error')
          }
          setTestDescriptorsForDeviceStateValue(
            JSON.stringify(
              descriptors.map(
                ({ deviceID, id, serviceID, serviceUUID, uuid, value, characteristicID, characteristicUUID }) => ({
                  deviceID,
                  id,
                  serviceID,
                  serviceUUID,
                  uuid,
                  value,
                  characteristicID,
                  characteristicUUID
                })
              ),
              null,
              4
            )
          )
        }),
      setTestCharacteristicsForDeviceState,
      'startTestGetCharacteristicsForDeviceState'
    )

  const startTestGetDescriptorsForDeviceState = () =>
    runTest(
      () =>
        BLEService.getCharacteristicsForDevice(deviceTimeService).then(characteristics => {
          if (!characteristics) {
            throw new Error('characteristics error')
          }
          setTestCharacteristicsForDeviceStateValue(
            JSON.stringify(
              characteristics.map(
                ({
                  descriptors,
                  deviceID,
                  id,
                  isIndicatable,
                  isNotifiable,
                  isNotifying,
                  isReadable,
                  isWritableWithResponse,
                  isWritableWithoutResponse,
                  serviceID,
                  serviceUUID,
                  uuid,
                  value
                }) => ({
                  descriptors,
                  deviceID,
                  id,
                  isIndicatable,
                  isNotifiable,
                  isNotifying,
                  isReadable,
                  isWritableWithResponse,
                  isWritableWithoutResponse,
                  serviceID,
                  serviceUUID,
                  uuid,
                  value
                })
              ),
              null,
              4
            )
          )
        }),
      setTestDescriptorsForDeviceState,
      'startTestGetDescriptorsForDeviceState'
    )

  const startIsDeviceConnectedState = () =>
    runTest(
      () =>
        BLEService.isDeviceConnected().then(connectionStatus => {
          if (!connectionStatus) {
            throw new Error('isDeviceConnected error')
          }
        }),
      setTestIsDeviceConnectedStateState,
      'startIsDeviceConnectedState'
    )

  const getConnectedDevices = () =>
    BLEService.getConnectedDevices([deviceTimeService]).then(connectedDevices => {
      if (!connectedDevices) {
        throw new Error('getConnectedDevices error')
      }
      const accurateDevice = connectedDevices.find(device => device.name === expectedDeviceName)
      if (!accurateDevice) {
        throw new Error('getConnectedDevices device not found')
      }
      return accurateDevice
    })

  const startGetConnectedDevices = () =>
    runTest(getConnectedDevices, setTestConnectedDevicesState, 'startGetConnectedDevices')

  const startRequestMTUForDevice = () => {
    const expectedMTU = 40
    return runTest(
      () =>
        BLEService.requestMTUForDevice(expectedMTU).then(device => {
          if (Platform.OS === 'ios') {
            return
          }
          if (!device) {
            throw new Error('requestMTUForDevice error')
          }
          if (device.mtu !== expectedMTU) {
            throw new Error('the requested MTU has not been set')
          }
        }),
      setTestRequestMTUForDeviceState,
      'startRequestMTUForDevice'
    )
  }

  const testCancelTransaction = async () =>
    new Promise<void>((resolve, reject) => {
      const transactionId = 'mtuRequestTransactionTestId'
      BLEService.setupMonitor(
        deviceTimeService,
        currentTimeCharacteristic,
        () => {},
        error => {
          if (error.message === 'Operation was cancelled') {
            resolve()
          } else {
            console.error(error)
          }
        },
        transactionId,
        true
      )
      BLEService.cancelTransaction(transactionId)

      setTimeout(() => reject(new Error('Cancel transaction timeout')), 5000)
    })

  const startTestCancelTransaction = () =>
    runTest(testCancelTransaction, setTestCancelTransactionState, 'startTestCancelTransaction')

  const disconnectDevice = () => runTest(BLEService.disconnectDevice, setTestDeviceDisconnectState, 'disconnectDevice')

  const startReadRSSIForDevice = () =>
    runTest(
      () =>
        BLEService.readRSSIForDevice().then(device => {
          if (!device) {
            throw new Error('readRSSIForDevice error')
          }
          if (!device.rssi) {
            throw new Error('readRSSIForDevice error')
          }
        }),
      setTestReadRSSIForDeviceState,
      'startReadRSSIForDevice'
    )

  const startGetDevices = () =>
    runTest(
      () =>
        BLEService.getDevices().then(devices => {
          if (!devices) {
            throw new Error('getDevices error')
          }
          const device = devices.filter(({ name }) => name === expectedDeviceName)
          if (!device) {
            throw new Error('getDevices error')
          }
        }),
      setTestGetDevicesState,
      'startGetDevices'
    )

  const startRequestConnectionPriorityForDevice = () =>
    runTest(
      () =>
        BLEService.requestConnectionPriorityForDevice(1).then(device => {
          if (!device) {
            throw new Error('getDevices error')
          }
        }),
      setTestRequestConnectionPriorityForDeviceState,
      'startRequestConnectionPriorityForDevice'
    )

  const getState = () =>
    BLEService.getState().then(bluetoothState => {
      if (!bluetoothState) {
        throw new Error('getDevices error')
      }
      return bluetoothState
    })

  const startGetState = () => runTest(getState, setTestBTStateState, 'startGetState')

  const startDisableEnableTest = () =>
    // eslint-disable-next-line no-async-promise-executor
    new Promise<void>(async (resolve, reject) => {
      startTestInfo('startDisableEnableTest')
      setTestEnableState('IN_PROGRESS')
      setTestDisableState('IN_PROGRESS')
      if (parseInt(Platform.Version.toString(), 10) >= 33 || Platform.OS === 'ios') {
        setTestEnableState('DONE')
        setTestDisableState('DONE')
        resolve()
        return
      }
      const initialState = await BLEService.getState()
      if (initialState === 'PoweredOff') {
        await BLEService.enable()
        wait(1000)
      }
      await BLEService.disable()
      while (true) {
        const expectedPoweredOffState = await BLEService.getState()
        if (expectedPoweredOffState === 'Resetting') {
          wait(1000)
          continue
        }
        if (expectedPoweredOffState !== 'PoweredOff') {
          reject(new Error('BT disable error'))
          setTestDisableState('ERROR')
          return
        }
        break
      }
      setTestDisableState('DONE')
      await BLEService.enable()
      while (true) {
        const expectedPoweredOnState = await BLEService.getState()
        if (expectedPoweredOnState === 'Resetting') {
          wait(1000)
          continue
        }
        if (expectedPoweredOnState !== 'PoweredOn') {
          reject(new Error('BT enable error'))
          setTestEnableState('ERROR')
          return
        }
        break
      }
      setTestEnableState('DONE')
      console.info('success')
      resolve()
    })

  const onDeviceDisconnected = () => {
    if (testOnDeviceDisconnectState === 'DONE') {
      return
    }
    setTestOnDeviceDisconnectState('IN_PROGRESS')
    const onDeviceDisconnectedSubscription = BLEService.onDeviceDisconnected((error, device) => {
      if (error) {
        setTestOnDeviceDisconnectState('ERROR')
      }
      if (device) {
        setTestOnDeviceDisconnectState(prev => {
          onDeviceDisconnectedSubscription.remove()
          return prev === 'IN_PROGRESS' ? 'DONE' : 'ERROR'
        })
      }
    })
  }

  const cancelDeviceConnection = () =>
    new Promise<void>((resolve, reject) => {
      BLEService.scanDevices(
        (device: Device) => {
          if (device.name?.toLocaleLowerCase() === expectedDeviceName?.toLocaleLowerCase()) {
            BLEService.connectToDevice(device.id)
              .then(() => BLEService.cancelDeviceConnection())
              .then(() => resolve())
              .catch(error => {
                if (error?.message === `Device ${device.id} was disconnected`) {
                  resolve()
                }
                reject(error)
              })
          }
        },
        [deviceTimeService]
      ).catch(reject)
    })

  const startCancelDeviceConnection = () =>
    runTest(cancelDeviceConnection, setTestStartCancelDeviceConnectionState, 'startCancelDeviceConnection')

  return (
    <ScreenDefaultContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <AppTextInput
          placeholder="Device name to connect"
          value={expectedDeviceName}
          onChangeText={setExpectedDeviceName}
        />
        <AppButton label="Start" onPress={onStartHandler} />
        <TestStateDisplay label="Looking for device" state={testScanDevicesState} />
        <TestStateDisplay label="Device connected" state={testDeviceConnectedState} />
        <TestStateDisplay
          label="Discover services and characteristics found"
          state={testDiscoverServicesAndCharacteristicsFoundState}
        />
        <TestStateDisplay
          label="Device time characteristic write with response"
          state={testDeviceTimeCharacteristicWriteWithResponseState}
        />
        <TestStateDisplay
          label="Read device time characteristic for device after write with response"
          state={testDeviceTimeReadCharacteristicForDeviceAfterWriteWithResponseState}
          value={testDeviceTimeReadCharacteristicForDeviceAfterWriteWithResponseStateValue}
        />
        <TestStateDisplay
          label="Write device time characteristic without response for device"
          state={testWriteDeviceTimeCharacteristicWithoutResponseForDeviceState}
        />
        <TestStateDisplay
          label="Read device time characteristic for device after write without response"
          state={testReadDeviceTimeCharacteristicForDeviceAfterWriteWithoutResponseState}
          value={testReadDeviceTimeCharacteristicForDeviceAfterWriteWithoutResponseStateValue}
        />
        <TestStateDisplay
          label="Write time trigger descriptor for device"
          state={testWriteTimeTriggerDescriptorForDeviceState}
        />
        <TestStateDisplay
          label="Read time trigger descriptor for device"
          state={testReadTimeTriggerDescriptorForDeviceState}
        />
        <TestStateDisplay
          label="Services for device"
          state={testServicesForDeviceState}
          value={testServicesForDeviceStateValue}
        />
        <TestStateDisplay
          label="Characteristics for device"
          state={testCharacteristicsForDeviceState}
          value={testCharacteristicsForDeviceStateValue}
        />
        <TestStateDisplay
          label="Descriptors for device"
          state={testDescriptorsForDeviceState}
          value={testDescriptorsForDeviceStateValue}
        />
        <TestStateDisplay label="Is device connected" state={testIsDeviceConnectedStateState} />
        <TestStateDisplay label="Connected devices" state={testConnectedDevicesState} />
        <TestStateDisplay label="Request MTU for device" state={testRequestMTUForDeviceState} />
        <TestStateDisplay label="Test cancel transaction" state={testCancelTransactionState} />
        <TestStateDisplay label="Read RSSI for device" state={testReadRSSIForDeviceState} />
        <TestStateDisplay label="Get devices" state={testGetDevicesState} />
        <TestStateDisplay label="BT state" state={testBTStateState} />
        <TestStateDisplay
          label="Request connection priority for device"
          state={testRequestConnectionPriorityForDeviceState}
        />
        <TestStateDisplay
          label="Monitor current time characteristic for device"
          state={testMonitorCurrentTimeCharacteristicForDevice}
        />
        <TestStateDisplay label="Device disconnect" state={testDeviceDisconnectState} />
        <TestStateDisplay label="On device disconnect state" state={testOnDeviceDisconnectState} />
        <TestStateDisplay label="Cancel device connection" state={testStartCancelDeviceConnectionState} />
        <TestStateDisplay label="BT enable" state={testEnableState} />
        <TestStateDisplay label="BT disable" state={testDisableState} />
      </ScrollView>
    </ScreenDefaultContainer>
  )
}
