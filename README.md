# react-native-ble-plx
React Native Bluetooth Low Energry library using [RxBluetoothKit](https://github.com/Polidea/RxBluetoothKit) and [RxAndroidBle](https://github.com/Polidea/RxAndroidBle) as it's backend libraries.

### iOS example app installation steps
* Go to example project folder `cd examples/ReactBLEScanner`.
* Install standard packages executing: `npm install`.
* Install local `react-native-ble-plx` module by executing script `./install-ble-lib.sh`.
* Go to folder containing native framework in `cd ./node_modules/react-native-ble-plx/ios/BleClientManager`.
* Fetch required dependencies: `carthage bootstrap --no-build --platform "iOS"`.
* Build all dependencies including local framework: `carthage build --no-skip-current --platform "iOS"` (it will take a while but it's done only once).
* Open Xcode example project in `./examples/ReactBLEScanner/ios/ReactBLEScanner.xcodeproj`.
* Build and run.

You can develop native modules directly from example Xcode project. After work is done you can sync your changes to be visible in git by executing `./sync-ble-lib.sh` from `./examples/ReactBLEScanner` folder. *Note*: Your working files in root directory may be deleted by this operation.

### Installation in fresh react-native project

Installation description will be available as soon as library will be published in npm repository. 

## JavaScript API

First of all include `BleModule` in react native project: 
```javascript
import { BleManager } from 'react-native-ble-plx';
```

`BleManager` should be initialized with `new` keyword and method `destroy()` should be called on it's instance when we are done
with it:
```javascript
const manager = new BleManager()
// Work with BLE manager
manager.destroy()
```

**TODOs**: 
* Should we allow optional parameters during initialization?

### Manager state

#### `onStateChange(listener)` 
Checks current manager state.

*Parameters*:
* `listener(newState)` - callback which emits state changes of BLE Manager. Setting this value to `null` or to other listener will unregister callback. Accepted values passed in parameter are:
  * `'Unknown'` - the current state of the manager is unknown; an update is imminent.
  * `'Resetting'` - the connection with the system service was momentarily lost; an update is imminent.
  * `'Unsupported'` - the platform does not support Bluetooth low energy.
  * `'Unauthorized'` - the app is not authorized to use Bluetooth low energy.
  * `'PoweredOff'` - bluetooth is currently powered off.
  * `'PoweredOn'` - bluetooth is currently powered on and available to use. 

**TODOs**: 
* Should we allow registering/deregistering multiple listeners?

### Scanning devices

#### `startDeviceScan(uuids, options, listener)`
Starts device scanning. When previous scan is in progress it will be stopped before executing this command.

*Parameters*:
* `uuids` - array of strings containing UUIDs of services which we would like have in scanned devices. If `null` it will scan all avaiable devices.
* `options` - object containing platform specific options, which can be enabled for scanning (can be `null`):

```javascript
{
    "allowDuplicates": bool, // Devices will be scanned more frequently if true, by default false
}
```

* `listener(error, scannedDevice)` - function which will be called for every scanned device (devices 
   may be scanned multiple times). It's first argument is potential error which is set to non 
   `null` value when scanning failed. You have to start scanning process again if that happens. 
   Second argument is a scanned device passed as an object with following fields:

```javascript
{
    "uuid": string, // UUID of scanned device (for iOS it's local identifier)
    "name": string, // device name if present or null otherwise
    "rssi": number, // RSSI value during scanning
}
```

---
#### `stopDeviceScan()`
Stops scanning if in progress. Does nothing otherwise.

**TODOs**: 

* Should we pass listener directly or register for events? - then second variant will be better and 
  we could skip second argument of `startDeviceScan`. 
* Returned object could be a `device` which may contain additional functions.
* Should options keys be exported as constants?
* Should we wait for `poweredOn` state before scanning or return an error when phone is not ready?
* How should we handle timeout? From JS side just by calling `stopDeviceScan()`?

### Connection management

#### `async connectToDevice(identifier, [options])` 
Connects to device with provided UUID.

*Parameters*:
* `identifier` - device UUID
* `options` - platform specific options for connection establishment (may be `null` or ignored):
```javascript
{
    // Not used yet
}
```
* **returns** - promise which will return connected `device` object if successful:
```javascript
{
    "uuid": string, // UUID of scanned device (for iOS it's local identifier)
    ... // Other device fields
}
```

---
#### `async device.connect([options])`
Utility function which can be used on device object directly without need to pass device UUID.

*Parameters*:
* Look above.

---
#### `async disconnectFromDevice(identifier)`
Disconnects from device if it's connected.

*Parameters*:
* `identifier` - device UUID.
* **returns** - a promise with `device` object as a result or an error.

---
#### `async device.disconnect(identifier)`
Utility function which disconnects from device if it's connected.

*Parameters*:
* Look above.

---
#### `isDeviceConnected(identifier)`
Check connection state of a device.

*Parameters*:
* `identifier` - device UUID.
* **returns** - `true` if device is connected, otherwise `false`.

---
#### `device.isConnected()`
Utility function which checks connection state of a device.

*Parameters*:
* Look above.

---
#### `onDeviceDisconnected(identifier, listener)`
Monitors if device was disconnected due to any errors or connection problems.

*Parameters*:
* `identifier` - device UUID.
* `listener(error, device)` - callback returning error as a reason of 
  disconnection if available and `device` object. Setting listener unregisters previous one.

---
#### `device.onDisconnected(identifier, listener)`
Utility function which monitors if device was disconnected due to any errors or connection problems.

*Parameters*:
* Look above.

 **TODOs**:
 * Should utility functions be mutating or pure?
