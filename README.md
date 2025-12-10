<h1 align="center">
  <img
    alt="react-native-ble-plx library logo"
    src="docs/logo.png"
    height="300"
    style="margin-top: 20px; margin-bottom: 20px;"
  />
</h1>

> **Fork Notice**: This library is forked from [dotintent/react-native-ble-plx](https://github.com/dotintent/react-native-ble-plx) because the official library does not support Expo SDK 54+ and React Native 0.81+. We've updated it to work with modern React Native and converted it from Flow to TypeScript.
>
> **Looking for maintainers!** We're looking for volunteers to help maintain this fork. If you're interested, please open an issue or submit a PR.

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
5. [iOS BLE State Restoration](#ios-ble-state-restoration-optional)
6. [Troubleshooting](#troubleshooting)
7. [Releasing](#releasing)
8. [Contributions](#contributions)

## Compatibility

> **Note**: This is a fork of `dotintent/react-native-ble-plx` maintained at `@sfourdrinier/react-native-ble-plx`. It has been converted from Flow to TypeScript and updated for modern React Native.

**Minimum Requirements (v3.5.0+):**
- React Native **0.81.4+**
- Expo SDK **54+**
- Node.js **18+**

| React Native | Expo SDK | This Fork |
| ------------ | -------- | --------- |
| 0.81.4+      | 54+      | :white_check_mark: |
| < 0.81       | < 54     | :x: Not supported |

For older React Native versions, use the upstream [dotintent/react-native-ble-plx](https://github.com/dotintent/react-native-ble-plx) library.

## Recent Changes

**3.5.x (This Fork)**

- Converted from Flow to TypeScript
- Updated for React Native 0.81.4 and Expo SDK 54
- Added iOS BLE state restoration support (optional)
- Fixed TypeScript errors from Flow-to-TS conversion
- Dropped support for React Native < 0.81 and Expo < 54

**3.2.0 (Upstream)**

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

### Expo SDK 54+

> This package cannot be used in the "Expo Go" app because [it requires custom native code](https://docs.expo.io/workflow/customizing/).
> First install the package with yarn, npm, or [`npx expo install`](https://docs.expo.io/workflow/expo-cli/#expo-install).

```bash
npm install @sfourdrinier/react-native-ble-plx
# or
pnpm add @sfourdrinier/react-native-ble-plx
```

After installing, add the [config plugin](https://docs.expo.io/guides/config-plugins/) to the [`plugins`](https://docs.expo.io/versions/latest/config/app/#plugins) array of your `app.json` or `app.config.js`:

```json
{
  "expo": {
    "plugins": ["@sfourdrinier/react-native-ble-plx"]
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
- `iosEnableRestoration` (_boolean_): Opt-in to the iOS BLE state restoration subspec (disabled by default). When true, the Podfile will include `react-native-ble-plx/Restoration` and the adapter will register with a restoration registry if present.
- `iosRestorationIdentifier` (_string_): Custom CBCentralManager restoration identifier. Written to `Info.plist` as `BlePlxRestoreIdentifier` and passed to `BleManager` for state restoration. Defaults to `com.reactnativebleplx.restore`.

> Expo SDK 48 supports iOS 13+ which means `NSBluetoothPeripheralUsageDescription` is fully deprecated. It is no longer setup in `@config-plugins/react-native-ble-plx@5.0.0` and greater.

#### Example

```json
{
  "expo": {
    "plugins": [
      [
        "@sfourdrinier/react-native-ble-plx",
        {
          "isBackgroundEnabled": true,
          "modes": ["peripheral", "central"],
          "bluetoothAlwaysPermission": "Allow $(PRODUCT_NAME) to connect to bluetooth devices",
          "iosEnableRestoration": true,
          "iosRestorationIdentifier": "com.example.myapp.bleplx"
        }
      ]
    ]
  }
}
```

### iOS (Manual Setup)

1. `npm install --save @sfourdrinier/react-native-ble-plx`
1. Enter `ios` folder and run `pod update`
1. Add `NSBluetoothAlwaysUsageDescription` in `info.plist` file. (it is a requirement since iOS 13)
1. If you want to support background mode:
   - In your application target go to `Capabilities` tab and enable `Uses Bluetooth LE Accessories` in
     `Background Modes` section.
   - Pass `restoreStateIdentifier` and `restoreStateFunction` to `BleManager` constructor.

#### Optional: iOS BLE State Restoration (Restoration subspec)

- Opt-in via the config plugin: set `iosEnableRestoration: true` and optionally `iosRestorationIdentifier` to a stable string.
- The plugin writes `BlePlxRestoreIdentifier` into `Info.plist` and injects the `react-native-ble-plx/Restoration` subspec into your Podfile.
- In JS, pass the same identifier to `BleManager`:

```ts
const manager = new BleManager({
  restoreStateIdentifier: 'com.example.myapp.bleplx',
  restoreStateFunction: (restoredState) => {
    // Rehydrate your app, reconnect devices, etc.
  },
});
```

- The Restoration subspec exposes a Swift adapter (`BlePlxRestorationAdapter`) that will register with any restoration registry present in the host app (for example, a shared `BleRestorationRegistry`). If no registry is present, it is a no-op.

### Android (Manual Setup)

1. `npm install --save @sfourdrinier/react-native-ble-plx`
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

## iOS BLE State Restoration (Optional)

This fork includes **optional** support for iOS BLE state restoration, allowing your app to automatically reconnect to BLE devices after iOS terminates it in the background.

### Why Use State Restoration?

| Scenario | Without Restoration | With Restoration |
|----------|---------------------|------------------|
| App killed by iOS while connected | Connection lost, user must manually reconnect | Auto-reconnects when device sends data |
| Phone rebooted while wearing sensor | Must open app and reconnect | System restores connection automatically |
| Long recording session (hours) | Risk of disconnection if iOS reclaims memory | Seamless reconnection maintains session |

### How It Works

1. User connects to a BLE device and starts streaming data
2. User switches to another app or locks the phone
3. iOS terminates your app to free memory (not a crash - iOS reclaiming resources)
4. Later, the BLE device sends data (e.g., user is still wearing it)
5. iOS wakes your app in the background with the restoration state
6. `BlePlxRestorationAdapter` handles automatic reconnection

### Enabling Restoration (Expo)

```json
{
  "expo": {
    "plugins": [
      [
        "@sfourdrinier/react-native-ble-plx",
        {
          "isBackgroundEnabled": true,
          "modes": ["central"],
          "iosEnableRestoration": true,
          "iosRestorationIdentifier": "com.yourapp.bleplx"
        }
      ]
    ]
  }
}
```

Then in your JavaScript code:

```typescript
const manager = new BleManager({
  restoreStateIdentifier: 'com.yourapp.bleplx',  // Must match iosRestorationIdentifier
  restoreStateFunction: (restoredState) => {
    if (restoredState?.connectedPeripherals) {
      console.log('Restored peripherals:', restoredState.connectedPeripherals);
      // Reconnect to devices, resume streaming, etc.
    }
  },
});
```

### Enabling Restoration (Manual / Non-Expo)

1. Add the Restoration subspec to your Podfile:
   ```ruby
   pod 'react-native-ble-plx/Restoration', :path => '../node_modules/@sfourdrinier/react-native-ble-plx'
   ```

2. Add `BleRestoration` pod as a dependency (or implement your own restoration registry)

3. Add to your `Info.plist`:
   ```xml
   <key>BlePlxRestoreIdentifier</key>
   <string>com.yourapp.bleplx</string>
   ```

4. Enable background modes in Xcode: `Capabilities` → `Background Modes` → `Uses Bluetooth LE accessories`

### Not Using Restoration?

**No action needed.** The restoration feature is entirely opt-in:

- The `Restoration` subspec is not included by default
- Native code uses runtime reflection - if restoration classes aren't present, it's a no-op
- No changes to the JavaScript API
- Works exactly like upstream `react-native-ble-plx`

### Multi-Adapter Support

If your app uses multiple BLE SDKs (e.g., Polar SDK + generic BLE-PLX), the restoration system supports routing devices to the correct adapter via `BleRestorationRegistry`:

```swift
// Each adapter registers itself
BleRestorationRegistry.registerDevice(deviceId, BlePlxRestorationAdapter.self)
```

This ensures that when iOS restores the app, each device is reconnected by the appropriate SDK.

## Troubleshooting

## Releasing

To publish a new version of the package:

1. **Ensure all tests pass:**
   ```bash
   pnpm test:package
   pnpm test:plugin
   ```

2. **Commit your changes** with a conventional commit message:
   ```bash
   git add .
   git commit -m "fix: description of fix"
   git push origin master
   ```

3. **Bump version** in `package.json` (follow semver):
   ```bash
   # Edit package.json to update version
   git add package.json
   git commit -m "chore: release X.Y.Z"
   git push origin master
   ```

4. **Create and push git tag:**
   ```bash
   git tag vX.Y.Z -m "Release vX.Y.Z"
   git push origin vX.Y.Z
   ```

5. **Build and publish:**
   ```bash
   pnpm run prepack
   pnpm publish --access public --no-git-checks
   ```

**Commit message conventions:**
- `fix:` - Bug fixes (patch version)
- `feat:` - New features (minor version)
- `chore:` - Maintenance tasks
- `docs:` - Documentation updates

## Contributions

- Special thanks to @EvanBacon for supporting the expo config plugin.
