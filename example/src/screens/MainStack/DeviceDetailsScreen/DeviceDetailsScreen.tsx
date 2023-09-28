import React from 'react'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { ScrollView } from 'react-native'
import { AppText, ScreenDefaultContainer } from '../../../components/atoms'
import type { MainStackParamList } from '../../../navigation/navigators'
import { BLEService } from '../../../services'

type DeviceDetailsScreenProps = NativeStackScreenProps<MainStackParamList, 'DEVICE_DETAILS_SCREEN'>

export function DeviceScreen(_props: DeviceDetailsScreenProps) {
  const connectedDevice = BLEService.getDevice()
  return (
    <ScreenDefaultContainer>
      <ScrollView>
        <AppText>{JSON.stringify(connectedDevice, null, 4)}</AppText>
      </ScrollView>
    </ScreenDefaultContainer>
  )
}
