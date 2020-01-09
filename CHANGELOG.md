**1.1.1**

- Update development dependencies
- Add more information to the README and INTRO file.
- Remove `const` from enum types in the typescript definition file.
- Add backpressure buffer for notifications.

**1.1.0**

- Add support for descriptors.
- Fix XCode 11 compilation error.

**1.0.3**

- Integrated Travis CI to test library and check its integration with multiple RN versions.
- Library's build.gradle prefers buildToolsVersion, compileSdkVersion & targetSdkVersion specified in rootProject.
- Added Typescript definitions.
- Removed outdated example project.
- Updated dev dependencies and the README file.

**1.0.2**

- Fix build error due to RN 58 changes.
- Allow registering for notifications and indications on Android despite CCC descriptor being absent.

**1.0.1**

- Fix possible ConcurrentModificationException in Android BleModule.
- Workaround for when `canSendWriteWithoutResponse` would return false on iOS.
- Fixed low severity vulnerabilities reported by npm in development dependencies.

**1.0.0**

**Breaking changes**

- Moved to Gradle plugin 3.1.4 and Gradle wrapper to 4.4 (RN 57+ required) on Android.

Other:

- Added `requestConnectionPriority` function which increases or decreases connection interval setting on Android Lollipop devices or above.
- Added `connectionPriority` option to connection options which calls above function just after the connection is established.
- Added `scanMode` and `callbackType` properties to scan options for Android.
- Added `enable` and `disable` functions to enable/disable Bluetooth on Android.
- Added optional `transactionId` argument to `discoverAllServicesAndCharacteristicsForDevice`.
- Added `errorCodesToMessagesMapping` property to `BleManagerOptions` to be able to override custom BleError messages.
- Updated `cancelDeviceConnection` documentation.
- Don't call CBCentralManager's stopScan, when Bluetooth is powered off in internal implementation on iOS.
- Clean iOS compiler warnings on XCode10.
- Changed scan record logging from Debug to Verbose on iOS.
- Updated `writeWithoutResponse` implementation on iOS to use `canSendWriteWithoutResponse` if available starting from iOS 11.
- Updated library's development dependencies.
- Fixed cyclic import warnings.
- Fixed notification/indication subscription moment. Events are monitored before CCC is written on Android.

**0.10.0**

**Breaking changes:**

- Deprecate old build system. Carthage is not required anymore. To fix your current project please do following steps:

  1. Add empty Swift file if you don't have at least one:
     - Select File/New/File...
     - Choose Swift file and click Next.
     - Name it however you want, select your targets and create it.
     - Accept to create Objective-C bridging header.
  2. Remove copy-frameworks script if you don't have any other dependency requiring it:
     - Go to Your Target / Build Phases
     - Remove run script.

Other:

- Fix warning when no listeners were attached and events were emitted.
- Show error.message properly. Make sure that invalid errorCodes from implementation side won't trigger another error during construction.
- Property ServiceUUID is properly propagated to IncludedServicesDiscoveryFailed's error message.
- Add missing `deviceServicesNotDiscovered` implementation on Android.

**0.9.2**

- Update RxAndroidBle dependency to 1.6.0.
- Propagate `androidErrorCode` properly for `DeviceDisconnected` error.

**0.9.1**

- Update binary frameworks for XCode 9.4.

**0.9.0**

**Breaking changes**:

- Use `error.errorCode == BleErrorCode.OperationCancelled` instead of `error.message == 'Cancelled'`
- Use `error.errorCode == BleErrorCode.BluetoothManagerDestroyed` instead of `error.message == 'Destroyed'`
- Reverted implementation of `monitorCharacteristicForDevice` to properly write to descriptor when last listener
  is unsubscribed on Android. If you expect to get new notifications as soon as you subscribe for them please use
  version `0.8` for the time being, as regression is expected.

Other:

- All API calls return `BleError` instance in case of errors which contains additional fields:
  - `errorCode` - returns API independent and stable error code (defined in `BleErrorCode`).
  - `attErrorCode` _(optional)_ - platform independent ATT error code.
  - `iosErrorCode` _(optional)_ - iOS specific error code.
  - `androidErrorCode` _(optional)_ - Android specific error code.
  - `reason` _(optional)_ - platform specific message.
- Updated `BleModuleInterface` type to fix flow errors related to usage.
- Added `refreshGatt` option to `connectToDevice` function.
- Parse short `localName` advertisement data type on Android.
- Don't emit state changes when BLE is not supported.
- Added `devices` and `connectedDevices` functions.
- Fixed iOS issue related to `requiresMainQueueSetup`.
- Added `timeout` option to `connectToDevice`.

Docs:

- Updated dev dependencies to the latest ones.
- Added Expo section to README file.
- Added About this library section to README file.
- Updated Wiki pages

**0.8.0**

