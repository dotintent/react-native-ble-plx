import React from 'react'
import {
  SafeAreaView,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  View,
} from 'react-native'

import Toast from 'react-native-toast-message';

import { BLEmanager } from './index'
import PrimaryButton from './src/components/PrimaryButton'

const App = () => {
  const [isLoading, setIsLoading] = React.useState(false)
  const [isScanning, setIsScanning] = React.useState(false)
  const [devices, setDevices] = React.useState([])

  React.useEffect(() => {
    const subscription = BLEmanager.onStateChange((state) => {
      console.log('BLE stack status: ', state)
    }, true);
    return () => subscription.remove();
  }, [BLEmanager]);

  const handleStartDeviceScan = () => {
    setIsScanning(true)
    handleStartLoading()
    console.log('Scanning started!')

    BLEmanager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        showToast('error', error.message, error.name)
        console.log('Error! Scanning devices: ', error)
        return
      }

      setDevices(prevState => {
        const duplicat = prevState.find(item => item.id === device.id)
        if (!duplicat) {
          return [...prevState, {...device, isConnected: false}]
        } else {
          return [...prevState]
        }
      })
    })
    handleStopLoading()
  }

  const handleStopDeviceScan = () => {
    setIsScanning(false)
    handleStartLoading()
    BLEmanager.stopDeviceScan();
    handleStopLoading()
    console.log('Scanning stopped!')
  }

  const handleConnectToDevice = async (deviceId) => {
    handleStartLoading()
    try {
      const connectedDevice = await BLEmanager.connectToDevice(deviceId)
      console.log('Connected to device: ', connectedDevice)

      const connectedDeviceIndex = devices.findIndex(device => device.id === connectedDevice.id)
      const devicesArr = devices
      devicesArr[connectedDeviceIndex] = { ...devicesArr[connectedDeviceIndex], isConnected: true }
      setDevices(devicesArr)

      const characteristics = await connectedDevice.discoverAllServicesAndCharacteristics()
      console.log('Device services and characteristics: ', characteristics) 
    } catch (error) {
      showToast('error', error.message, error.name)
      console.log('Error! Connecting to device: ', error)
    } finally {
      handleStopLoading()
    }
  }

  const handleCancelConnection = async (deviceId) => {
    handleStartLoading()
    try {
      const response = await BLEmanager.cancelDeviceConnection(deviceId)
      console.log('Connection cancelled succesfully: ', response)

      const connectedDeviceIndex = devices.findIndex(device => device.id === response.id)
      const devicesArr = devices
      devicesArr[connectedDeviceIndex] = { ...devicesArr[connectedDeviceIndex], isConnected: false }
      setDevices(devicesArr)
    } catch (error) {
      showToast('error', error.message, error.name)
      console.log('Error! Connection cancellation: ', error)
    } finally {
      handleStopLoading()
    }
  }

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      onPress={() => {
        item.isConnected ? handleCancelConnection(item.id) : handleConnectToDevice(item.id)
      }}
      style={[styles.device, item.isConnected && { backgroundColor: '#e2fce1' }]}
    >
      <Text>name: {item.name || item.localName || 'No name'}</Text>
      <Text>id: {item.id}</Text>
      <Text>rssi: {item.rssi}</Text>
      <Text>
        connected: 
        <Text style={item.isConnected && styles.deviceConnectedText}>
          {item.isConnected.toString()}
        </Text>
      </Text>
    </TouchableOpacity>
  )

  const showToast = (type, message, title) => {
    Toast.show({
      type,
      text1: title || null,
      text2: message
    });
  }

  const handleStartLoading = () => setIsLoading(true)
  const handleStopLoading = () => setIsLoading(false)

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={devices}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        style={styles.flatList}
      />
      {isLoading && <ActivityIndicator size="large" />}
      <View style={styles.buttonContainer}>
        <PrimaryButton
          onPress={isScanning ? handleStopDeviceScan : handleStartDeviceScan}
          title={`Scan devices: ${!isScanning ? 'Off' : 'On'}`}
          isScanning={isScanning}
        />
      </View>
      <Toast />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#EAEBF8',
    paddingLeft: 20,
  },
  device: {
    backgroundColor: '#fff',
    marginBottom: 10,
    padding: 5,
    alignItems: 'center',
  },
  deviceConnectedText: {
    color: 'green',
    fontWeight: 'bold',
  },
  buttonContainer: {
    marginVertical: 15,
  },
  flatList: {
    padding: 10,
  }
})

export default App
