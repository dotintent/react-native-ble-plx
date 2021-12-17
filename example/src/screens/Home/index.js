import React, { useContext } from 'react'
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
  View,
} from 'react-native'

import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { BLEmanager } from '../../../index'
import PrimaryButton from '../../components/PrimaryButton'
import { showToast } from '../../utils/showToast'
import { DevicesContext } from '../../contexts/DevicesContext'
import { LoadingIndicator } from '../../components/LoadingIndicator'

export const HomeScreen = () => {
  const [isLoading, setIsLoading] = React.useState(false)
  const [isScanning, setIsScanning] = React.useState(false)

  const [devices, setDevices] = useContext(DevicesContext)

  const navigation = useNavigation();

  React.useEffect(() => {
    const subscription = BLEmanager.onStateChange((state) => {
      console.log('BLE stack status: ', state)
    }, true);
    return () => subscription.remove();
  }, [BLEmanager]);

  const handleNavigateToDeviceDetails = (device) => {
    navigation.navigate('DeviceDetails', { device })
  }

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
      console.log('Scanned device: ', device)

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
      showToast('success', 'Connected to device')

      handleConnectionStatus(connectedDevice, true)

      const characteristics = await connectedDevice.discoverAllServicesAndCharacteristics()
      console.log('Device services and characteristics: ', characteristics) 
    } catch (error) {
      showToast('error', error.message, error.name)
      console.log('Error! Connecting to device: ', error)
    } finally {
      handleStopLoading()
    }
  }

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      onPress={() => {
        item.isConnected ? handleNavigateToDeviceDetails(item) : handleConnectToDevice(item.id)
      }}
      style={[styles.device, item.isConnected && { backgroundColor: '#e2fce1' }]}
    >
      <Text style={styles.deviceName}>{item.name || item.localName || 'No name'}</Text>
      <Text style={styles.deviceParam}>
        {`ID: `}
        <Text style={styles.deviceParamValue}>
          {item.id}
        </Text>
      </Text>
      <Text style={styles.deviceParam}>
        {`RSSI: `}
        <Text style={styles.deviceParamValue}>
          {item.rssi}
        </Text>
      </Text>
      <Text style={styles.deviceParam}>
        {`Connected: `} 
        <Text style={item.isConnected ? styles.deviceConnectedText : styles.deviceParamValue}>
          {item.isConnected.toString()}
        </Text>
      </Text>
    </TouchableOpacity>
  )

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
      <FlatList
        data={devices}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        style={styles.flatList}
        indicatorStyle="black"
      />
      <LoadingIndicator isLoading={isLoading} />
      <View style={styles.buttonContainer}>
        <PrimaryButton
          onPress={isScanning ? handleStopDeviceScan : handleStartDeviceScan}
          title={`Scan devices: ${!isScanning ? 'Off' : 'On'}`}
          isScanning={isScanning}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#EAEBF8',
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  device: {
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
  deviceConnectedText: {
    color: 'green',
    fontWeight: 'bold',
  },
  buttonContainer: {
    marginVertical: 15,
    paddingHorizontal: 20,
    width: '100%',
  },
  flatList: {
    padding: 10,
  },
  deviceName: {
    fontWeight: 'bold',
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 5,
  },
  deviceParam: {
    fontWeight: '500',
  },
  deviceParamValue: {
    fontWeight: 'normal',
    fontSize: 13,
  }
})
