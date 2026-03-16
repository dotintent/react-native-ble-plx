<h1 align="center">
  <img
    alt="react-native-ble-plx library logo"
    src="docs/logo.png"
    height="300"
    style="margin-top: 20px; margin-bottom: 20px;"
  />
</h1>

# react-native-ble-plx

A React Native library for talking to Bluetooth Low Energy peripherals. Built as a TurboModule for the New Architecture from the ground up.

Yes, BLE is hard. No, this library won't make it easy -- but it'll make it possible without losing your mind.

## What's New in v4

v4 is a complete rewrite. The old Bridge-based native code is gone, replaced by:

- **TurboModule with Codegen** -- typed native events, no more `NativeEventEmitter` manual wiring
- **Fabric / New Architecture only** -- React Native 0.82+ required (legacy arch was removed in 0.82)
- **Android: Nordic BLE Library** -- proper GATT operation queuing, auto-MTU 517, coroutine-based
- **iOS: Swift actor + CoreBluetooth** -- thread-safe by design, no more delegate spaghetti
- **Modern BLE features** -- PHY selection, L2CAP channels, connection events, bond state monitoring
- **Unified error model** -- rich, cross-platform `BleError` with platform diagnostics
- **Event batching** -- configurable backpressure so notification storms don't crash your JS thread
- **25 audit issues fixed** -- every known bug from the v3 audit is resolved

## Compatibility

| Requirement | Minimum |
|-------------|---------|
| React Native | >= 0.82.0 |
| Expo SDK | 55+ |
| iOS | 15+ |
| Android API | 23+ |
| Architecture | New Architecture (TurboModule) |

This library does **not** work with Expo Go. You need a [development build](https://docs.expo.dev/develop/development-builds/introduction/).

## 60-Second Quickstart

### Expo (recommended)

```bash
npx expo install react-native-ble-plx
```

Add the config plugin to your `app.json`:

```json
{
  "expo": {
    "plugins": ["react-native-ble-plx"]
  }
}
```

Build and run on a physical device:

```bash
npx expo run:ios --device
```

### Bare React Native

```bash
npm install react-native-ble-plx
cd ios && pod install
```

### Then, regardless of how you got here:

```typescript
import { BleManager, State } from 'react-native-ble-plx';

const manager = new BleManager();
await manager.createClient();

// Wait for Bluetooth to be ready
const currentState = await manager.state();
if (currentState !== State.PoweredOn) {
  await new Promise<void>(resolve => {
    const sub = manager.onStateChange(state => {
      if (state === State.PoweredOn) {
        sub.remove();
        resolve();
      }
    });
  });
}

// Scan for devices
manager.startDeviceScan(null, null, (error, device) => {
  if (error) return console.error(error);
  if (device?.name === 'MyDevice') {
    manager.stopDeviceScan();
    connectAndRead(device.id);
  }
});

async function connectAndRead(deviceId: string) {
  const device = await manager.connectToDevice(deviceId);
  await manager.discoverAllServicesAndCharacteristics(deviceId);
  const char = await manager.readCharacteristicForDevice(
    deviceId,
    'service-uuid-here',
    'characteristic-uuid-here'
  );
  console.log('Value:', char.value); // Base64-encoded
}
```

That's it. For the full setup (permissions, platform config, Expo), see the [Getting Started guide](docs/GETTING_STARTED.md).

## Example Apps

- **[Expo example](example-expo/)** -- Expo SDK 55, expo-router. Start here.
- **[Bare RN example](example/)** -- React Native 0.84, React Navigation. For the brave.

## Documentation

- **[Getting Started](docs/GETTING_STARTED.md)** -- Installation, permissions, platform setup, first scan
- **[API Reference](docs/API.md)** -- Every method on `BleManager`, fully typed
- **[Migration Guide (v3 to v4)](docs/MIGRATION_V3_TO_V4.md)** -- What changed, what broke, how to fix it
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** -- Common problems and their solutions
- **[E2E Testing](docs/TESTING.md)** -- Hardware test infrastructure and maestro-runner flows

## What This Library Does

- Observe Bluetooth adapter state
- Scan for BLE peripherals (including BLE 5.0 extended advertising)
- Connect to peripherals with configurable retry and timeout
- Discover services and characteristics
- Read, write (with and without response), and monitor characteristics
- Subscribe to notifications and indications
- Negotiate MTU
- Request PHY (BLE 5.0, Android)
- Open L2CAP channels (iOS)
- Monitor bond state changes (Android)
- iOS background mode with state restoration

## What This Library Does NOT Do

- Bluetooth Classic -- BLE only
- Peripheral/server role -- central only
- Beacons -- use a dedicated beacon library
- LE Audio / LC3 codec
- Web or desktop platforms

## Migrating from v3

The API surface is intentionally similar to v3, but there are breaking changes. The big ones:

- `enable()` and `disable()` are gone (broken on Android 12+, use system settings)
- `State`, `ConnectionPriority`, etc. are `const` objects, not TypeScript enums
- Monitor subscription `.remove()` now actually cleans up (yes, it was broken before)
- Requires React Native 0.82+ (New Architecture only)

Full details in the [Migration Guide](docs/MIGRATION_V3_TO_V4.md).

## Expo Config Plugin

The quickstart above covers the basics. If you need background BLE or want to customize permissions, pass options:

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
| `bluetoothAlwaysPermission` | string \| false | `'Allow $(PRODUCT_NAME) to connect to bluetooth devices'` | iOS `NSBluetoothAlwaysUsageDescription` |
| `neverForLocation` | boolean | `true` | If true, adds `neverForLocation` flag to Android `BLUETOOTH_SCAN` |

Full details in the [Getting Started guide](docs/GETTING_STARTED.md).

## Contributing

PRs welcome. If you're fixing a bug, include a test case or at minimum describe how to reproduce it. If you're adding a feature, open an issue first so we can discuss the API.

## License

Apache License 2.0
