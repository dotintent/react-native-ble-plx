import React, { useState } from 'react'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { FlatList } from 'react-native'
import { Device } from 'react-native-ble-plx'
import { AppButton, AppText, ScreenDefaultContainer } from '../../../components/atoms'
import type { MainStackParamList } from '../../../navigation/navigators'
import { BLEService } from '../../../services'
import { BleDevice } from '../../../components/molecules'
import { DropDown } from './DashboardScreen.styled'

type DashboardScreenProps = NativeStackScreenProps<MainStackParamList, 'DASHBOARD_SCREEN'>

export function DashboardScreen({ navigation }: DashboardScreenProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [foundDevices, setFoundDevices] = useState<Device[]>([])

  const addFoundDevice = (device: Device) => {
    setFoundDevices(prevState => {
      const indexToReplace = prevState.findIndex(currentDevice => currentDevice.id === device.id)
      if (indexToReplace === -1) {
        return prevState.concat(device)
      }
      prevState[indexToReplace] = device
      return prevState
    })
  }

  const onConnectSuccess = () => {
    navigation.navigate('DEVICE_DETAILS_SCREEN')
    setIsConnecting(false)
  }

  const onConnectFail = () => {
    setIsConnecting(false)
  }

  const deviceRender = (device: Device) => (
    <BleDevice
      onPress={pickedDevice => {
        setIsConnecting(true)
        BLEService.connectToDevice(pickedDevice.id).then(onConnectSuccess).catch(onConnectFail)
      }}
      key={device.id}
      device={device}
    />
  )

  return (
    <ScreenDefaultContainer>
      {isConnecting && (
        <DropDown>
          <AppText style={{ fontSize: 30 }}>Connecting</AppText>
        </DropDown>
      )}
      <AppButton
        label="Look for devices"
        onPress={() => BLEService.initializeBLE().then(() => BLEService.scanDevices(addFoundDevice))}
      />
      <AppButton label="Ask for permissions" onPress={BLEService.requestBluetoothPermission} />
      <AppButton label="Go to nRF test" onPress={() => navigation.navigate('DEVICE_NRF_TEST_SCREEN')} />
      <FlatList
        style={{ flex: 1 }}
        data={foundDevices}
        renderItem={({ item }) => deviceRender(item)}
        keyExtractor={device => device.id}
      />
    </ScreenDefaultContainer>
  )
}
