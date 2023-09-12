import React from 'react'
import { AppText, ScreenDefaultContainer } from '../../../components/atoms'
import type { MainStackParamList } from '../../../navigation'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { BLEService } from '../../../services'
import { ScrollView } from 'react-native'

type DeviceDetailsScreenProps = NativeStackScreenProps<MainStackParamList, 'DEVICE_DETAILS_SCREEN'>

export const DeviceScreen = (_props: DeviceDetailsScreenProps) => {
  const connectedDevice = BLEService.getDevice()
  return (
    <ScreenDefaultContainer>
      <ScrollView>
        <AppText>{JSON.stringify(connectedDevice, null, 4)}</AppText>
      </ScrollView>
    </ScreenDefaultContainer>
  )
}
