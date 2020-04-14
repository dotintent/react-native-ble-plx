<p align="center">
  <img
    alt="react-native-ble-plx library logo"
    src="docs/logo.png"
    height="300"
    style="margin-top: 20px; margin-bottom: 20px;"
  />
</p>

## About this library

This is React Native Bluetooth Low Energy library wrapping [Multiplatform Ble Adapter](https://github.com/Polidea/MultiPlatformBleAdapter/).

It supports:

- [observing device's Bluetooth adapter state](https://github.com/Polidea/react-native-ble-plx/wiki/Bluetooth-Adapter-State)
- [scanning BLE devices](https://github.com/Polidea/react-native-ble-plx/wiki/Bluetooth-Scanning)
- [making connections to peripherals](https://github.com/Polidea/react-native-ble-plx/wiki/Device-Connecting)
- [discovering services/characteristics](https://github.com/Polidea/react-native-ble-plx/wiki/Device-Service-Discovery)
- [reading](https://github.com/Polidea/react-native-ble-plx/wiki/Characteristic-Reading)/[writing](https://github.com/Polidea/react-native-ble-plx/wiki/Characteristic-Writing) characteristics
- [observing characteristic notifications/indications](https://github.com/Polidea/react-native-ble-plx/wiki/Characteristic-Notifying)
- [reading RSSI](https://github.com/Polidea/react-native-ble-plx/wiki/RSSI-Reading)
- [negotiating MTU](https://github.com/Polidea/react-native-ble-plx/wiki/MTU-Negotiation)
- [background mode on iOS](https://github.com/Polidea/react-native-ble-plx/wiki/Background-mode-(iOS))
- turning the device's Bluetooth adapter on

It does NOT support:

- bluetooth classic devices.
- communicating between phones using BLE (Peripheral support)
- [bonding peripherals](https://github.com/Polidea/react-native-ble-plx/wiki/Device-Bonding)

## Compatibility

This version (2.x) breaks compatibility with old RN versions. Please check [old README](./docs/README_V1.md) (1.x) 
for the old instructions or [migration guide](./docs/MIGRATION_V1.md).

| React Native  | 2.0.0                          |
| ------------- | ------------------------------ |
| 0.62.2        | :white_check_mark:             |
| 0.61.5        | :white_check_mark:             |
| 0.60.6        | :white_check_mark:             |

## Recent Changes

**2.0.0**

- Update direct dependency to Multiplatform Ble Adapter
- Remove support for RN version < 0.60
- Fixed Typescript `callbackType` type definition.

[All previous changes](CHANGELOG.md)

## Documentation & Support

Interested in React Native project involving Bluetooth Low Energy? [We can help you!](https://www.polidea.com/react-native)

[Learn more about Polidea's React Native services](https://www.polidea.com/services/react-native/?utm_source=Github&utm_medium=Npaid&utm_campaign=Tech_RN&utm_term=Code&utm_content=GH_NOP_RN_COD_RNB001).

[Learn more about Polidea's BLE services](https://www.polidea.com/services/ble/?utm_source=Github&utm_medium=Npaid&utm_campaign=Tech_BLE&utm_term=Code&utm_content=GH_NOP_BLE_COD_RNB001).

[Documentation can be found here](https://polidea.github.io/react-native-ble-plx/).

Contact us at [Polidea](https://www.polidea.com/project/?utm_source=Github&utm_medium=Npaid&utm_campaign=Kontakt&utm_term=Code&utm_content=GH_NOP_KKT_COD_RNB001).

Contact us at [Gitter](https://gitter.im/RxBLELibraries/react-native-ble) if you have any questions, feedback or want to help!

## Configuration & Installation

### Expo

1. Make sure your Expo project is ejected (formerly: detached). You can read how to do it [here](https://docs.expo.io/versions/latest/expokit/eject/) and [here](https://docs.expo.io/versions/latest/expokit/expokit). (only for expo)
2. Follow steps for iOS/Android.

### iOS ([example setup](https://github.com/Cierpliwy/SensorTag))

1. `npm install --save react-native-ble-plx`
2. `npx react-native link react-native-ble-plx`
3. Open Xcode workspace located inside `ios` folder and add empty Swift file if you don't have at least one:
   - Select File/New/File...
   - Choose Swift file and click Next.
   - Name it however you want, select your application target and create it.
   - Accept to create Objective-C bridging header.
4. Update your `ios/Podfile` to contain (it may be already there):
   ```
   pod 'react-native-ble-plx', :path => '../node_modules/react-native-ble-plx'
   ```
5. Enter `ios` folder and run `pod update`
6. Minimal supported version of iOS is 8.0
7. If you want to support background mode:
   - In your application target go to `Capabilities` tab and enable `Uses Bluetooth LE Accessories` in
     `Background Modes` section.
   - Pass `restoreStateIdentifier` and `restoreStateFunction` to `BleManager` constructor.
8. Starting from iOS 13 add `NSBluetoothAlwaysUsageDescription` in `info.plist` file.

### Android ([example setup](https://github.com/Cierpliwy/SensorTag))

1. `npm install --save react-native-ble-plx`
2. `npx react-native link react-native-ble-plx`
3. In top level `build.gradle` make sure that min SDK version is at least 18:
```groovy
buildscript {
    ext {
        ...
        minSdkVersion = 18
        ...
```
4. In `build.gradle` make sure to add jitpack repository to known repositories:

```groovy
allprojects {
    repositories {
      ...
      maven { url 'https://www.jitpack.io' }
    }
}
```
5. In `AndroidManifest.xml`, add Bluetooth permissions and update `<uses-sdk/>`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    ...
    <uses-permission android:name="android.permission.BLUETOOTH"/>
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN"/>
    <uses-permission-sdk-23 android:name="android.permission.ACCESS_FINE_LOCATION"/>

    <!-- Add this line if your application always requires BLE. More info can be found on:
         https://developer.android.com/guide/topics/connectivity/bluetooth-le.html#permissions
      -->
    <uses-feature android:name="android.hardware.bluetooth_le" android:required="true"/>

    ...
```

## Troubleshooting

### Problems with Proguard

Add this to your `app/proguard-rules.pro`

```
-dontwarn com.polidea.reactnativeble.**
```
