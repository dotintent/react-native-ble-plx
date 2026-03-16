# Getting Started with react-native-ble-plx v4

This guide covers everything from installation to your first successful BLE read. If you've used v3 before, the API will feel familiar -- but the internals are completely different. If you're new to BLE on mobile, buckle up.

## Prerequisites

- **React Native 0.82+** (New Architecture / TurboModules required)
- **Expo SDK 55+** (if using Expo)
- **iOS 15+** deployment target
- **Android API 23+** (minSdk)
- **A physical device** -- BLE does not work in the iOS Simulator or Android Emulator (unless you enjoy staring at "PoweredOff" state forever)

## Installation

### Expo (Recommended)

If you're using Expo (and you should be), this is the easy part.

```bash
npx expo install react-native-ble-plx
```

Add the config plugin to your `app.json` or `app.config.js`:

```json
{
  "expo": {
    "plugins": ["react-native-ble-plx"]
  }
}
```

That's it. The plugin automatically handles:

- **iOS:** Adds `NSBluetoothAlwaysUsageDescription` to your Info.plist
- **Android:** Adds `BLUETOOTH`, `BLUETOOTH_ADMIN`, `BLUETOOTH_CONNECT`, and `BLUETOOTH_SCAN` permissions to your manifest, with `neverForLocation` set by default

Build and run on a physical device:

```bash
npx expo run:ios --device
# or
npx expo run:android
```

This library requires native code, so it **does not work with Expo Go**. You need a [development build](https://docs.expo.dev/develop/development-builds/introduction/). Yes, this means goodbye to the QR-code-and-pray workflow. BLE is a native API; there's no JavaScript polyfill for radio hardware.

#### Config Plugin Options

Need background BLE or custom permission strings? Pass options to the plugin:

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-ble-plx",
        {
          "isBackgroundEnabled": true,
          "modes": ["central"],
          "bluetoothAlwaysPermission": "Allow $(PRODUCT_NAME) to connect to bluetooth devices"
        }
      ]
    ]
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `isBackgroundEnabled` | boolean | `false` | Add `bluetooth-central` to iOS background modes |
| `modes` | string[] | `[]` | iOS `UIBackgroundModes`: `"peripheral"`, `"central"` |
| `bluetoothAlwaysPermission` | string \| false | `'Allow $(PRODUCT_NAME) to connect to bluetooth devices'` | iOS `NSBluetoothAlwaysUsageDescription`. Set to `false` to skip. |
| `neverForLocation` | boolean | `true` | If true, adds `neverForLocation` flag to Android `BLUETOOTH_SCAN`. Only set to `false` if you're deriving physical location from BLE scans. |

### Bare React Native

If you're going bare... you chose this life.

```bash
npm install react-native-ble-plx
# or
yarn add react-native-ble-plx
```

Then install pods:

```bash
cd ios && pod install && cd ..
```

You'll also need to manually configure iOS and Android permissions -- see the Platform Setup section below.

## Platform Setup

### Handled Automatically by Expo Plugin

If you're using the Expo config plugin, skip this entire section. The plugin configures Info.plist permissions, Android manifest permissions, and the `neverForLocation` flag for you. Go directly to [Runtime Permissions](#runtime-permissions-all-projects).

### iOS (Bare RN Only)

#### Info.plist

Add the Bluetooth usage description. iOS requires this since iOS 13 -- without it, your app will crash on launch when it tries to access Bluetooth.

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>This app uses Bluetooth to communicate with BLE devices.</string>
```

#### Background Mode (Optional)

If your app needs to maintain BLE connections while backgrounded:

1. In Xcode, select your app target
2. Go to **Signing & Capabilities**
3. Add **Background Modes**
4. Check **Uses Bluetooth LE accessories**

Or in your `Info.plist`:

```xml
<key>UIBackgroundModes</key>
<array>
  <string>bluetooth-central</string>
