<p align="center">
  <img alt="react-native-ble-plx" src="docs/logo.png" />
</p>

## About this library

This is React Native Bluetooth Low Energy library using [RxBluetoothKit](https://github.com/Polidea/RxBluetoothKit) and [RxAndroidBle](https://github.com/Polidea/RxAndroidBle) under the hood.

It supports:

* [observing device's Bluetooth adapter state](https://github.com/Polidea/react-native-ble-plx/wiki/Bluetooth-Adapter-State)
* [scanning BLE devices](https://github.com/Polidea/react-native-ble-plx/wiki/Bluetooth-Scanning)
* [making connections to peripherals](https://github.com/Polidea/react-native-ble-plx/wiki/Device-Connecting)
* [discovering services/characteristics](https://github.com/Polidea/react-native-ble-plx/wiki/Device-Service-Discovery)
* [reading](https://github.com/Polidea/react-native-ble-plx/wiki/Characteristic-Reading)/[writing](https://github.com/Polidea/react-native-ble-plx/wiki/Characteristic-Writing) characteristics
* [observing characteristic notifications/indications](https://github.com/Polidea/react-native-ble-plx/wiki/Characteristic-Notifying)
* [reading RSSI](https://github.com/Polidea/react-native-ble-plx/wiki/RSSI-Reading)
* [negotiating MTU](https://github.com/Polidea/react-native-ble-plx/wiki/MTU-Negotiation)

What this library does NOT support:

* turning the device's Bluetooth adapter on
* communicating between phones using BLE (Peripheral support)
* [bonding peripherals](https://github.com/Polidea/react-native-ble-plx/wiki/Device-Bonding)

## Recent Changes

**0.10.0**

**Breaking changes:**

* Deprecate old build system. Carthage is not required anymore. To fix your current project please do following steps:

  1. Add empty Swift file if you don't have at least one:
     * Select File/New/File...
     * Choose Swift file and click Next.
     * Name it however you want, select your targets and create it.
     * Accept to create Objective-C bridging header.
  2. Remove copy-frameworks script if you don't have any other dependency requiring it:
     * Go to Your Target / Build Phases
     * Remove run script.

Other:

* Fix warning when no listeners were attached and events were emitted.
* Show error.message properly. Make sure that invalid errorCodes from implementation side won't trigger another error during construction.
* Property ServiceUUID is properly propagated to IncludedServicesDiscoveryFailed's error message.
* Add missing `deviceServicesNotDiscovered` implementation on Android.

[All previous changes](CHANGELOG.md)

## Documentation & Support

Interested in React Native project involving Bluetooth Low Energy? [We can help you!](https://www.polidea.com/react-native)

Documentation can be found [here](https://polidea.github.io/react-native-ble-plx/).

Contact us at [Gitter](https://gitter.im/RxBLELibraries/react-native-ble) if you have any questions, feedback or want to help!

## Configuration & Installation

### iOS

1. `npm install --save react-native-ble-plx`
2. `react-native link react-native-ble-plx`
3. In `Build Settings`/`Build Options`/`Always Embed Swift Standard Libraries` set to `Yes`.
4. Add empty Swift file if you don't have at least one:
   * Select File/New/File...
   * Choose Swift file and click Next.
   * Name it however you want, select your targets and create it.
   * Accept to create Objective-C bridging header.
5. Minimal supported version of iOS is 8.0
6. If you want to support background mode:
   * In your application target go to `Capabilities` tab and enable `Uses Bluetooth LE Accessories` in
     `Background Modes` section.
   * Pass `restoreStateIdentifier` and `restoreStateFunction` to `BleManager` constructor.

### Android

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

## Expo

Currently [02.02.2018] to use this library with Expo one must first detach (eject) the project and follow the above instructions. Additionally on iOS there is a must to add a `Header Search Path` to other dependencies which are managed using `Pods`. To do so one has to add `$(SRCROOT)/../../../ios/Pods/Headers/Public/**` to `Header Search Path` in `BleClient` module using `XCode`. This can be further automated by a `git apply patch` executed as a `postinstall` script defined in `package.json`.

## Troubleshooting

### Problems with Proguard

Add this to your `app/proguard-rules.pro`

```
-dontwarn com.polidea.reactnativeble.**
```
