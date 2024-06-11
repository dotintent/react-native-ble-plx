import React, { useState, type Dispatch, useMemo } from 'react'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Device, type Base64 } from 'react-native-ble-plx'
import { ScrollView, View } from 'react-native'
import type { TestStateType } from '../../../types'
import { BLEService } from '../../../services'
import type { MainStackParamList } from '../../../navigation/navigators'
import { AppButton, AppText, AppTextInput, ScreenDefaultContainer, TestStateDisplay } from '../../../components/atoms'
import { deviceTimeCharacteristic, deviceTimeService } from '../../../consts/nRFDeviceConsts'
import { cloneDeep } from '../../../utils/cloneDeep'
import { wait } from '../../../utils/wait'
import { getDateAsBase64 } from '../../../utils/getDateAsBase64'

type DisconnectBeforeWriteProps = NativeStackScreenProps<MainStackParamList, 'DISCONNECT_BEFORE_WRITE'>
const WRITE_TEST_COUNT = 5
const WAITING_BETWEEN_TEST = 10000
export function DisconnectBeforeWrite(_props: DisconnectBeforeWriteProps) {
  const [expectedDeviceName, setExpectedDeviceName] = useState('')
  const [testScanDevicesState, setTestScanDevicesState] = useState<TestStateType>('WAITING')
  const [testDeviceConnectedState, setTestDeviceConnectedState] = useState<TestStateType>('WAITING')
  const [testDiscoverServicesAndCharacteristicsFoundState, setTestDiscoverServicesAndCharacteristicsFoundState] =
    useState<TestStateType>('WAITING')
  const [waiting, setWaiting] = useState<boolean | undefined>(undefined)
  const [
    testDeviceTimeReadCharacteristicForDeviceAfterWriteWithResponseStateValue,
    setTestDeviceTimeReadCharacteristicForDeviceAfterWriteWithResponseStateValue
  ] = useState<string[]>(Array(WRITE_TEST_COUNT).fill(''))
  const [onDeviceDisconnectedMessages, setOnDeviceDisconnectedMessages] = useState<string[]>([])

  const [testDeviceTimeCharacteristicWriteWithResponseState, setTestDeviceTimeCharacteristicWriteWithResponseState] =
    useState<TestStateType[]>(Array(WRITE_TEST_COUNT).fill('WAITING'))
  const [
    testDeviceTimeReadCharacteristicForDeviceAfterWriteWithResponseState,
    setTestDeviceTimeReadCharacteristicForDeviceAfterWriteWithResponseState
  ] = useState<TestStateType[]>(Array(WRITE_TEST_COUNT).fill('WAITING'))

  const onStartHandler = async () => {
    setTestDeviceConnectedState('WAITING')
    setTestDiscoverServicesAndCharacteristicsFoundState('WAITING')
    setTestDeviceTimeCharacteristicWriteWithResponseState(Array(WRITE_TEST_COUNT).fill('WAITING'))
    setTestDeviceTimeReadCharacteristicForDeviceAfterWriteWithResponseState(Array(WRITE_TEST_COUNT).fill('WAITING'))
    setTestScanDevicesState('WAITING')
    BLEService.initializeBLE().then(scanDevices)
  }

  const onDeviceDisconnected = () => {
    BLEService.onDeviceDisconnected((error, device) => {
      if (error) {
        setOnDeviceDisconnectedMessages(prevState => prevState.concat(`Error - ${error.name} | ${error.message}`))
      }
      if (device) {
        setOnDeviceDisconnectedMessages(prevState =>
          prevState.concat(`Device disconnected ${device.name} | ${device.id}`)
        )
      }
    })
  }

  const onDeviceFound = (device: Device) => {
    if (device.name?.toLocaleLowerCase() === expectedDeviceName.toLocaleLowerCase()) {
      setTestScanDevicesState('DONE')
      startConnectToDevice(device)
        .then(onDeviceDisconnected)
        .then(startTestDiscoverServicesAndCharacteristicsFoundState)
        .then(startWriteAndWaitTest)
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

  const startWriteCharacteristicWithResponseForDevice = (index: number, base64Time: string) =>
    runTest(
      () =>
        BLEService.writeCharacteristicWithResponseForDevice(deviceTimeService, deviceTimeCharacteristic, base64Time),
      newState =>
        setTestDeviceTimeCharacteristicWriteWithResponseState(prevState => {
          const stateArray = cloneDeep(prevState)
          stateArray[index] = newState
          return stateArray
        }),
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

  const startWriteAndWaitTest = async () => {
    for (let index = 0; index < WRITE_TEST_COUNT; index += 1) {
      try {
        setWaiting(true)
        await wait(WAITING_BETWEEN_TEST)
        setWaiting(false)
        const base64Date = getDateAsBase64(new Date())
        await startWriteCharacteristicWithResponseForDevice(index, base64Date)
        await startReadCharacteristicForDevice(
          base64Date,
          newState =>
            setTestDeviceTimeReadCharacteristicForDeviceAfterWriteWithResponseState(prevState => {
              const stateArray = cloneDeep(prevState)
              stateArray[index] = newState
              return stateArray
            }),
          newState =>
            setTestDeviceTimeReadCharacteristicForDeviceAfterWriteWithResponseStateValue(prevState => {
              const stateArray = cloneDeep(prevState)
              stateArray[index] = newState
              return stateArray
            })
        )
      } catch (e) {
        console.info(`PROBLEM WITH INDEX - ${index}`)
        console.error(e)
      }
    }
  }

  const deviceDisconnectedMessages = useMemo(
    () => onDeviceDisconnectedMessages.map(message => <AppText key={message}>{message}</AppText>),
    [onDeviceDisconnectedMessages]
  )

  const writeTestStatuses = useMemo(
    () =>
      testDeviceTimeReadCharacteristicForDeviceAfterWriteWithResponseStateValue.map((_, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <View key={index.toString()}>
          <AppText>Test - {index.toString()}</AppText>
          <TestStateDisplay
            label="Device time characteristic write with response"
            state={testDeviceTimeCharacteristicWriteWithResponseState[index]}
          />
          <TestStateDisplay
            label="Read device time characteristic for device after write with response"
            state={testDeviceTimeReadCharacteristicForDeviceAfterWriteWithResponseState[index]}
            value={testDeviceTimeReadCharacteristicForDeviceAfterWriteWithResponseStateValue[index]}
          />
        </View>
      )),
    [
      testDeviceTimeCharacteristicWriteWithResponseState,
      testDeviceTimeReadCharacteristicForDeviceAfterWriteWithResponseState,
      testDeviceTimeReadCharacteristicForDeviceAfterWriteWithResponseStateValue
    ]
  )

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
        <AppText>--Write tests--</AppText>
        {waiting !== undefined && (
          <AppText style={{ textAlign: 'center', color: waiting ? 'red' : 'white', fontSize: 24 }}>
            {waiting ? `WAITING ${WAITING_BETWEEN_TEST / 1000} seconds` : 'SENDING/READING'}
          </AppText>
        )}
        {writeTestStatuses}
        <AppText>--Disconnect messages--</AppText>
        {deviceDisconnectedMessages}
      </ScrollView>
    </ScreenDefaultContainer>
  )
}
