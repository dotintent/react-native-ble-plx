<h1 align="center">
  <img
    alt="react-native-ble-plx library logo"
    src="docs/logo.png"
    height="300"
    style="margin-top: 20px; margin-bottom: 20px;"
  />
</h1>

## About this library

It supports:

- [observing device's Bluetooth adapter state](https://github.com/dotintent/react-native-ble-plx/wiki/Bluetooth-Adapter-State)
- [scanning BLE devices](https://github.com/dotintent/react-native-ble-plx/wiki/Bluetooth-Scanning)
- [making connections to peripherals](https://github.com/dotintent/react-native-ble-plx/wiki/Device-Connecting)
- [discovering services/characteristics](https://github.com/dotintent/react-native-ble-plx/wiki/Device-Service-Discovery)
- [reading](https://github.com/dotintent/react-native-ble-plx/wiki/Characteristic-Reading)/[writing](https://github.com/dotintent/react-native-ble-plx/wiki/Characteristic-Writing) characteristics
- [observing characteristic notifications/indications](https://github.com/dotintent/react-native-ble-plx/wiki/Characteristic-Notifying)
- [reading RSSI](https://github.com/dotintent/react-native-ble-plx/wiki/RSSI-Reading)
- [negotiating MTU](https://github.com/dotintent/react-native-ble-plx/wiki/MTU-Negotiation)
- [background mode on iOS](<https://github.com/dotintent/react-native-ble-plx/wiki/Background-mode-(iOS)>)
- turning the device's Bluetooth adapter on

It does NOT support:

- bluetooth classic devices.
- communicating between phones using BLE (Peripheral support)
- [bonding peripherals](https://github.com/dotintent/react-native-ble-plx/wiki/Device-Bonding)
- [beacons](https://github.com/dotintent/react-native-ble-plx/wiki/=-FAQ:-Beacons)

## Table of Contents

1. [Compatibility](#compatibility)
2. [Recent Changes](#recent-changes)
3. [Documentation & Support](#documentation--support)
4. [Configuration & Installation](#configuration--installation)
5. [Troubleshooting](#troubleshooting)
6. [Contributions](#contributions)

## Compatibility

For old RN versions (<0.60) please check [old README](./docs/README_V1.md) (1.x)
for the old instructions or [migration guide](./docs/MIGRATION_V1.md).

| React Native | 3.1.2              |
| ------------ | ------------------ |
| 0.74.1       | :white_check_mark: |
| 0.69.6       | :white_check_mark: |
| Expo 51      | :white_check_mark: |

## Recent Changes

**3.2.0**

- Added Android Instance checking before calling its method, an error will be visible on the RN side
- Added information related to Android 14 to the documentation.
- Changed destroyClient, cancelTransaction, setLogLevel, startDeviceScan, stopDeviceScan calls to promises to allow error reporting if it occurs.
- Fixed one of the functions calls that clean up the BLE instance after it is destroyed.

[Current version changes](CHANGELOG.md)
[All previous changes](CHANGELOG-pre-3.0.0.md)

## Documentation & Support

Interested in React Native project involving Bluetooth Low Energy? [We can help you!](https://withintent.com/?utm_source=github&utm_medium=github&utm_campaign=external_traffic)

[Documentation can be found here](https://dotintent.github.io/react-native-ble-plx/).

[Quick introduction can be found here](https://github.com/dotintent/react-native-ble-plx/blob/master/INTRO.md)

Contact us at [intent](https://withintent.com/contact-us/?utm_source=github&utm_medium=github&utm_campaign=external_traffic).

## Configuration & Installation

### Expo SDK 43+

> Tested against Expo SDK 49
> This package cannot be used in the "Expo Go" app because [it requires custom native code](https://docs.expo.io/workflow/customizing/).
> First install the package with yarn, npm, or [`npx expo install`](https://docs.expo.io/workflow/expo-cli/#expo-install).

After installing this npm package, add the [config plugin](https://docs.expo.io/guides/config-plugins/) to the [`plugins`](https://docs.expo.io/versions/latest/config/app/#plugins) array of your `app.json` or `app.config.js`:

```json
{
  "expo": {
    "plugins": ["react-native-ble-plx"]
  }
}
```

Then you should build the version using native modules (e.g. with `npx expo prebuild` command).
And install it directly into your device with `npx expo run:android`.

You can find more details in the ["Adding custom native code"](https://docs.expo.io/workflow/customizing/) guide.

## API

The plugin provides props for extra customization. Every time you change the props or plugins, you'll need to rebuild (and `prebuild`) the native app. If no extra properties are added, defaults will be used.

- `isBackgroundEnabled` (_boolean_): Enable background BLE support on Android. Adds `<uses-feature android:name="android.hardware.bluetooth_le" android:required="true"/>` to the `AndroidManifest.xml`. Default `false`.
- `neverForLocation` (_boolean_): Set to true only if you can strongly assert that your app never derives physical location from Bluetooth scan results. The location permission will be still required on older Android devices. Note, that some BLE beacons are filtered from the scan results. Android SDK 31+. Default `false`. _WARNING: This parameter is experimental and BLE might not work. Make sure to test before releasing to production._
- `modes` (_string[]_): Adds iOS `UIBackgroundModes` to the `Info.plist`. Options are: `peripheral`, and `central`. Defaults to undefined.
- `bluetoothAlwaysPermission` (_string | false_): Sets the iOS `NSBluetoothAlwaysUsageDescription` permission message to the `Info.plist`. Setting `false` will skip adding the permission. Defaults to `Allow $(PRODUCT_NAME) to connect to bluetooth devices`.

> Expo SDK 48 supports iOS 13+ which means `NSBluetoothPeripheralUsageDescription` is fully deprecated. It is no longer setup in `@config-plugins/react-native-ble-plx@5.0.0` and greater.

#### Example

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-ble-plx",
        {
          "isBackgroundEnabled": true,
          "modes": ["peripheral", "central"],
          "bluetoothAlwaysPermission": "Allow $(PRODUCT_NAME) to connect to bluetooth devices"
        }
      ]
    ]
  }
}
```

### Legacy Expo (SDK < 43)

1. Make sure your Expo project is ejected (formerly: detached). You can read how to do it [here](https://docs.expo.dev/expokit/eject/). (only for Expo SDK < 43)
2. Follow steps for iOS/Android.

### iOS ([example setup](https://github.com/Cierpliwy/SensorTag))

1. `npm install --save react-native-ble-plx`
1. Enter `ios` folder and run `pod update`
1. Add `NSBluetoothAlwaysUsageDescription` in `info.plist` file. (it is a requirement since iOS 13)
1. If you want to support background mode:
   - In your application target go to `Capabilities` tab and enable `Uses Bluetooth LE Accessories` in
     `Background Modes` section.
   - Pass `restoreStateIdentifier` and `restoreStateFunction` to `BleManager` constructor.

### Android ([example setup](https://github.com/Cierpliwy/SensorTag))

1. `npm install --save react-native-ble-plx`
1. In top level `build.gradle` make sure that min SDK version is at least 23:

   ```groovy
   buildscript {
       ext {
           ...
           minSdkVersion = 23
           ...
   ```

1. In `build.gradle` make sure to add jitpack repository to known repositories:

   ```groovy
   allprojects {
       repositories {
         ...
         maven { url 'https://www.jitpack.io' }
       }
   }
   ```

1. In `AndroidManifest.xml`, add Bluetooth permissions and update `<uses-sdk/>`:

   ```xml
   <manifest xmlns:android="http://schemas.android.com/apk/res/android">

      ...

      <!-- Android >= 12 -->
      <uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
      <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
      <!-- Android < 12 -->
      <uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
      <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />
      <!-- common -->
      <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />

      <!-- Add this line if your application always requires BLE. More info can be found on:
          https://developer.android.com/guide/topics/connectivity/bluetooth-le.html#permissions
        -->
      <uses-feature android:name="android.hardware.bluetooth_le" android:required="true"/>

       ...
   ```

1. (Optional) In SDK 31+ You can remove `ACCESS_FINE_LOCATION` (or mark it as `android:maxSdkVersion="30"` ) from `AndroidManifest.xml` and add `neverForLocation` flag into `BLUETOOTH_SCAN` permissions which says that you will not use location based on scanning eg:

   ```xml
    <uses-permission android:name="android.permission.INTERNET" />
    <!-- Android >= 12 -->
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    <!-- Android < 12 -->
    <uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" android:maxSdkVersion="30" />

       ...
   ```

   With `neverForLocation` flag active, you no longer need to ask for `ACCESS_FINE_LOCATION` in your app

## Troubleshooting

## Contributions

- Special thanks to @EvanBacon for supporting the expo config plugin.