</array>
```

#### State Restoration (Optional)

If you want iOS to relaunch your app when a BLE event occurs after the system killed it:

```typescript
const manager = new BleManager();
await manager.createClient('my-restore-identifier');

manager.onRestoreState(event => {
  // event.devices contains previously connected peripherals
  console.log('Restored devices:', event.devices);
});
```

State restoration only works for system-terminated apps. If the user force-quits from the app switcher, restoration is disabled.

### Android (Bare RN Only)

#### AndroidManifest.xml

Add the required permissions:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Android 12+ (API 31+) -->
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />

    <!-- Android 11 and below -->
    <uses-permission android:name="android.permission.BLUETOOTH"
        android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN"
        android:maxSdkVersion="30" />

    <!-- Location (required for BLE scanning on Android < 12) -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />

    <!-- Declare BLE hardware requirement -->
    <uses-feature android:name="android.hardware.bluetooth_le"
        android:required="true" />

    <!-- ... -->
</manifest>
```

#### The `neverForLocation` Option (Android 12+)

If your app never derives physical location from BLE scan results, you can skip the location permission:

```xml
<uses-permission android:name="android.permission.BLUETOOTH_SCAN"
    android:usesPermissionFlags="neverForLocation" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"
    android:maxSdkVersion="30" />
```

With this flag, you only need `BLUETOOTH_SCAN` and `BLUETOOTH_CONNECT` at runtime on Android 12+. No location permission dance.

**Warning:** If your app uses BLE beacons for indoor positioning or otherwise derives location from scan data, do NOT set this flag. Google will reject your app.

## Runtime Permissions (All Projects)

This section applies to both Expo and bare React Native. The native manifest/plist entries declare what your app *can* ask for. You still need to ask the user at runtime.

Android's BLE permission model makes tax law look simple. Here's the full dance:

```typescript
import { Platform, PermissionsAndroid } from 'react-native';

async function requestBlePermissions(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    // iOS handles permissions via Info.plist -- nothing to request at runtime
    return true;
  }

  if (Platform.OS === 'android') {
    const apiLevel = Number(Platform.Version);

    if (apiLevel < 31) {
      // Android 11 and below: need location permission
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    // Android 12+: need BLUETOOTH_SCAN and BLUETOOTH_CONNECT
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      // Include location if you did NOT set neverForLocation
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);

    return (
      result['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
      result['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
      result['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
    );
  }

  return false;
}
```

If you set `neverForLocation: true` (the default in the Expo plugin), you can drop `ACCESS_FINE_LOCATION` from the Android 12+ branch. One less dialog for the user, one less reason for them to hit "Deny."

## Your First Scan, Connect, and Read

Here's a complete working example. This is the whole flow: check state, scan, connect, discover, read.

