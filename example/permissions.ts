import { Platform, PermissionsAndroid } from 'react-native'

export async function checkBluetoothPermissionsAsync() {
  if (Platform.OS === 'ios') {
    // Handled in static pList from app.json
    return true
  }
  let isOk = false

  isOk = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN)
  if (!isOk) {
    console.log(`Checked permission BLUETOOTH_SCAN is ${isOk}`)
    return false
  }

  isOk = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT)
  if (!isOk) {
    console.log(`Checked permission BLUETOOTH_CONNECT is ${isOk}`)
    return false
  }

  isOk = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)
  if (!isOk) {
    console.log(`Checked permission ACCESS_FINE_LOCATION is ${isOk}`)
    return false
  }

  return isOk
}

export async function requestBluetoothPermissionsAsync() {
  if (Platform.OS === 'ios') {
    // Handled in static pList from app.json
    return true
  }
  const status = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
  ])

  for (const key in status) {
    if (status[key] !== PermissionsAndroid.RESULTS.GRANTED) {
      console.log(`Permission ${key} not GRANTED = ${status[key]}`)
      return false
    }

    return true
  }
}
