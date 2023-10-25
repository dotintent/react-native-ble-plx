import React, { useState } from 'react'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Device } from 'react-native-ble-plx'
import { ScrollView } from 'react-native'
import type { TestStateType } from '../../../types'
import { BLEService } from '../../../services'
import type { MainStackParamList } from '../../../navigation/navigators'
import { AppButton, AppTextInput, ScreenDefaultContainer, TestStateDisplay } from '../../../components/atoms'
import { deviceTimeService } from '../../../consts/nRFDeviceConsts'

type Issue1113TestScreenProps = NativeStackScreenProps<MainStackParamList, 'ISSUE_1113_TEST_SCREEN'>

export function Issue1113TestScreen(_props: Issue1113TestScreenProps) {
  const [expectedDeviceName, setExpectedDeviceName] = useState('')
  const [testScanDevicesState, setTestScanDevicesState] = useState<TestStateType>('WAITING')

  const checkDeviceName = (device: Device) =>
    device.name?.toLocaleLowerCase() === expectedDeviceName.toLocaleLowerCase()

  const issue1113Test = async () => {
    setTestScanDevicesState('IN_PROGRESS')
    await BLEService.initializeBLE()
    await BLEService.scanDevices(
      async (device: Device) => {
        if (checkDeviceName(device)) {
          BLEService.issue1113Test(device.id)
        }
      },
      [deviceTimeService]
    )
  }

  return (
    <ScreenDefaultContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <AppTextInput
          placeholder="Device name to connect"
          value={expectedDeviceName}
          onChangeText={setExpectedDeviceName}
        />
        <AppButton label="Issue 1113 test" onPress={issue1113Test} />
        <TestStateDisplay label="Looking for device" state={testScanDevicesState} />
      </ScrollView>
    </ScreenDefaultContainer>
  )
}
