import React, { useEffect, useState } from 'react'
import { AppButton, AppText, ScreenDefaultContainer } from '../../../components/atoms'
import type { MainStackParamList } from '../../../navigation'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { BLEService } from '../../../services'
import { FlatList } from 'react-native'
import { Device } from 'react-native-ble-plx'
import { BleDevice } from '../../../components/molecules'

type DashboardScreenProps = NativeStackScreenProps<MainStackParamList, 'DASHBOARD_SCREEN'>

export const DashboardScreen = (_props: DashboardScreenProps) => {
  const [foundDevices, setFoundDevices] = useState<Device[]>([])

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

  const deviceRender = (device: Device) => (
    <BleDevice onPress={pickedDevice => BLEService.connectToDevice(pickedDevice.id)} key={device.id} device={device} />
  )

  return (
    <ScreenDefaultContainer>
      <AppButton label="Prepare BLE" onPress={() => BLEService.initializeBLE(console.log)} />
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