- Fix regression of Base64 encoding on Android platform. When large chunk of Base64 data was sent from Android it contained new lines characters.
- Updated RxAndroidBle to version 1.4.3.
- Fixed colissions in Characteristic and Service id generation on Android. The collisions had place if multiple devices with the same characteristic/service UUIDs were connected at the same time.
- Fixed dropped notifications right after setup on Android. Before there was small window when notification was monitored and listener for it wasn't mounted.
- Minor documentation updates.

**0.7.0**

**Breaking changes**:

- Migrate to Swift 4 (now requires XCode 9 or higher)
- Fixed spelling mistake `characteristic.isIndictable` is now `characteristic.isIndicatable`.

Other:

- Fixed potential memory leaks in iOS native module.
- Fixed an issue when successive scans could stop emitting scanned devices.
- Removed `bash` dependency in postinstall script.
- Use `--cache-builds` option only when specific version of carthage is available.
- Remove `--no-build` option to be able to reuse prepackages frameworks.
- Added option to disable building dynamic frameworks with carthage
  by setting option in your app's package.json:
  ```json
  ...
  "react-native-ble-plx": {
    "carthage": false
  }
  ...
  ```

**0.6.5**

- Fixed Null Pointer Exception when called `cancelDeviceConnection` on Android.
- Updated gradle version to be able to use latest Android Studio.
- Added Nullable and Nonnull annotations to Android implementation.

**0.6.4**

- Fail explicitly when carthage fails on postinstall.
- Added `mtu` property for `Device` object which allows you to get current BLE MTU of device.
- Added function `requestMTUForDevice` which allows to negotiate BLE MTU of device if it is possible.

**0.6.3**

- Updated RxBluetoothKit library to version 3.1.1
- Updated RxAndroidBle library to version 1.4.1
- Fixed NullPointerException when calling BLE operations without previous discovery.
- iOS emits values in `monitorCharacteristicForDevice` only when no reads are pending for specific characteristic.
  Previously when characteristic was notified and read operation was completed, characteristic value was received
  both in `readCharacteristicForDevice` and `monitorCharacteristicForDevice`. Now it will only be received in
  `readCharacteristicForDevice` promise.

**0.6.2**

- Updated RxBluetoothKit library to version 3.0.14 to allow building library on XCode 9.
- Added new `localName` property to `Device` object, which is set when localName is available
  in device's advertisement data.
- Fixed build process on Windows.
- Fixed compatibility with RN 0.47
- Fixed bug when `onDeviceDisconnected` callback was not called on iOS when Bluetooth was
  turned off on device.
- Updated library setup instructions.
- Added option to cache native libraries built by Carthage.

**0.6.1**

- Updated RxAndroidBle library to version 1.3.3 which fixes internal issues which may
  block execution of operation queue.
- Updated dev dependencies to fix latest Flowtype issues.
- Fixed bug when `restoreStateFunction` function could be called multiple times on iOS.

**0.6.0**

- Added basic API to support background mode. When BleManager is constructed you can pass
  `restoreStateIdentifier` and `restoreStateFunction` to `BleManagerOptions` object to
  enable support for background mode. More info about usage can be found in documentation.
- All subscriptions and promises are properly "Destroyed" when `destory()` function is called.
- Fixed bug on Android where notification messages could be duplicated or skipped.
- Updated RxAndroidBle to version 1.3
- Updated README file.
- Updated library logo

**0.5.0**

- Added new API for supporting unique Services and Characteristics:
  - `Characteristic.id`, `Service.id` fields which uniquely identify BLE objects.
  - All utility functions which don't require UUIDs as arguments are using
    internally `id` fields and therefore work faster and properly handle
    services/characteristics with same UUIDs. For example: `characteristic.read()`.
- New option to enable native modules' logging system via `bleManager.setLogLevel()` function.
- New function to read RSSI for connected devices: `bleManager.readRSSIForDevice()`.
- Updated RxBluetoothKit dependency to version 3.0.12
- Updated RxAndroidBle dependency to 1.2.2
- Added tests for JS API.
- Better Flow type checking and coverage.
- Documentation was moved to `./docs` folder and now is generated by documentation.js.
- Small fixes in examples.
- Updated installation steps.

**0.4.0**

- Device ID properties were renamed as they are not UUIDs on Android **(breaking change)**:
  - `Device.uuid` -> `Device.id`
  - `Service.deviceUUID` -> `Service.deviceID`,
  - `Characteristic.deviceUUID` -> `Characteristic.deviceID`
- Changed signature of `onDeviceDisconnected`, as Device object is always available.
- Updated to Swift 3.0
- Updated to RxAndroidBle 1.1.0 and RxBluetoothKit 3.0.6
- Documentation was moved to `./doc` folder and now is generated by ESDoc.
- Fixed `state()` invalid return type. Implemented `state()` and `onStateChange()` for Android.
- Added optional parameter to `onStateChange()` function.
- Fixed `monitorCharacteristicForDevice()` for Android when characteristic accepts indications only.
- Updated `AndroidManifest.xml` configuration.
