# Migrating from v3 to v4

v4 is a ground-up rewrite. The JavaScript API is intentionally similar to v3, so upgrading shouldn't require rewriting your entire BLE layer -- but there are real breaking changes that need attention.

## The Short Version

1. Update your React Native to 0.82+ (New Architecture required)
2. Update the package
3. Fix the 4-5 breaking changes listed below
4. Enjoy things actually working correctly

## Requirements

| Requirement | v3 | v4 |
|-------------|----|----|
| React Native | 0.60+ | **0.82+** |
| Architecture | Bridge (old) or New | **New Architecture only** |
| Expo SDK | 43+ | **55+** |
| iOS | 13+ | **15+** |
| Android API | 18+ | **23+** |

If you're still on the Bridge architecture, you need to migrate to New Architecture first. React Native 0.82 removed the legacy architecture entirely, so this isn't optional.

## Package Update

```diff
- "react-native-ble-plx": "^3.x.x"
+ "react-native-ble-plx": "^4.0.0"
```

```bash
npm install react-native-ble-plx@latest
cd ios && pod install
```

## Breaking Changes

### 1. `enable()` and `disable()` Are Gone

These methods were broken on Android 12+ (the system throws a SecurityException) and were always a no-op on iOS. They've been removed.

```typescript
// v3
await manager.enable();     // Broken on Android 12+
await manager.disable();    // Broken on Android 12+

// v4 -- redirect users to system settings
import { Linking, Platform } from 'react-native';
if (Platform.OS === 'android') {
  Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS');
} else {
  Linking.openURL('App-Prefs:Bluetooth');
}
```

### 2. Enums Are Now `const` Objects

v3 used TypeScript enums, which had runtime type mismatch issues (the native module returned strings, but the enum compared as numbers). v4 uses `as const` objects, which are strings all the way down.

```typescript
// v3
import { State } from 'react-native-ble-plx';
if (state === State.PoweredOn) { ... }  // Worked, but types were wrong

// v4 -- same usage, correct types
import { State } from 'react-native-ble-plx';
if (state === State.PoweredOn) { ... }  // Works and types are correct
```

The usage looks identical, but if you were doing numeric comparisons against enum values, those will break:

```typescript
// v3 -- don't do this, but some people did
if (state === 5) { ... } // PoweredOn was enum value 5

// v4 -- this no longer works
if (state === 'PoweredOn') { ... } // Use the string value
```

Affected types: `State`, `LogLevel`, `ConnectionPriority`, `ConnectionState`.

### 3. `BleManager` Is No Longer a Silent Singleton

In v3.4.0, `BleManager` became a singleton that silently returned the same instance. In v4, each `new BleManager()` creates an independent instance. If you relied on the singleton behavior, create your own:

```typescript
// v4 -- make your own singleton if you need one
let instance: BleManager | null = null;

export function getBleManager(): BleManager {
  if (!instance) {
    instance = new BleManager();
  }
  return instance;
}
```

### 4. `createClient()` Must Be Called Explicitly

In v3, the native client was initialized automatically in the constructor. In v4, you must call `createClient()` before doing anything:

```typescript
// v3
const manager = new BleManager();
manager.startDeviceScan(...); // Worked immediately

// v4
const manager = new BleManager();
await manager.createClient();     // Required!
manager.startDeviceScan(...);
```

### 5. Monitor Subscription Cleanup Actually Works

In v3, calling `.remove()` on a monitor subscription didn't fully clean up the JavaScript event listener (bugs #1308, #1299). In v4, `.remove()` properly tears down everything: the native notification registration, the JS event listener, and the transaction.

This isn't really a breaking change -- it's a bug fix -- but if you wrote workarounds for the broken cleanup, you can remove them.

## API Changes

### Renamed / Changed Methods

| v3 | v4 | Notes |
|----|----|----|
| `new BleManager()` (auto-init) | `new BleManager()` + `await createClient()` | Explicit initialization |
| `manager.enable()` | Removed | Use system settings |
| `manager.disable()` | Removed | Use system settings |
| `manager.setLogLevel()` | Removed | Log level not exposed in v4 TurboModule |

### Changed Return Types

Several methods that previously returned wrapper objects (`Device`, `Service`, `Characteristic`) now return plain data objects (`DeviceInfo`, `CharacteristicInfo`). The data is the same; the wrapper methods are gone.

