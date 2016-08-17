# react-native-ble-plx
React Native Bluetooth Low Energry library using [RxBluetoothKit](https://github.com/Polidea/RxBluetoothKit) and [RxAndroidBle](https://github.com/Polidea/RxAndroidBle) as it's backend libraries.



## Configuration & installation for new project

**iOS:**
* Add `react-native-ble-plx` to a project as a dependency in `package.json` file. 
  For example `"react-native-ble-plx": "Polidea/react-native-ble-plx"` will install
  latest version from Polidea's Github repository.
* Execute `npm install` to fetch and install a library.
* Open iOS project located in `./ios` folder.
* Move `BleClient.xcodeproj` located in `.node_modules/react-native-ble-plx/ios` 
  using drag & drop to `Libraries` folder in your project.
* In general settings of a project add `libBleClient.a` to Linked Frameworks and Libraries.
* In `Embedded Binaries` add manually frameworks located in `.node_modules/react-native-ble-plx/ios/BleClientManager/Carthage/Build/iOS`: 
  * `BleClientManager.framework`
  * `RxBluetoothKit.framework`
  * `RxSwift.framework`
  * `RxCocoa.framework`
* In `Build Settings`/`Search Paths`/`Framework search paths` add recursive path: `$(SRCROOT)/../node_modules/react-native-ble-plx`.
* In `Build Settings`/`Search Paths`/`Header search paths` add recursive path: `$(SRCROOT)/../node_modules/react-native/React`.  
* In `Build Options`/`Embedded Content Contains Swift Code` set to `true`.
* Minimal supported version of iOS is 8.0

**Android**:
* Add `react-native-ble-plx` to a project as a dependency in `package.json` file. 
  For example `"react-native-ble-plx": "Polidea/react-native-ble-plx"` will install
  latest version from Polidea's Github repository.
* Execute `npm install` to fetch and install a library.
* Open Android project located in `./android` folder.
* In `settings.gradle` add following lines:
``` 
include ':react-native-ble-plx'
project(':react-native-ble-plx').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-ble-plx/android')
```
* In `build.gradle` of `app` module add following dependency:
```
compile project(':react-native-ble-plx')
```
* In `MainApplication.getPackages` add BleModule package:
```
@Override
protected List<ReactPackage> getPackages() {
  return Arrays.<ReactPackage>asList(
    new MainReactPackage(),
    new BlePackage()
  );
}
```
* In `AndroidManifest.xml` add Bluetooth permission: 
```
<uses-permission android:name="android.permission.BLUETOOTH" />
```
* Minimal supported SDK version is 18.

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

### Cancelling operations
 Few operations such as monitoring characteristic's value changes can be cancelled by a user.
 Basically every API entry which accepts `transactionId` allows to call `cancelTransaction` function.
 When cancelled operation is a promise or a callback which registers errors, `"Cancelled"`
 error will be emitted in that case.


#### `cancelTransaction(transactionId)`
Cancels specified transaction if in progress. Otherwise does nothing.

*Parameters*:
* `transactionId` - Unique ID of a transaction to cancel.

### Manager state

#### `async state`
Current state of a manager.

*Returns*: Current state of a manager as a string:
* `'Unknown'` - the current state of the manager is unknown; an update is imminent.
* `'Resetting'` - the connection with the system service was momentarily lost; an update is imminent.
* `'Unsupported'` - the platform does not support Bluetooth low energy.
* `'Unauthorized'` - the app is not authorized to use Bluetooth low energy.
* `'PoweredOff'` - Bluetooth is currently powered off.
* `'PoweredOn'` - Bluetooth is currently powered on and available to use.

---

#### `onStateChange(listener)` 
Notifies about state changes of a manager.

*Parameters*:
* `listener(newState)` - callback which emits state changes of BLE Manager. Look above 
  for possible values.

*Returns*: Subscription on which `remove()` function can be called to unsubscribe. 

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
    "allowDuplicates": bool, // iOS: Devices will be scanned more frequently if true, by default false
    "autoConnect": bool,     // Android: allows to connect to devices which are not in range.
}
```

* `listener(error, scannedDevice)` - function which will be called for every scanned device (devices 
   may be scanned multiple times). It's first argument is potential error which is set to non 
   `null` value when scanning failed. You have to start scanning process again if that happens. 
   Second argument is a scanned `device` passed as an object with following fields:

```javascript
{
    "uuid": string,           // UUID of scanned device (for iOS it's local identifier)
    "name": string,           // device name if present or null otherwise
    "rssi": number,           // RSSI value during scanning
    "isConnectable": boolean, // Is device connectable (Not supported yet)

    // Utility functions
}
```

---
#### `stopDeviceScan()`
Stops scanning if in progress. Does nothing otherwise.

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

*Returns*: promise which will return connected `device` object if successful.

---
#### `async device.connect([options])`
Utility function which can be used on device object directly without need to pass device UUID.

*Parameters and return value*:
* Look above.

---
#### `async cancelDeviceConnection(identifier)`
Disconnects from device if it's connected or cancels pending connection.

*Parameters*:
* `identifier` - device UUID.

*Returns*: a promise with `device` object as a result or an error.

---
#### `async device.cancelConnection()`
Utility function which disconnects from device if it's connected.

*Parameters and return value*:
* Look above.

---
#### `async isDeviceConnected(identifier)`
Check connection state of a device.

*Parameters*:
* `identifier` - device UUID.

*Returns*: a promise which emits `true` if device is connected, otherwise `false`.

---
#### `async device.isConnected()`
Utility function which checks connection state of a device.

*Parameters and return value*:
* Look above.

---
#### `onDeviceDisconnected(identifier, listener)`
Monitors if device was disconnected due to any errors or connection problems.

*Parameters*:
* `identifier` - device UUID.
* `listener(error, device)` - callback returning error as a reason of 
  disconnection if available and `device` object.

*Returns*: Subscription on which `remove()` function can be called to unsubscribe. 

---
#### `device.onDisconnected(listener)`
Utility function which monitors if device was disconnected due to any errors or 
connection problems.

*Parameters and return value*:
* Look above.

### Discovery

#### `async discoverAllServicesAndCharacteristicsForDevice(identifier)`
Discovers all services and characteristics for device.

*Parameters*:
* `identifier` - device UUID.

*Returns*: promise which emits `device` object if all available services and 
           characteristics have been discovered.

---
#### `async device.discoverAllServicesAndCharacteristics()`
Discovers all services and characteristics for device.

*Parameters and return value*:
* Look above.

### Services

#### `async servicesForDevice(identifier)`
Get list of discovered services for device.

*Parameters*:
* `identifier` - device UUID.

*Returns*: Promise which emits array of `service` objects which are discovered for a device:

```javascript
{
    "uuid": string,       // Service UUID
    "deviceUUID": string, // Device identifier which owns this service
    "isPrimary": boolean, // Is service primary 

    // Utility functions
}
```

---

#### `async device.services()`
Utility function to get list of discovered services for device.

*Parameters and return value*:
* Look above.

### Characteristics

#### `async characteristicsForDevice(identifier, serviceUUID)`
Get list of discovered characteristics.

*Parameters*:
* `identifier` - device UUID.
* `serviceUUID` - service UUID.

*Returns*: Promise which emits array of `characteristic` objects which are discovered 
           for a device in specified service:

```javascript
{
    "uuid": string,                         // Characteristic UUID
    "serviceUUID": string,                  // Service UUID which owns this characteristic
    "deviceUUID": string,                   // Device identifier which owns this characteristic
    "isReadable": boolean,                  // Is characteristic readable
    "isWriteableWithResponse": boolean,     // Is characteristic writeable when writing with response
    "isWriteableWithoutResponse": boolean,  // Is characteristic writeable when writing without response
    "isNotifiable": boolean,                // Is characteristic notifiable
    "isNotifying": boolean,                 // Current status of notification for this characteristic
    "isIndictable": boolean,                // Is characteristic indictable
    "value": string,                        // Base64 value, may be null 

    // Utility functions
}
```

---
#### `async device.characteristicsForService(serviceUUID)`
Utility function to get list of discovered characteristics in specified service for device.

*Parameters and return value*:
* Look above.

---
#### `async service.characteristics()`
Utility function to get list of discovered characteristics for a service.

*Parameters and return value*:
* Look above.

---
#### `async readCharacteristicForDevice(identifier, serviceUUID, characteristicUUID, [transactionId])`
Read characteristic value.

*Parameters*:
* `identifier` - device UUID.
* `serviceUUID` - service UUID.
* `characteristicUUID` - characteristic UUID.
* `transactionId` - optional transactionId which can be used in `cancelTransaction` function.

*Returns*: Promise which emits first `characteristic` object matching specified UUID paths. 
           Latest value of characteristic will be stored.  

---
#### `async device.readCharacteristicForService(serviceUUID, characteristicUUID)`
Read characteristic value.

*Parameters and return value*:
* Look above.

---
#### `async service.readCharacteristic(characteristicUUID)`
Read characteristic value.

*Parameters and return value*:
* Look above.

---
#### `async characteristic.read()`
Read characteristic value.

*Parameters and return value*:
* Look above.

---
#### `async writeCharacteristicWithResponseForDevice(identifier, serviceUUID, characteristicUUID, valueBase64, [transactionId])`
Write characteristic value with response.

*Parameters*:
* `identifier` - device UUID.
* `serviceUUID` - service UUID.
* `characteristicUUID` - characteristic UUID.
* `valueBase64` - value in Base64 format.
* `transactionId` - optional transactionId which can be used in `cancelTransaction` function.

*Returns*: Promise which emits first `characteristic` object matching specified UUID paths. 
           Latest value of characteristic may not be stored.  

---
#### `async device.writeCharacteristicWithResponseForService(serviceUUID, characteristicUUID, valueBase64)`
Write characteristic value with response.

*Parameters and return value*:
* Look above.

---
#### `async service.writeCharacteristicWithResponse(characteristicUUID, valueBase64)`
Write characteristic value with response.

*Parameters and return value*:
* Look above.

---
#### `async characteristic.writeWithResponse(valueBase64)`
Write characteristic value with response.

*Parameters and return value*:
* Look above.

---
#### `async writeCharacteristicWithoutResponseForDevice(identifier, serviceUUID, characteristicUUID, valueBase64, [transactionId])`
Write characteristic value without response.

*Parameters*:
* `identifier` - device UUID.
* `serviceUUID` - service UUID.
* `characteristicUUID` - characteristic UUID.
* `valueBase64` - value in Base64 format.
* `transactionId` - optional transactionId which can be used in `cancelTransaction` function.

*Returns*: Promise which emits first `characteristic` object matching specified UUID paths. 
           Latest value of characteristic may not be stored.

---
#### `async device.writeCharacteristicWithoutResponseForService(serviceUUID, characteristicUUID, valueBase64)`
Write characteristic value without response.

*Parameters and return value*:
* Look above.

---
#### `async service.writeCharacteristicWithoutResponse(characteristicUUID, valueBase64)`
Write characteristic value without response.

*Parameters and return value*:
* Look above.

---
#### `async characteristic.writeWithoutResponse(valueBase64)`
Write characteristic value without response.

*Parameters and return value*:
* Look above.

---

#### `monitorCharacteristicForDevice(identifier, serviceUUID, characteristicUUID, listener, [transactionId])`
Monitor value changes of a characteristic.

*Parameters*:
* `identifier` - device identifier.
* `serviceUUID` - service UUID.
* `characteristicUUID` - characteristic UUID.
* `listener(error, characteristic)` - listener which emits characteristic objects which 
                                      modified value for each notification.
* `transactionId` - optional transactionId which can be used in `cancelTransaction` function.

*Returns:*: Subscription on which `remove()` function can be called to unsubscribe. 

---
#### `async device.monitorCharacteristicForService(serviceUUID, characteristicUUID, listener, [transactionId])`
Monitor value changes of a characteristic.

*Parameters and return value*:
* Look above.

---
#### `async service.monitorCharacteristic(characteristicUUID, listener, [transactionId])`
Monitor value changes of a characteristic.

*Parameters and return value*:
* Look above.

---
#### `async characteristic.monitor(listener, [transactionId])`
Monitor value changes of a characteristic.

*Parameters and return value*:
* Look above.