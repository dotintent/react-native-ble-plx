import React, { useContext } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'

import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

import { BLEmanager } from '../../../index'
import PrimaryButton from '../../components/PrimaryButton'
import { showToast } from '../../utils/showToast'
import { DevicesContext } from '../../contexts/DevicesContext'
import { LoadingIndicator } from '../../components/LoadingIndicator'
import { CharacteristicsCard } from '../../components/CharacteristicsCard'
import { ServicesCard } from '../../components/ServicesCard'

export const DeviceDetailsScreen = () => {
  const [isLoading, setIsLoading] = React.useState(false)
  const [characteristics, setCharacteristics] = React.useState({})
  const [services, setServices] = React.useState([])

  const navigation = useNavigation()
  const route = useRoute()

  const [devices, setDevices] = useContext(DevicesContext)
  const device  = route?.params?.device || {}


  React.useEffect(() => {
    navigation.setOptions({ headerTitle: device.name || device.localName || 'No name' })
    handleDeviceCharacteristics(device.id)
    handleDeviceServices(device.id)
  }, [device])

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

  const handleDeviceCharacteristics = async (deviceId) => {
    handleStartLoading()
    try {
      const deviceCharacteristics = await BLEmanager.discoverAllServicesAndCharacteristicsForDevice(deviceId)
      for (const characteristic in deviceCharacteristics) {
        if (deviceCharacteristics[characteristic] === null) deviceCharacteristics[characteristic] = 'null'
      }
      setCharacteristics(deviceCharacteristics)
      console.log('Device characteristics: ', deviceCharacteristics) 
    } catch (error) {
      showToast('error', error.message, error.name)
      console.log('Error while getting device characteristics ', error)
    } finally {
      handleStopLoading()
    }
  }

  const handleDeviceServices = async (deviceId) => {
    handleStartLoading()
    try {
      const deviceServices = await BLEmanager.servicesForDevice(deviceId)
      setServices(deviceServices)
      console.log('Device services: ', deviceServices) 
    } catch (error) {
      showToast('error', error.message, error.name)
      console.log('Error while getting device services! ', error)
    } finally {
      handleStopLoading()
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
    <ScrollView
      indicatorStyle="black"
      contentContainerStyle={styles.contentContainer}
    >
      <CharacteristicsCard characteristics={characteristics} />
      <ServicesCard services={services} />
      <LoadingIndicator isLoading={isLoading} />
      <View style={styles.buttonContainer}>
        <PrimaryButton
          onPress={() => handleCancelConnection(device.id)}
          title="Disconnect device"
        />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  card: {
    backgroundColor: '#fff',
    marginBottom: 10,
    padding: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonContainer: {
    marginTop: 15,
  },
})
