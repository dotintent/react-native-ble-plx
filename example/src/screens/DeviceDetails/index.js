import React, { useContext } from 'react'
import { View, Text, StyleSheet } from 'react-native'

import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

import { BLEmanager } from '../../../index'
import PrimaryButton from '../../components/PrimaryButton'
import { showToast } from '../../utils/showToast'
import { DevicesContext } from '../../contexts/DevicesContext'
import { LoadingIndicator } from '../../components/LoadingIndicator'

export const DeviceDetailsScreen = () => {
  const [isLoading, setIsLoading] = React.useState(false)

  const navigation = useNavigation()
  const route = useRoute()

  const [devices, setDevices] = useContext(DevicesContext)
  const device  = route?.params?.device || {}


  React.useEffect(() => {
    navigation.setOptions({ headerTitle: device.name || device.localName || 'No name' })
  }, [])

  const handleCancelConnection = async (deviceId) => {
    handleStartLoading()
    try {
      const disconnectedDevice = await BLEmanager.cancelDeviceConnection(deviceId)
      console.log('Connection cancelled succesfully: ', disconnectedDevice)
      showToast('success', 'Disconnected from device')

      handleConnectionStatus(disconnectedDevice, false)
    } catch (error) {
      showToast('error', error.message, error.name)
      console.log('Error! Connection cancellation: ', error)
    } finally {
      handleStopLoading()
      navigation.goBack()
    }
  }

  const handleConnectionStatus = (handledDevice, isConnected) => {
    const deviceIndex = devices.findIndex(device => device.id === handledDevice.id)
    const devicesArr = JSON.parse(JSON.stringify(devices))
    devicesArr[deviceIndex] = { ...devicesArr[deviceIndex], isConnected }
    setDevices(devicesArr)
  }

  const handleStartLoading = () => setIsLoading(true)
  const handleStopLoading = () => setIsLoading(false)

  return (
    <SafeAreaView style={styles.container}>
      <View style={{flex: 1}} />
      <LoadingIndicator isLoading={isLoading} />
      <PrimaryButton
        onPress={() => handleCancelConnection(device.id)}
        title="Disconnect device"
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
})
