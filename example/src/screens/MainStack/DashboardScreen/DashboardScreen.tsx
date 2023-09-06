import React, { useEffect, useState } from 'react'
import { AppButton, AppText, ScreenDefaultContainer } from '../../../components/atoms'
import { MainStackParamList } from '../../../navigation'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { BLEService } from '../../../services'
import { FlatList, View } from 'react-native'
import { Device } from 'react-native-ble-plx'
import { BleDevice } from '../../../components/molecules'

type DashboardScreenProps = NativeStackScreenProps<MainStackParamList, 'DASHBOARD_SCREEN'>

export const DashboardScreen = (_props: DashboardScreenProps) => {
  const [BLEReady, setBLEReady] = useState(false)
  const [foundDevices, setFoundDevices] = useState<Device[]>([])
  const onBLEReady = () => {
    setBLEReady(true)
  }

  const addFoundDevice = (device: Device) => {
    console.log('found device', device.id)
    setFoundDevices(prevState => {
      const indexToReplace = prevState.findIndex(currentDevice => currentDevice.id === device.id)
      if (indexToReplace === -1) {
        return prevState.concat(device)
      }
      prevState[indexToReplace] = device
      return prevState
    })
  }

  useEffect(() => {
    BLEService.initializeBLE(onBLEReady)
  }, [])

  if (!BLEReady) {
    return <AppText style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>Loading...</AppText>
  }

  const deviceRender = (device: Device) => (
    <BleDevice onPress={pickedDevice => BLEService.connectToDevice(pickedDevice.id)} key={device.id} device={device} />
  )

  return (
    <ScreenDefaultContainer>
      <AppButton label="Look for devices" onPress={() => BLEService.scanDevices(addFoundDevice)} />
      <AppButton label="Request bluetooth permission" onPress={() => BLEService.requestBluetoothPermission()} />
      <FlatList
        style={{ flex: 1 }}
        data={foundDevices}
        renderItem={({ item }) => deviceRender(item)}
        keyExtractor={device => device.id}
      />
    </ScreenDefaultContainer>
  )
}
