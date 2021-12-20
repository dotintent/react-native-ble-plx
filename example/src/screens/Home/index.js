import React, { useContext } from 'react'
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
  View,
  Pressable,
} from 'react-native'

import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Permissions, { PERMISSIONS, RESULTS } from 'react-native-permissions'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { BLEmanager } from '../../../index'
import { showToast } from '../../utils/showToast'
import { DevicesContext } from '../../contexts/DevicesContext'
import { LoadingIndicator } from '../../components/LoadingIndicator'

export const HomeScreen = () => {
  const [isLoading, setIsLoading] = React.useState(false)
  const [isScanning, setIsScanning] = React.useState(false)
  const [bluetoothPermission, setBluetoothPermission] = React.useState(null)

  const [devices, setDevices] = useContext(DevicesContext)

  const navigation = useNavigation();

  React.useEffect(() => {
    handleBluetoothPermissions()
  }, [])

  React.useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          hitSlop={40}
          onPress={isScanning ? handleStopDeviceScan : handleStartDeviceScan}
        >
          <Text style={{ color: isScanning ? 'green' : 'black' }}>
            {`Scan: ${!isScanning ? 'Off' : 'On'}`}
          </Text>
        </Pressable>
      ),
    })
  }, [isScanning, bluetoothPermission])

  const handleBluetoothPermissions = async () => {
    const permissionStatus = await Permissions.check(PERMISSIONS.IOS.BLUETOOTH_PERIPHERAL)
    permissionStatus === RESULTS.GRANTED ? setBluetoothPermission(true) : setBluetoothPermission(false)
  }

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
          const duplicatIndex = prevState.findIndex(item => item.id === duplicat.id)
          prevState[duplicatIndex].rssi = device.rssi
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
      style={[styles.deviceCard, item.isConnected && { backgroundColor: '#e2fce1' }]}
    >
      <View style={styles.iconWrapper}>
        <Icon style={styles.icon} name="devices" size={25} />
        <Text style={[styles.deviceName, { marginLeft: 10 }]}>{item.name || item.localName || 'No name'}</Text>
      </View>
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
    <SafeAreaView edges={['left', 'right']} style={styles.container}>
      <FlatList
        data={devices}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        style={styles.flatList}
        indicatorStyle="black"
        contentContainerStyle={{ paddingBottom: 30 }}
      />
      <LoadingIndicator isLoading={isLoading} />
      {!bluetoothPermission ? (
        <Text style={styles.permissionText}>
          No bluetooth permissions granted!
        </Text>
      ) : null}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  deviceCard: {
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
  },
  permissionText: {
    color: 'red',
    fontWeight: '600',
  },
  iconWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  icon: {
    marginLeft: -10,
  },
})
