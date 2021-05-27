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
| 0.63.3        | :white_check_mark:             |
| 0.62.2        | :white_check_mark:             |
| 0.61.5        | :white_check_mark:             |
| 0.60.6        | :white_check_mark:             |

## Recent Changes

**2.0.2**
- Updated MultiplatformBleAdapter to version 0.1.7.
- Added support for BleMulator
- Removed destroying of client upon catalystInstanceDestroy. 
- Updated CI to RN 0.63.3

[All previous changes](CHANGELOG.md)

## Documentation & Support

Interested in React Native project involving Bluetooth Low Energy? [We can help you!](https://www.polidea.com/react-native)

[Learn more about Polidea's React Native services](https://www.polidea.com/services/react-native/?utm_source=Github&utm_medium=Npaid&utm_campaign=Tech_RN&utm_term=Code&utm_content=GH_NOP_RN_COD_RNB001).

[Learn more about Polidea's BLE services](https://www.polidea.com/services/ble/?utm_source=Github&utm_medium=Npaid&utm_campaign=Tech_BLE&utm_term=Code&utm_content=GH_NOP_BLE_COD_RNB001).

[Documentation can be found here](https://polidea.github.io/react-native-ble-plx/).

[Quick introduction can be found here](https://github.com/Polidea/react-native-ble-plx/blob/master/INTRO.md)

Contact us at [Polidea](https://www.polidea.com/project/?utm_source=Github&utm_medium=Npaid&utm_campaign=Kontakt&utm_term=Code&utm_content=GH_NOP_KKT_COD_RNB001).

Contact us at [Gitter](https://gitter.im/RxBLELibraries/react-native-ble) if you have any questions, feedback or want to help!

## Configuration & Installation

### Expo

> This package cannot be used in the "Expo Go" app because [it requires custom native code](https://docs.expo.io/workflow/customizing/).

After installing this npm package, add the [config plugin](https://docs.expo.io/guides/config-plugins/) to the [`plugins`](https://docs.expo.io/versions/latest/config/app/#plugins) array of your `app.json` or `app.config.js`:

```json
{
  "expo": {
    "plugins": ["react-native-ble-plx"]
  }
}
```

Next, rebuild your app as described in the ["Adding custom native code"](https://docs.expo.io/workflow/customizing/) guide.

#### Props

The plugin provides props for extra customization. Every time you change the props or plugins, you'll need to rebuild (and `prebuild`) the native app. If no extra properties are added, defaults will be used.

- `isBackgroundEnabled` (_boolean_): Enable background BLE support on Android. Adds `<uses-feature android:name="android.hardware.bluetooth_le" android:required="true"/>` to the `AndroidManifest.xml`. Default `false`.
- `modes` (_string[]_): Adds iOS `UIBackgroundModes` to the `Info.plist`. Options are: `peripheral`, and `central`. Defaults to undefined.
- `bluetoothAlwaysPermission` (_string | false_): Sets the iOS `NSBluetoothAlwaysUsageDescription` permission message to the `Info.plist`. Setting `false` will skip adding the permission. Defaults to `Allow $(PRODUCT_NAME) to connect to bluetooth devices`.

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
6. Add `NSBluetoothAlwaysUsageDescription` in `info.plist` file. (it is a requirement since iOS 13)
7. If you want to support background mode:
   - In your application target go to `Capabilities` tab and enable `Uses Bluetooth LE Accessories` in
     `Background Modes` section.
   - Pass `restoreStateIdentifier` and `restoreStateFunction` to `BleManager` constructor.

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
