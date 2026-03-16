import React, { useEffect, useRef } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { BleManager } from 'react-native-ble-plx'

import ScanScreen from './screens/ScanScreen'
import DeviceScreen from './screens/DeviceScreen'
import CharacteristicScreen from './screens/CharacteristicScreen'
import L2CAPScreen from './screens/L2CAPScreen'

export type RootStackParamList = {
  Scan: { manager: BleManager }
  Device: { manager: BleManager; deviceId: string; deviceName: string | null }
  Characteristic: {
    manager: BleManager
    deviceId: string
    serviceUuid: string
    characteristicUuid: string
    properties: {
      isReadable: boolean
      isWritableWithResponse: boolean
      isWritableWithoutResponse: boolean
      isNotifying: boolean
      isIndicatable: boolean
    }
  }
  L2CAP: {
    manager: BleManager
    deviceId: string
    psm: number
  }
}

const Stack = createNativeStackNavigator<RootStackParamList>()

export default function App() {
  const managerRef = useRef<BleManager>(new BleManager())

  useEffect(() => {
    const manager = managerRef.current
    manager.createClient().catch((e: any) => {
      console.warn('Failed to create BLE client:', e)
    })

    return () => {
      manager.destroyClient().catch(() => {})
    }
  }, [])

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Scan">
        <Stack.Screen
          name="Scan"
          component={ScanScreen}
          initialParams={{ manager: managerRef.current }}
          options={{ title: 'BLE Scanner' }}
        />
        <Stack.Screen
          name="Device"
          component={DeviceScreen}
          options={{ title: 'Device' }}
        />
        <Stack.Screen
          name="Characteristic"
          component={CharacteristicScreen}
          options={{ title: 'Characteristic' }}
        />
        <Stack.Screen
          name="L2CAP"
          component={L2CAPScreen}
          options={{ title: 'L2CAP Channel' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