```typescript
import { BleManager, State, BleError, ScanResult } from 'react-native-ble-plx';

const manager = new BleManager();

async function main() {
  // 1. Initialize the native BLE client
  await manager.createClient();

  // 2. Wait for Bluetooth to be powered on
  const state = await manager.state();
  if (state !== State.PoweredOn) {
    console.log('Bluetooth is not on. Current state:', state);
    await waitForPoweredOn();
  }

  // 3. Request permissions (Android)
  const hasPermission = await requestBlePermissions();
  if (!hasPermission) {
    console.error('BLE permissions not granted');
    return;
  }

  // 4. Scan for a specific device
  console.log('Scanning...');
  const device = await scanForDevice('MyPeripheral');
  console.log('Found device:', device.id, device.name);

  // 5. Connect
  const connectedDevice = await manager.connectToDevice(device.id, {
    timeout: 10000,  // 10 second timeout
    retries: 2,      // retry twice on failure
  });
  console.log('Connected! MTU:', connectedDevice.mtu);

  // 6. Discover services and characteristics
  await manager.discoverAllServicesAndCharacteristics(device.id);

  // 7. Read a characteristic
  const characteristic = await manager.readCharacteristicForDevice(
    device.id,
    '0000180a-0000-1000-8000-00805f9b34fb', // Device Information service
    '00002a29-0000-1000-8000-00805f9b34fb', // Manufacturer Name characteristic
  );
  console.log('Manufacturer:', atob(characteristic.value ?? ''));

  // 8. Clean up when done
  await manager.cancelDeviceConnection(device.id);
  await manager.destroyClient();
}

function waitForPoweredOn(): Promise<void> {
  return new Promise(resolve => {
    const sub = manager.onStateChange(state => {
      if (state === State.PoweredOn) {
        sub.remove();
        resolve();
      }
    }, true); // emitCurrentState prevents race condition
  });
}

function scanForDevice(name: string): Promise<ScanResult> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(async () => {
      await manager.stopDeviceScan();
      reject(new Error('Scan timed out'));
    }, 15000);

    manager.startDeviceScan(null, null, async (error, device) => {
      if (error) {
        clearTimeout(timeout);
        reject(error);
        return;
      }
      if (device?.name === name) {
        clearTimeout(timeout);
        await manager.stopDeviceScan();
        resolve(device);
      }
    });
  });
}
```

## Monitoring Characteristic Notifications

For streaming data (notifications or indications):

```typescript
const subscription = manager.monitorCharacteristicForDevice(
  deviceId,
  serviceUuid,
  characteristicUuid,
  (error, characteristic) => {
    if (error) {
      console.error('Monitor error:', error);
      return;
    }
    console.log('New value:', characteristic?.value);
  },
  {
    subscriptionType: 'notify', // or 'indicate', or null for auto-detect
    batchInterval: 0,           // 0 = immediate delivery, >0 = batch in ms
  }
);

// When you're done listening:
subscription.remove();
```

The subscription `.remove()` call is important -- it cleans up both the JavaScript listener and the native notification registration. In v3, this was broken. In v4, it works properly.

## Common Gotchas

### 1. BLE Doesn't Work in Simulators

The iOS Simulator and Android Emulator don't support Bluetooth. You need a physical device. There is no workaround. If you see `State.PoweredOff` or `State.Unsupported`, check if you're running on a real device.

### 2. Android 12+ Permission Changes

Android 12 (API 31) introduced `BLUETOOTH_SCAN` and `BLUETOOTH_CONNECT` as separate runtime permissions. The old `BLUETOOTH` and `BLUETOOTH_ADMIN` permissions still need to be in the manifest (with `maxSdkVersion="30"`) for backward compatibility, but the runtime request is different. See the permission section above.

### 3. iOS Bluetooth State on Launch

When your app launches, iOS reports the Bluetooth state as `Unknown` for a brief moment before settling on the actual state. Always use `onStateChange` with `emitCurrentState: true` or poll `state()` and wait for `PoweredOn` before attempting any BLE operations.

### 4. Scanning Finds the Same Device Multiple Times

This is normal. A BLE peripheral broadcasts advertisements periodically, and each broadcast triggers your scan callback. Filter duplicates by device ID on the JS side, or use `allowDuplicates: false` on iOS.

### 5. Must Discover Before Read/Write

You cannot read or write characteristics until you've called `discoverAllServicesAndCharacteristics()`. This is a fundamental BLE requirement, not a library limitation. Discovery only needs to happen once per connection.

### 6. Values Are Base64-Encoded

All characteristic values are Base64-encoded strings. Use `atob()` to decode or `btoa()` to encode. For binary data, decode the Base64 string to a byte array:

```typescript
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
```

## Next Steps

- **[API Reference](API.md)** -- full documentation for every `BleManager` method
- **[Troubleshooting](TROUBLESHOOTING.md)** -- when things go wrong (and they will)
- **[Migration from v3](MIGRATION_V3_TO_V4.md)** -- if you're upgrading an existing app
