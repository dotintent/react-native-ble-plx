import React, { useState } from 'react'
import { AppButton, AppText, ScreenDefaultContainer } from '../../../components/atoms'
import type { MainStackParamList } from '../../../navigation'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { BLEService } from '../../../services'
import { FlatList, View } from 'react-native'
import { Device } from 'react-native-ble-plx'
import { BleDevice } from '../../../components/molecules'

type DashboardScreenProps = NativeStackScreenProps<MainStackParamList, 'DASHBOARD_SCREEN'>

export const DashboardScreen = ({ navigation }: DashboardScreenProps) => {
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
        <View
          style={{
            zIndex: 100,
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: '#00000066',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <AppText style={{ fontSize: 30 }}>Connecting</AppText>
        </View>
      )}
      <AppButton
        label="Look for devices"
        onPress={() => BLEService.initializeBLE().then(() => BLEService.scanDevices(addFoundDevice))}
      />
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
