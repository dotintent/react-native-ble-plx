<h1 align="center" >
  <a href="https://github.com/dotintent/react-native-ble-plx"><img style="max-height: 300px;" alt="react-native-ble-plx" src="logo.png" /></a>
</h1>

This guide is an introduction to BLE stack and APIs exported by this library. All examples
will be based on CC2541 SensorTag.

### Install and prepare package

In the case of Expo, you will need to prepare a plugin config, detailed information can be found here: https://github.com/dotintent/react-native-ble-plx?tab=readme-ov-file#expo-sdk-43
In the case of react native CLI you need to configure two environments:

- [iOS](https://github.com/dotintent/react-native-ble-plx?tab=readme-ov-file#ios-example-setup)
- [Android](https://github.com/dotintent/react-native-ble-plx?tab=readme-ov-file#android-example-setup)

### Creating BLE Manager

First step is to create BleManager instance which is an entry point to all available APIs. It should be declared **OUTSIDE the life cycle of React**. Make sure to create it after application started its execution. We can keep it as a static reference by either creating our own abstraction (ex.1) or by simply creating a new instance (ex.2).

#### Ex.1

```ts
import { BleManager } from 'react-native-ble-plx'

// create your own singleton class
class BLEServiceInstance {
  manager: BleManage

  constructor() {
    this.manager = new BleManager()
  }
}

export const BLEService = new BLEServiceInstance()
```

#### Ex.2

```ts
import { BleManager } from 'react-native-ble-plx'

export const manager = new BleManager()
```

Only _one_ instance of BleManager is allowed. When you don't need any BLE functionality you can destroy created instance by calling `manager.destroy()` function. You can then recreate `BleManager` later on.

Note that you may experience undefined behavior when calling a function on one `BleManager` and continuing with another instance. A frequently made error is to create a new instance of the manager for every re-render of a React Native Component.

### Ask for permissions

Check if you requested following permissions

- PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
- PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN (necessary for api 31+ )
- PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT (necessary for api 31+ )

eg.

```js
requestBluetoothPermission = async () => {
  if (Platform.OS === 'ios') {
    return true
  }
  if (Platform.OS === 'android' && PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION) {
    const apiLevel = parseInt(Platform.Version.toString(), 10)

    if (apiLevel < 31) {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)
      return granted === PermissionsAndroid.RESULTS.GRANTED
    }
    if (PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN && PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT) {
      const result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      ])

      return (
        result['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
        result['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
        result['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
      )
    }
  }

  this.showErrorToast('Permission have not been granted')

  return false
}
```

With `neverForLocation` flag active, you can remove `ACCESS_FINE_LOCATION` permissions ask e.g.:

```js
const result = await PermissionsAndroid.requestMultiple([
  PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
  PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
])

return (
  result['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
  result['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED
)
```

### Waiting for Powered On state

When iOS application launches BLE stack is not immediately available and we need to check its status.
To detect current state and following state changes we can use `onStateChange()` function:

```js
React.useEffect(() => {
  const subscription = manager.onStateChange(state => {
    if (state === 'PoweredOn') {
      scanAndConnect()
      subscription.remove()
    }
  }, true)
  return () => subscription.remove()
}, [manager])
```

### Scanning devices

Devices needs to be scanned first to be able to connect to them. There is a simple function
which allows only one callback to be registered to handle detected devices:

```js
function scanAndConnect() {
  manager.startDeviceScan(null, null, (error, device) => {
    if (error) {
      // Handle error (scanning will be stopped automatically)
      return
    }

    // Check if it is a device you are looking for based on advertisement data
    // or other criteria.
    if (device.name === 'TI BLE Sensor Tag' || device.name === 'SensorTag') {
      // Stop scanning as it's not necessary if you are scanning for one device.
      manager.stopDeviceScan()

      // Proceed with connection.
    }
  })
}
```

It is worth to note that scanning function may emit one device multiple times. However
when device is connected it won't broadcast and needs to be disconnected from central
to be scanned again. Only one scanning listener can be registered.

#### Bluetooth 5 Advertisements in Android

To see devices that use Bluetooth 5 Advertising Extension you have to set the `legacyScan` variable to `false` in {@link #scanoptions|Scan options} when you are starting {@link #blemanagerstartdevicescan|BleManager.startDeviceScan()},

### Connecting and discovering services and characteristics

Once device is scanned it is in disconnected state. We need to connect to it and discover
all services and characteristics it contains. Services may be understood
as containers grouping characteristics based on their meaning. Characteristic is a
container for a value which can be read, written and monitored based on available
capabilities. For example connection may look like this:

```js
device
  .connect()
  .then(device => {
    return device.discoverAllServicesAndCharacteristics()
  })
  .then(device => {
    // Do work on device with services and characteristics
  })
  .catch(error => {
    // Handle errors
  })
```

Discovery of services and characteristics is required to be executed once per connection\*.
It can be a long process depending on number of characteristics and services available.

\* Extremely rarely, when peripheral's service/characteristic set can change during a connection
an additional service discovery may be needed.

### Read, write and monitor values

After successful discovery of services you can call

- {@link #blemanagerreadcharacteristicfordevice|BleManager.readCharacteristicForDevice()},
- {@link #blemanagerwritecharacteristicwithresponsefordevice|BleManager.writeCharacteristicWithResponseForDevice()},
- {@link #blemanagermonitorcharacteristicfordevice|BleManager.monitorCharacteristicForDevice()}

and other functions which are described in detail in documentation. You can also check our _example app_ which is available in the repository.
