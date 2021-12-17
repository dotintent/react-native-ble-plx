import React, { useContext } from 'react'
import { View, Text } from 'react-native'

import { useNavigation, useRoute } from '@react-navigation/native';

import { BLEmanager } from '../../../index'
import PrimaryButton from '../../components/PrimaryButton'
import { showToast } from '../../utils/showToast'
import { DevicesContext } from '../../contexts/DevicesContext'

export const DeviceDetailsScreen = () => {
  const [isLoading, setIsLoading] = React.useState(false)

  const navigation = useNavigation()
  const route = useRoute()

  const device  = route?.params?.device || {}

  const devices = useContext(DevicesContext)

  React.useEffect(() => {
    navigation.setOptions({ headerTitle: device.name || device.localName || 'No name' })
  }, [])

  const handleCancelConnection = async (deviceId) => {
    handleStartLoading()
    try {
      const disconnectedDevice = await BLEmanager.cancelDeviceConnection(deviceId)
      console.log('Connection cancelled succesfully: ', disconnectedDevice)
      showToast('success', 'Disconnected from device')

      // handleConnectionStatus(disconnectedDevice, false)
    } catch (error) {
      showToast('error', error.message, error.name)
      console.log('Error! Connection cancellation: ', error)
    } finally {
      handleStopLoading()
      navigation.goBack()
    }
  }

  const handleStartLoading = () => setIsLoading(true)
  const handleStopLoading = () => setIsLoading(false)

  return (
    <View style={{flex: 1}}>
      <PrimaryButton
        onPress={() => handleCancelConnection(device.id)}
        title="Disconnect device"
      />
    </View>
  )
}

