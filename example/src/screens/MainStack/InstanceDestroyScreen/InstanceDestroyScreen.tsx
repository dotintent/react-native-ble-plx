import React, { useState } from 'react'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { BleError, ConnectionPriority, LogLevel } from 'react-native-ble-plx'
import { ScrollView, View } from 'react-native'
import { BLEService } from '../../../services'
import type { MainStackParamList } from '../../../navigation/navigators'
import { AppButton, AppText, ScreenDefaultContainer } from '../../../components/atoms'

type DeviceConnectDisconnectTestScreenProps = NativeStackScreenProps<MainStackParamList, 'INSTANCE_DESTROY_SCREEN'>
type TestData = { name: string; expected: string; response: string | null }
export function InstanceDestroyScreen(_props: DeviceConnectDisconnectTestScreenProps) {
  const [dataReads, setDataReads] = useState<((TestData & { time: string }) | string)[]>([])
  const callPromise = (promise: Promise<any>) =>
    promise
      .then(() => {
        const status = 'finished'
        console.info(status)
        return status
      })
      .catch((error: BleError) => {
        const { reason } = error
        console.error(reason)
        return reason
      })

  const startChain = async () => {
    const functionsToTest: { name: string; functionToCall: () => Promise<any> }[] = [
      {
        name: 'destroy',
        functionToCall: BLEService.manager.destroy
      },
      {
        name: 'setLogLevel',
        functionToCall: () => BLEService.manager.setLogLevel(LogLevel.Verbose)
      },
      {
        name: 'cancelTransaction',
        functionToCall: () => BLEService.manager.cancelTransaction('transactionId')
      },
      {
        name: 'state',
        functionToCall: BLEService.manager.state
      },
      {
        name: 'startDeviceScan',
        functionToCall: () => BLEService.manager.startDeviceScan(null, null, () => {})
      },
      {
        name: 'stopDeviceScan',
        functionToCall: BLEService.manager.stopDeviceScan
      },
      {
        name: 'requestConnectionPriorityForDevice',
        functionToCall: () =>
          BLEService.manager.requestConnectionPriorityForDevice('deviceIdentifier', ConnectionPriority.High)
      },
      {
        name: 'readRSSIForDevice',
        functionToCall: () => BLEService.manager.readRSSIForDevice('deviceIdentifier')
      },
      {
        name: 'requestMTUForDevice',
        functionToCall: () => BLEService.manager.requestMTUForDevice('deviceIdentifier', 300)
      },
      {
        name: 'devices',
        functionToCall: () => BLEService.manager.devices(['device'])
      },
      {
        name: 'connectedDevices',
        functionToCall: () => BLEService.manager.connectedDevices(['UUID'])
      },
      {
        name: 'connectToDevice',
        functionToCall: () => BLEService.manager.connectToDevice('deviceIdentifier')
      },
      {
        name: 'cancelDeviceConnection',
        functionToCall: () => BLEService.manager.cancelDeviceConnection('deviceIdentifier')
      },
      {
        name: 'isDeviceConnected',
        functionToCall: () => BLEService.manager.isDeviceConnected('deviceIdentifier')
      },
      {
        name: 'discoverAllServicesAndCharacteristicsForDevice',
        functionToCall: () => BLEService.manager.discoverAllServicesAndCharacteristicsForDevice('deviceIdentifier')
      },
      {
        name: 'servicesForDevice',
        functionToCall: () => BLEService.manager.servicesForDevice('deviceIdentifier')
      },
      {
        name: 'characteristicsForDevice',
        functionToCall: () => BLEService.manager.characteristicsForDevice('deviceIdentifier', 'UUID')
      },
      {
        name: 'descriptorsForDevice',
        functionToCall: () =>
          BLEService.manager.descriptorsForDevice('deviceIdentifier', 'serviceUUID', 'characteristicUUID')
      },
      {
        name: 'readCharacteristicForDevice',
        functionToCall: () =>
          BLEService.manager.readCharacteristicForDevice('deviceIdentifier', 'serviceUUID', 'characteristicUUID')
      },
      {
        name: 'writeCharacteristicWithResponseForDevice',
        functionToCall: () =>
          BLEService.manager.writeCharacteristicWithResponseForDevice(
            'deviceIdentifier',
            'serviceUUID',
            'characteristicUUID',
            'base64Value'
          )
      },
      {
        name: 'writeCharacteristicWithoutResponseForDevice',
        functionToCall: () =>
          BLEService.manager.writeCharacteristicWithoutResponseForDevice(
            'deviceIdentifier',
            'serviceUUID',
            'characteristicUUID',
            'base64Value'
          )
      },
      {
        name: 'readDescriptorForDevice',
        functionToCall: () =>
          BLEService.manager.readDescriptorForDevice(
            'deviceIdentifier',
            'serviceUUID',
            'characteristicUUID',
            'descriptorUUID'
          )
      },
      {
        name: 'writeDescriptorForDevice',
        functionToCall: () =>
          BLEService.manager.writeDescriptorForDevice(
            'deviceIdentifier',
            'serviceUUID',
            'characteristicUUID',
            'descriptorUUID',
            'Base64'
          )
      },
      {
        name: 'disable',
        functionToCall: () => BLEService.manager.disable()
      },
      {
        name: 'enable',
        functionToCall: () => BLEService.manager.enable()
      }
    ] as const

    functionsToTest.forEach(async ({ name, functionToCall }, index) => {
      try {
        console.info(`${index} - ${name}`)
        const response = await callPromise(functionToCall())
        const expected = name === 'destroy' ? 'finished' : 'error'
        addDataToTimeReads({
          name,
          expected,
          response
        })
      } catch (error) {
        setDataReads(prevState => prevState.concat(JSON.stringify(error)))
      }
    })
  }
  const addDataToTimeReads = ({ name, expected, response }: TestData) => {
    setDataReads(prevState =>
      prevState.concat({
        time: new Date().toTimeString(),
        name,
        expected,
        response
      })
    )
  }

  const timeEntriesToRender = dataReads.map((entry, index) => {
    if (typeof entry === 'object') {
      const { expected, name, time, response } = entry

      return (
        <View key={name} style={{ marginBottom: 20 }}>
          <AppText>{time}</AppText>
          <AppText>{name}</AppText>
          <AppText>expected: {expected}</AppText>
          <AppText>result: {response}</AppText>
        </View>
      )
    }

    return (
      <View key={`error-${index.toString()}`} style={{ marginBottom: 20 }}>
        <AppText>{entry}</AppText>
      </View>
    )
  })

  return (
    <ScreenDefaultContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <AppButton label="Start" onPress={() => startChain()} />
        {timeEntriesToRender}
      </ScrollView>
    </ScreenDefaultContainer>
  )
}