```typescript
// v3
const device = await manager.connectToDevice(id);
await device.discoverAllServicesAndCharacteristics(); // Method on Device object
await device.readCharacteristicForService(serviceUuid, charUuid);

// v4 -- use BleManager methods directly with device ID
const device = await manager.connectToDevice(id);
await manager.discoverAllServicesAndCharacteristics(device.id);
await manager.readCharacteristicForDevice(device.id, serviceUuid, charUuid);
```

The `Device`, `Service`, `Characteristic`, and `Descriptor` classes still exist as exports for backward compatibility but are thin wrappers. Prefer using `BleManager` methods directly.

### New Parameters

`connectToDevice` now accepts `retries` and `retryDelay`:

```typescript
// v4
await manager.connectToDevice(deviceId, {
  timeout: 10000,
  retries: 3,       // New: retry on transient failures
  retryDelay: 1000, // New: wait 1s between retries
  requestMtu: 517,  // New: auto-request MTU after connect
});
```

`monitorCharacteristicForDevice` now accepts `batchInterval` and `subscriptionType`:

```typescript
// v4
manager.monitorCharacteristicForDevice(
  deviceId, serviceUuid, charUuid,
  listener,
  {
    batchInterval: 50,          // New: batch notifications every 50ms
    subscriptionType: 'indicate', // New: explicit indicate vs notify
  }
);
```

## New Features in v4

### PHY Selection (Android)

Request BLE 5.0 PHY modes for faster throughput or longer range:

```typescript
await manager.requestPhy(deviceId, 2, 2); // LE 2M PHY
const phy = await manager.readPhy(deviceId);
```

### L2CAP Channels (iOS)

Stream-oriented data transfer without GATT overhead:

```typescript
const channel = await manager.openL2CAPChannel(deviceId, psm);
await manager.writeL2CAPChannel(channel.channelId, btoa('data'));
await manager.closeL2CAPChannel(channel.channelId);
```

### Connection Priority (Android)

```typescript
import { ConnectionPriority } from 'react-native-ble-plx';
await manager.requestConnectionPriority(deviceId, ConnectionPriority.High);
```

### Bond State Monitoring (Android)

```typescript
const sub = manager.onBondStateChange(event => {
  console.log(event.deviceId, event.bondState); // 'none' | 'bonding' | 'bonded'
});
```

### Connection Events (iOS)

```typescript
const sub = manager.onConnectionEvent(event => {
  console.log(event.deviceId, event.connectionState);
});
```

### Authorization Status (iOS)

```typescript
const status = await manager.getAuthorizationStatus();
// 'NotDetermined' | 'Restricted' | 'Denied' | 'Authorized'
```

### Event Batching

High-frequency notifications no longer flood the JS thread:

```typescript
// Batch notifications every 50ms
manager.monitorCharacteristicForDevice(deviceId, svc, char, listener, {
  batchInterval: 50,
});

// Configure scan result batching
const manager = new BleManager({ scanBatchIntervalMs: 200 });
```

### Unified Error Model

Every error now includes rich diagnostic information:

```typescript
try {
  await manager.connectToDevice(deviceId);
} catch (e) {
  if (e instanceof BleError) {
    console.log('Code:', e.code);
    console.log('Retryable:', e.isRetryable);
    console.log('Platform:', e.platform);
    console.log('GATT status:', e.gattStatus);    // Android
    console.log('ATT error:', e.attErrorCode);     // iOS
    console.log('Native code:', e.nativeCode);
  }
}
```

## No More `NativeEventEmitter` Setup

In v3, you might have seen code like this for handling native events:

```typescript
// v3 -- manual NativeEventEmitter wiring
import { NativeEventEmitter, NativeModules } from 'react-native';
const bleEmitter = new NativeEventEmitter(NativeModules.BleManager);
```

v4 uses TurboModule typed events. All event handling goes through `BleManager` methods (`onStateChange`, `onDeviceDisconnected`, `monitorCharacteristicForDevice`, etc.). No manual `NativeEventEmitter` setup needed.

## Checklist

- [ ] React Native updated to 0.82+ with New Architecture enabled
- [ ] Package updated to v4
- [ ] `createClient()` called before any BLE operations
- [ ] `enable()` / `disable()` calls removed
- [ ] Enum numeric comparisons changed to string comparisons (if any)
- [ ] Singleton workarounds removed (if using v3.4+ singleton behavior)
- [ ] `NativeEventEmitter` manual setup removed
- [ ] Monitor cleanup workarounds removed
- [ ] Tested on physical devices (both platforms)
