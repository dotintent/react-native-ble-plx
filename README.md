<p align="center">
  <img alt="react-native-ble-plx" src="docs/logo.png" />
</p>

## About this library

This is React Native Bluetooth Low Energy library using [RxBluetoothKit](https://github.com/Polidea/RxBluetoothKit) and [RxAndroidBle](https://github.com/Polidea/RxAndroidBle) under the hood.

It supports:

- [observing device's Bluetooth adapter state](https://github.com/Polidea/react-native-ble-plx/wiki/Bluetooth-Adapter-State)
- [scanning BLE devices](https://github.com/Polidea/react-native-ble-plx/wiki/Bluetooth-Scanning)
- [making connections to peripherals](https://github.com/Polidea/react-native-ble-plx/wiki/Device-Connecting)
- [discovering services/characteristics](https://github.com/Polidea/react-native-ble-plx/wiki/Device-Service-Discovery)
- [reading](https://github.com/Polidea/react-native-ble-plx/wiki/Characteristic-Reading)/[writing](https://github.com/Polidea/react-native-ble-plx/wiki/Characteristic-Writing) characteristics
- [observing characteristic notifications/indications](https://github.com/Polidea/react-native-ble-plx/wiki/Characteristic-Notifying)
- [reading RSSI](https://github.com/Polidea/react-native-ble-plx/wiki/RSSI-Reading)
- [negotiating MTU](https://github.com/Polidea/react-native-ble-plx/wiki/MTU-Negotiation)
- turning the device's Bluetooth adapter on

What this library does NOT support:

- communicating between phones using BLE (Peripheral support)
- [bonding peripherals](https://github.com/Polidea/react-native-ble-plx/wiki/Device-Bonding)

## Recent Changes

**1.0.1**

- Fix possible ConcurrentModificationException in Android BleModule.
- Workaround for when `canSendWriteWithoutResponse` would return false on iOS.
- Fixed low severity vulnerabilities reported by npm in development dependencies.

[All previous changes](CHANGELOG.md)

## Documentation & Support

Interested in React Native project involving Bluetooth Low Energy? [We can help you!](https://www.polidea.com/react-native)

Documentation can be found [here](https://polidea.github.io/react-native-ble-plx/).

Contact us at [Gitter](https://gitter.im/RxBLELibraries/react-native-ble) if you have any questions, feedback or want to help!

## Configuration & Installation

### iOS (pure react-native, [example setup](https://github.com/Cierpliwy/SensorTag))

1. `npm install --save react-native-ble-plx`
2. `react-native link react-native-ble-plx`
3. Add empty Swift file if you don't have at least one:
   - Select File/New/File...
   - Choose Swift file and click Next.
   - Name it however you want, select your targets and create it.
   - Accept to create Objective-C bridging header.
4. Minimal supported version of iOS is 8.0
5. If you want to support background mode:
   - In your application target go to `Capabilities` tab and enable `Uses Bluetooth LE Accessories` in
     `Background Modes` section.
   - Pass `restoreStateIdentifier` and `restoreStateFunction` to `BleManager` constructor.

### iOS (expo/Podfile, [example setup](https://github.com/Cierpliwy/SensorTagExpo))

1. Make sure your Expo project is detached. You can read how to do it [here](https://docs.expo.io/versions/latest/expokit/detach) and [here](https://docs.expo.io/versions/latest/expokit/expokit).
2. `npm install --save react-native-ble-plx`
3. `react-native link react-native-ble-plx`
4. Add empty Swift file if you don't have at least one:
   - Select File/New/File...
   - Choose Swift file and click Next.
   - Name it however you want, select your application target and create it.
   - Accept to create Objective-C bridging header.
5. Update your `ios/Podfile` to contain:
   ```
   pod 'react-native-ble-plx', :path => '../node_modules/react-native-ble-plx'
   pod 'react-native-ble-plx-swift', :path => '../node_modules/react-native-ble-plx'
   ```
6. Enter `ios` folder and run `pod update`
7. Minimal supported version of iOS is 8.0
8. If you want to support background mode:
   - In your application target go to `Capabilities` tab and enable `Uses Bluetooth LE Accessories` in
     `Background Modes` section.
   - Pass `restoreStateIdentifier` and `restoreStateFunction` to `BleManager` constructor.

### Android ([example setup](https://github.com/Cierpliwy/SensorTag))

1. `npm install --save react-native-ble-plx`
2. `react-native link react-native-ble-plx`
3. In `build.gradle` of `app` module make sure that min SDK version is at least 18:

```groovy
android {
    ...
    defaultConfig {
        minSdkVersion 18
        ...
```

4. In `AndroidManifest.xml`, add Bluetooth permissions and update `<uses-sdk/>`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    ...
    <uses-permission android:name="android.permission.BLUETOOTH"/>
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN"/>
    <uses-permission-sdk-23 android:name="android.permission.ACCESS_COARSE_LOCATION"/>

    <!-- Add this line if your application always requires BLE. More info can be found on:
         https://developer.android.com/guide/topics/connectivity/bluetooth-le.html#permissions
      -->
    <uses-feature android:name="android.hardware.bluetooth_le" android:required="true"/>

    <uses-sdk
        android:minSdkVersion="18"
        ...
```

## Troubleshooting

### Problems with Proguard

Add this to your `app/proguard-rules.pro`

```
-dontwarn com.polidea.reactnativeble.**
```
