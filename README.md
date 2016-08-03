# react-native-ble-plx
React Native Bluetooth Low Energry library using [RxBluetoothKit](https://github.com/Polidea/RxBluetoothKit) and [RxAndroidBle](https://github.com/Polidea/RxAndroidBle) as it's backend libraries.

## Installing and running example app
* Go to example project folder `cd examples/ReactBLEScanner`.
* Install required packages executing: `npm install`.
* **iOS**: Open Xcode example project in `./examples/ReactBLEScanner/ios/ReactBLEScanner.xcodeproj`.
* **Android**: Open Android example project in `./examples/ReactBLEScanner/android`. 
* Build and run.

## Developing modules and example app

You can use included scripts to sync files between this repository root and `node_module/react-native-ble-plx` if want to work on local copy of library:
* `./install-ble-lib.sh` - move files from root to `node_module/react-native-ble-plx`.
* `./sync-ble-lib.sh` - move files from `node_module/react-native-ble-plx` to root.

Scripts are located in `./examples/ReactBLEScanner` folder.

**Warning**: This operation may delete files on destination directory.

### Additional configuration for iOS

**TODO**

## Configuration & installation for new project

**TODO** 

## JavaScript API

First of all include `BleModule` in react native project:

```javascript
import { BleManager } from 'react-native-ble-plx';
```

`BleManager` should be initialized with `new` keyword and method `destroy()` should be called 
on it's instance when we are done with it:

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
* `listener(newState)` - callback which emits state changes of BLE Manager. 
  Setting this value to `null` or to other listener will unregister callback. 
  Accepted values passed in parameter are:
  * `'Unknown'` - the current state of the manager is unknown; an update is imminent.
  * `'Resetting'` - the connection with the system service was momentarily lost; an update is imminent.
  * `'Unsupported'` - the platform does not support Bluetooth low energy.
  * `'Unauthorized'` - the app is not authorized to use Bluetooth low energy.
  * `'PoweredOff'` - Bluetooth is currently powered off.
  * `'PoweredOn'` - Bluetooth is currently powered on and available to use. 

**TODOs**: 
* Should we allow user to register/unregister multiple listeners?

### Scanning devices

#### `startDeviceScan(uuids, options, listener)`
Starts device scanning. When previous scan is in progress it will be stopped before executing this command.

*Parameters*:
* `uuids` - array of strings containing UUIDs of services which we would like have in 
  scanned devices. If `null` it will scan all available devices.
* `options` - object containing platform specific options, which can be enabled for 
  scanning (can be `null`):

```javascript
{
    "allowDuplicates": bool, // Devices will be scanned more frequently if true, by default false
}
```

* `listener(error, scannedDevice)` - function which will be called for every scanned device (devices 
   may be scanned multiple times). It's first argument is potential error which is set to non 
   `null` value when scanning failed. You have to start scanning process again if that happens. 
   Second argument is a scanned `device` passed as an object with following fields:

```javascript
{
    "uuid": string,         // UUID of scanned device (for iOS it's local identifier)
    "name": string,         // device name if present or null otherwise
    "rssi": number,         // RSSI value during scanning
    "connectable": boolean, // Is device connectable

    // Utility functions
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
#### `async device.disconnect()`
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
  disconnection if available and `device` object. Setting listener removes previous one.

---
#### `device.onDisconnected(listener)`
Utility function which monitors if device was disconnected due to any errors or connection problems.

*Parameters*:
* Look above.

**TODOs**:
* Should utility functions be mutating or pure?

### Discovery

#### `async discoverAllServicesAndCharacteristicsForDevice(identifier)`
Discovers all services and characteristics for device.

*Parameters*:
* `identifier` - device UUID.
* **returns** - `device` object if all available services and characteristics have been discovered.

---
#### `async device.discoverAllServicesAndCharacteristics()`
Discovers all services and characteristics for device.

*Parameters*:
* Look above.

### Services

#### `servicesForDevice(identifier)`
Get list of discovered services for device.

*Parameters*:
* `identifier` - device UUID.
* **returns** - array of `service` objects which are discovered for a device:

```javascript
{
    "uuid": string,       // Service UUID
    "isPrimary": boolean, // Is service primary 

    // Utility functions
}
```

#### `device.services()`
Utility function to get list of discovered services for device.

*Parameters*:
* Look above.

### Characteristics

#### `characteristicsForDevice(identifier, serviceUUID)`
Get list of discovered characteristics.

*Parameters*:
* `identifier` - device UUID.
* `serviceUUID` - service UUID.
* **returns** - array of `characteristic` objects which are discovered for a device in specified service:

```javascript
{
    "uuid": string,                         // Characteristic UUID
    "isReadable": boolean,                  // Is characteristic readable
    "isWriteableWithResponse": boolean,     // Is characteristic writeable when writing with response
    "isWriteableWithoutResponse": boolean,  // Is characteristic writeable when writing without response
    "isNotifiable": boolean,                // Is characteristic notifiable
    "isIndictable": boolean,                // Is characteristic indictable
    "value": string,                        // Base64 value, may be null 
}
```

---
#### `device.characteristicsForService(serviceUUID)`
Utility function to get list of discovered characteristics in specified service for device.

*Parameters*:
* Look above.

---
#### `service.characteristics()`
Utility function to get list of discovered characteristics for a service.

*Parameters*:
* Look above.

---
#### `async readCharacteristicForDevice(identifier, serviceUUID, characteristicUUID)`
Read characteristic value.

*Parameters*:
* `identifier` - device UUID.
* `serviceUUID` - service UUID.
* `characteristicUUID` - characteristic UUID.
* **returns** - promise which emits first `characteristic` object matching specified UUID paths. 
                Latest value of characteristic will be stored.  

```javascript
{
    "uuid": string,                         // Characteristic UUID
    "isReadable": boolean,                  // Is characteristic readable
    "isWriteableWithResponse": boolean,     // Is characteristic writeable when writing with response
    "isWriteableWithoutResponse": boolean,  // Is characteristic writeable when writing without response
    "isNotifiable": boolean,                // Is characteristic notifiable
    "isIndictable": boolean,                // Is characteristic indictable
    "value": string,                        // Base64 value, may be null 
}
```

---
#### `async device.readCharacteristicForService(serviceUUID, characteristicUUID)`
Read characteristic value.

*Parameters*:
* Look above.

---
#### `async service.readCharacteristic(characteristicUUID)`
Read characteristic value.

*Parameters*:
* Look above.

---
#### `async characteristic.read()`
Read characteristic value.

*Parameters*:
* Look above.

---
#### `async writeCharacteristicWithResponseForDevice(identifier, serviceUUID, characteristicUUID, valueBase64)`
Write characteristic value with response.

*Parameters*:
* `identifier` - device UUID.
* `serviceUUID` - service UUID.
* `characteristicUUID` - characteristic UUID.
* `valueBase64` - value in Base64 format.
* **returns** - promise which emits first `characteristic` object matching specified UUID paths. 
                Latest value of characteristic will be stored.  

---
#### `async device.writeCharacteristicWithResponseForService(serviceUUID, characteristicUUID, valueBase64)`
Write characteristic value with response.

*Parameters*:
* Look above.

---
#### `async service.writeCharacteristicWithResponse(characteristicUUID, valueBase64)`
Write characteristic value with response.

*Parameters*:
* Look above.

---
#### `async characteristic.writeWithResponse(valueBase64)`
Write characteristic value with response.

*Parameters*:
* Look above.

---
#### `async writeCharacteristicWithoutResponseForDevice(identifier, serviceUUID, characteristicUUID, valueBase64)`
Write characteristic value without response.

*Parameters*:
* `identifier` - device UUID.
* `serviceUUID` - service UUID.
* `characteristicUUID` - characteristic UUID.
* `valueBase64` - value in Base64 format.
* **returns** - promise which emits first `characteristic` object matching specified UUID paths. 
                Latest value of characteristic will be stored.

---
#### `async device.writeCharacteristicWithoutResponseForService(serviceUUID, characteristicUUID, valueBase64)`
Write characteristic value without response.

*Parameters*:
* Look above.

---
#### `async service.writeCharacteristicWithoutResponse(characteristicUUID, valueBase64)`
Write characteristic value without response.

*Parameters*:
* Look above.

---
#### `async characteristic.writeWithoutResponse(valueBase64)`
Write characteristic value without response.

*Parameters*:
* Look above.

**TODOs:**
* In the future to support multiple characteristics with the same UUID we can add "id" attribute and "id" based
  functions to directly read/write/discover. 
* Should objects contain parent UUID?
* Should we support transactionId parameter for every async operation as an optional value?