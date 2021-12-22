import React, { useContext } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'

import { useNavigation, useRoute } from '@react-navigation/native';

import { BLEmanager } from '../../../index'
import PrimaryButton from '../../components/PrimaryButton'
import { showToast } from '../../utils/showToast'
import { DevicesContext } from '../../contexts/DevicesContext'
import { LoadingIndicator } from '../../components/LoadingIndicator'
import { DeviceDetailsCard } from '../../components/DeviceDetailsCard'
import { ServicesCard } from '../../components/ServicesCard'

export const DeviceDetailsScreen = () => {
  const [isLoading, setIsLoading] = React.useState(false)
  const [services, setServices] = React.useState([])
  const [servicesAndcharacteristics, setServicesAndcharacteristics] = React.useState([])

  const navigation = useNavigation()
  const route = useRoute()

  const [devices, setDevices] = useContext(DevicesContext)
  const device  = route?.params?.device || {}


  React.useEffect(() => {
    navigation.setOptions({
      headerTitle: device.name || device.localName || 'No name',
      headerStyle: { backgroundColor: '#e8e6e6' },
    })
    discoverServicesAndCharacteristics(device.id)
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

  const discoverServicesAndCharacteristics = async (deviceId) => {
    handleStartLoading()
    try {
      const deviceDetails = await BLEmanager.discoverAllServicesAndCharacteristicsForDevice(deviceId)
      console.log('Device details: ', deviceDetails)
    } catch (error) {
      showToast('error', error.message, error.name)
      console.log('Error while discovering all services and characteristics ', error)
    } finally {
      handleStopLoading()
    }
  }

  const handleDeviceServices = async (deviceId) => {
    handleStartLoading()
    try {
      const deviceServices = await BLEmanager.servicesForDevice(deviceId)
      setServices(deviceServices)
      handleDeviceCharacteristics(deviceServices)
      console.log('Device services: ', deviceServices) 
    } catch (error) {
      showToast('error', error.message, error.name)
      console.log('Error while getting device services! ', error)
    } finally {
      handleStopLoading()
    }
  }

  const handleDeviceCharacteristics = async (deviceServices) => {
    const deviceServicesAndCharacteristics = []
    handleStartLoading()
    for (const service of deviceServices) {
      try {
        const serviceCharacteristics = await BLEmanager.characteristicsForDevice(device.id, service.uuid)
        deviceServicesAndCharacteristics.push({ ...service, characteristics: serviceCharacteristics })
      } catch (error) {
        showToast('error', error.message, error.name)
        console.log('Error while getting device characteristics! ', error)
      }
    }
    setServicesAndcharacteristics(deviceServicesAndCharacteristics)
    handleStopLoading()
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
      <DeviceDetailsCard deviceDetails={device} />
      <ServicesCard servicesAndcharacteristics={servicesAndcharacteristics} />
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
