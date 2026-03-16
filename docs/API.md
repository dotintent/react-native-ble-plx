# API Reference

Complete reference for `BleManager` -- the only class you need to interact with for all BLE operations.

```typescript
import { BleManager } from 'react-native-ble-plx';
```

---

## Table of Contents

- [Types](#types)
- [Lifecycle](#lifecycle)
- [State](#state)
- [Scanning](#scanning)
- [Connection](#connection)
- [Discovery](#discovery)
- [Read / Write](#read--write)
- [Monitoring](#monitoring)
- [MTU](#mtu)
- [PHY](#phy)
- [Connection Priority](#connection-priority)
- [L2CAP](#l2cap)
- [Bonding](#bonding)
- [Authorization](#authorization)
- [Events](#events)
- [Cancellation](#cancellation)
- [Error Codes](#error-codes)

---

## Types

### `State`

Bluetooth adapter state.

```typescript
const State = {
  Unknown: 'Unknown',
  Resetting: 'Resetting',
  Unsupported: 'Unsupported',
  Unauthorized: 'Unauthorized',
  PoweredOff: 'PoweredOff',
  PoweredOn: 'PoweredOn',
} as const;
type State = (typeof State)[keyof typeof State];
```

### `ConnectionPriority`

Android connection priority levels. iOS ignores these.

```typescript
const ConnectionPriority = {
  Balanced: 0,
  High: 1,
  LowPower: 2,
} as const;
type ConnectionPriority = (typeof ConnectionPriority)[keyof typeof ConnectionPriority];
```

### `ConnectionState`

```typescript
const ConnectionState = {
  Disconnected: 'disconnected',
  Connecting: 'connecting',
  Connected: 'connected',
  Disconnecting: 'disconnecting',
} as const;
type ConnectionState = (typeof ConnectionState)[keyof typeof ConnectionState];
```

### `LogLevel`

Exported for forward compatibility, but currently unused. There is no `setLogLevel()` method in v4 -- the native modules handle their own logging. This may become functional in a future release.

```typescript
const LogLevel = {
  None: 'None',
  Verbose: 'Verbose',
  Debug: 'Debug',
  Info: 'Info',
  Warning: 'Warning',
  Error: 'Error',
} as const;
type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];
```

### `ScanOptions`

Options for `startDeviceScan`.

```typescript
interface ScanOptions {
  scanMode?: number;        // Android: 0=opportunistic, 1=lowPower, 2=balanced, -1=lowLatency
  callbackType?: number;    // Android: 1=allMatches, 2=firstMatch, 4=matchLost
  legacyScan?: boolean;     // false = BLE 5.0 extended advertising
  allowDuplicates?: boolean; // iOS only
}
```

### `ConnectOptions`

Options for `connectToDevice`.

```typescript
interface ConnectOptions {
  autoConnect?: boolean;  // Android: true=background connect, false=direct (default)
  timeout?: number;       // Connection timeout in ms
  retries?: number;       // Retry attempts (default 1 = no retry)
  retryDelay?: number;    // Ms between retries (default 1000)
  requestMtu?: number;    // Request MTU after connect (default 517 on Android)
}
```

### `MonitorOptions`

Options for `monitorCharacteristicForDevice`.

```typescript
interface MonitorOptions {
  transactionId?: string;
  batchInterval?: number;                        // 0 = immediate, >0 = batch in ms
  subscriptionType?: 'notify' | 'indicate' | null; // null = auto-detect
}
```

### `BleManagerOptions`

Constructor options for `BleManager`.

```typescript
interface BleManagerOptions {
  scanBatchIntervalMs?: number; // Default: 100ms
}
```

### `DeviceInfo`

Returned by connection, discovery, and scan operations.

```typescript
interface DeviceInfo {
  readonly id: string;                    // Android: MAC address. iOS: opaque UUID.
  readonly name: string | null;
  readonly rssi: number;
  readonly mtu: number;
  readonly isConnectable: boolean | null;
  readonly serviceUuids: readonly string[];
  readonly manufacturerData: string | null; // Base64-encoded
}
```

### `CharacteristicInfo`

Returned by read, write, and monitor operations.

```typescript
interface CharacteristicInfo {
  readonly deviceId: string;
  readonly serviceUuid: string;
  readonly uuid: string;
  readonly value: string | null;  // Base64-encoded
  readonly isNotifying: boolean;
  readonly isIndicatable: boolean;
  readonly isReadable: boolean;
  readonly isWritableWithResponse: boolean;
  readonly isWritableWithoutResponse: boolean;
}
```

### `ScanResult`

Emitted during scanning.

```typescript
interface ScanResult {
  readonly id: string;
  readonly name: string | null;
  readonly rssi: number;
  readonly serviceUuids: readonly string[];
  readonly manufacturerData: string | null; // Base64-encoded
}
```

### `Subscription`

Returned by all event-listening methods. Call `.remove()` to unsubscribe.

```typescript
interface Subscription {
  remove(): void;
}
```

### `ConnectionStateEvent`

```typescript
interface ConnectionStateEvent {
  readonly deviceId: string;
  readonly state: string;
  readonly errorCode: number | null;
  readonly errorMessage: string | null;
}
```

### `CharacteristicValueEvent`

```typescript
interface CharacteristicValueEvent {
  readonly deviceId: string;
  readonly serviceUuid: string;
  readonly characteristicUuid: string;
  readonly value: string;           // Base64-encoded
  readonly transactionId: string | null;
}
```

### `BondStateEvent`

```typescript
interface BondStateEvent {
  readonly deviceId: string;
  readonly bondState: string; // 'none' | 'bonding' | 'bonded'
}
```

### `ConnectionEvent`

```typescript
interface ConnectionEvent {
  readonly deviceId: string;
  readonly connectionState: string;
}
```

### `RestoreStateEvent`

```typescript
interface RestoreStateEvent {
  readonly devices: readonly DeviceInfo[];
}
```

### `L2CAPChannelEvent`

```typescript
interface L2CAPChannelEvent {
  readonly channelId: number;
  readonly deviceId: string;
  readonly psm: number;
}
```

### `PhyInfo`

```typescript
interface PhyInfo {
  readonly deviceId: string;
  readonly txPhy: number;
  readonly rxPhy: number;
}
```

---

## Lifecycle

### `constructor(options?: BleManagerOptions)`

Creates a new `BleManager` instance.

```typescript
const manager = new BleManager();
// or with options:
const manager = new BleManager({ scanBatchIntervalMs: 200 });
```

**Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `options.scanBatchIntervalMs` | `number` | `100` | How often scan results are batched and delivered to your callback, in milliseconds. |

---

### `createClient(restoreStateIdentifier?: string | null): Promise<void>`

Initializes the native BLE client. Must be called before any other BLE operations.

```typescript
await manager.createClient();
// With state restoration (iOS):
await manager.createClient('my-app-ble-restore-id');
```

**Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `restoreStateIdentifier` | `string \| null` | `null` | iOS state restoration identifier. Pass a consistent string to enable background restoration. |

Calling `createClient` again invalidates the previous client and creates a fresh one.

---

### `destroyClient(): Promise<void>`

Tears down the native BLE client and cleans up all resources: active scans, monitor subscriptions, pending transactions, event listeners.

```typescript
await manager.destroyClient();
```

Call this when your app no longer needs BLE, or before calling `createClient()` again.

---

## State

### `state(): Promise<State>`

Returns the current Bluetooth adapter state.

```typescript
const currentState = await manager.state();
if (currentState === State.PoweredOn) {
  // Ready to go
}
```

**Returns:** `Promise<State>` -- one of `'Unknown'`, `'Resetting'`, `'Unsupported'`, `'Unauthorized'`, `'PoweredOff'`, `'PoweredOn'`.

---

### `onStateChange(callback, emitCurrentState?): Subscription`

Subscribes to Bluetooth adapter state changes.

```typescript
onStateChange(
  callback: (state: State) => void,
  emitCurrentState?: boolean
): Subscription
```

**Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `callback` | `(state: State) => void` | -- | Called whenever Bluetooth state changes. |
| `emitCurrentState` | `boolean` | `false` | If `true`, immediately emits the current state to the callback. |

**Returns:** `Subscription` -- call `.remove()` to stop listening.

```typescript
const sub = manager.onStateChange(state => {
  console.log('BLE state:', state);
}, true);

// Later:
sub.remove();
```

---

## Scanning

### `startDeviceScan(serviceUuids, options, callback): void`

Starts scanning for BLE peripherals. Only one scan can be active at a time -- calling this again stops the previous scan.

```typescript
startDeviceScan(
  serviceUuids: string[] | null,
  options: ScanOptions | null,
  callback: (error: BleError | null, scannedDevice: ScanResult | null) => void
): void
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `serviceUuids` | `string[] \| null` | Filter by advertised service UUIDs. Pass `null` for all devices. |
| `options` | `ScanOptions \| null` | Platform-specific scan options. |
| `callback` | `function` | Called for each discovered device (may fire multiple times for the same device). |

**Platform notes:**
- **Android:** `scanMode` controls scan aggressiveness. Use `legacyScan: false` to see BLE 5.0 extended advertisements.
- **iOS:** `allowDuplicates` controls whether the same device triggers the callback repeatedly.
- **iOS background:** You MUST specify `serviceUuids` -- passing `null` returns zero results when backgrounded.
- **Android throttling:** Android limits scan starts to ~5 per 30 seconds. Exceeding this silently returns zero results.

```typescript
manager.startDeviceScan(
  ['180a'], // Only devices advertising Device Information service
  { scanMode: 2, legacyScan: false },
  (error, device) => {
    if (error) {
      console.error(error);
      return;
    }
    console.log('Found:', device?.name, device?.id);
  }
);
```

Scan results are batched by default (every 100ms, configurable via `scanBatchIntervalMs` in the constructor). This prevents the JS thread from being overwhelmed during a burst of advertisements.

---

### `stopDeviceScan(): Promise<void>`

Stops the current scan.

```typescript
await manager.stopDeviceScan();
```

---

## Connection

### `connectToDevice(deviceId, options?): Promise<DeviceInfo>`

Connects to a peripheral.

```typescript
connectToDevice(
  deviceId: string,
  options?: ConnectOptions | null
): Promise<DeviceInfo>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `deviceId` | `string` | Device identifier (from scan results). |
| `options` | `ConnectOptions \| null` | Connection options. |

**Returns:** `Promise<DeviceInfo>` -- the connected device info.

**Platform notes:**
- **Android:** Automatically requests MTU 517 after connecting (the #1 source of silent data truncation in v3 -- you'd be amazed how many "my data is corrupted" bugs were just MTU 23). On Android 14+, the system already negotiates MTU 517 on first connection, so the library skips the explicit request to avoid disconnects on some peripherals.
- **Android `autoConnect`:** When `true`, connects opportunistically in the background (slower but persists across Bluetooth toggles). When `false` (default), connects directly and fast.
- **Retries:** Only retryable errors trigger retry (GATT 133, connection timeout). Permission denied, device not found, and user-cancelled errors do not retry.

```typescript
const device = await manager.connectToDevice(deviceId, {
  timeout: 10000,
  retries: 3,
  retryDelay: 1000,
  requestMtu: 512,
});
```

---

### `cancelDeviceConnection(deviceId): Promise<DeviceInfo>`

Disconnects from a peripheral.

```typescript
const device = await manager.cancelDeviceConnection(deviceId);
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `deviceId` | `string` | Device to disconnect from. |

---

### `isDeviceConnected(deviceId): Promise<boolean>`

Checks if a device is currently connected.

```typescript
const connected = await manager.isDeviceConnected(deviceId);
```

---

### `onDeviceDisconnected(deviceId, callback): Subscription`

Subscribes to disconnection events for a specific device.

```typescript
onDeviceDisconnected(
  deviceId: string,
  callback: (error: BleError | null, device: ConnectionStateEvent | null) => void
): Subscription
```

If the disconnection was caused by an error (e.g., GATT failure, connection lost), the `error` parameter will contain a `BleError` with diagnostic info. If the disconnection was intentional (you called `cancelDeviceConnection`), `error` will be `null`.

```typescript
const sub = manager.onDeviceDisconnected(deviceId, (error, event) => {
  if (error) {
    console.error('Unexpected disconnect:', error.message, 'GATT status:', error.gattStatus);
  } else {
    console.log('Clean disconnect');
  }
});
```

---

## Discovery

### `discoverAllServicesAndCharacteristics(deviceId, transactionId?): Promise<DeviceInfo>`

Discovers all services and characteristics on a connected device. Must be called once after connecting before you can read, write, or monitor characteristics.

```typescript
discoverAllServicesAndCharacteristics(
  deviceId: string,
  transactionId?: string | null
): Promise<DeviceInfo>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `deviceId` | `string` | Connected device ID. |
| `transactionId` | `string \| null` | Optional transaction ID for cancellation. |

```typescript
await manager.discoverAllServicesAndCharacteristics(deviceId);
```

---

## Read / Write

### `readCharacteristicForDevice(deviceId, serviceUuid, characteristicUuid, transactionId?): Promise<CharacteristicInfo>`

Reads the current value of a characteristic. The device must be connected and services discovered.

```typescript
readCharacteristicForDevice(
  deviceId: string,
  serviceUuid: string,
  characteristicUuid: string,
  transactionId?: string | null
): Promise<CharacteristicInfo>
```

**Returns:** `Promise<CharacteristicInfo>` -- `value` is Base64-encoded.

```typescript
const result = await manager.readCharacteristicForDevice(
  deviceId,
  '0000180a-0000-1000-8000-00805f9b34fb',
  '00002a29-0000-1000-8000-00805f9b34fb'
);
const decoded = atob(result.value ?? '');
```

---

### `writeCharacteristicForDevice(deviceId, serviceUuid, characteristicUuid, value, withResponse, transactionId?): Promise<CharacteristicInfo>`

Writes a value to a characteristic.

```typescript
writeCharacteristicForDevice(
  deviceId: string,
  serviceUuid: string,
  characteristicUuid: string,
  value: string,          // Base64-encoded
  withResponse: boolean,
  transactionId?: string | null
): Promise<CharacteristicInfo>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `value` | `string` | Base64-encoded data to write. |
| `withResponse` | `boolean` | `true` = write with ATT acknowledgment (slower, reliable). `false` = fire-and-forget (faster, no confirmation). |

**Platform notes:**
- **`withResponse: true`**: The promise resolves when the peripheral acknowledges receipt.
- **`withResponse: false`**: The promise resolves when the data is queued for transmission. On iOS, the library checks `canSendWriteWithoutResponse` and waits for flow control if the buffer is full.

```typescript
const base64Value = btoa('hello');
await manager.writeCharacteristicForDevice(
  deviceId,
  serviceUuid,
  characteristicUuid,
  base64Value,
  true // with response
);
```

---

## Monitoring

### `monitorCharacteristicForDevice(deviceId, serviceUuid, characteristicUuid, listener, options?): Subscription`

Subscribes to characteristic notifications or indications. This is how you receive streaming data from a peripheral.

```typescript
monitorCharacteristicForDevice(
  deviceId: string,
  serviceUuid: string,
  characteristicUuid: string,
  listener: (error: BleError | null, characteristic: CharacteristicValueEvent | null) => void,
  options?: MonitorOptions
): Subscription
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `listener` | `function` | Called for each notification/indication. |
| `options.transactionId` | `string` | Custom transaction ID for cancellation. Auto-generated if not provided. |
| `options.batchInterval` | `number` | Batch interval in ms. `0` = immediate delivery. Default `0`. |
| `options.subscriptionType` | `'notify' \| 'indicate' \| null` | Subscription type. `null` = auto-detect from characteristic properties (prefers notify). |

**Returns:** `Subscription` -- call `.remove()` to stop monitoring. This cleans up both the JavaScript listener and the native notification registration.

```typescript
const sub = manager.monitorCharacteristicForDevice(
  deviceId,
  serviceUuid,
  characteristicUuid,
  (error, event) => {
    if (error) return console.error(error);
    console.log('Value:', event?.value);
  },
  { subscriptionType: 'indicate', batchInterval: 50 }
);

// Later:
sub.remove();
```

---

## MTU

### `requestMTUForDevice(deviceId, mtu, transactionId?): Promise<DeviceInfo>`

Requests a specific MTU (Maximum Transmission Unit) size.

```typescript
requestMTUForDevice(
  deviceId: string,
  mtu: number,
  transactionId?: string | null
): Promise<DeviceInfo>
```

**Platform notes:**
- **Android:** The actual MTU is negotiated -- you may get less than you asked for. Android 14+ automatically negotiates MTU 517 on first connection, so calling this again may cause disconnects on some peripherals.
- **iOS:** MTU is negotiated automatically by CoreBluetooth. Calling this is a no-op. Use `getMtu()` to read the current value.

```typescript
const device = await manager.requestMTUForDevice(deviceId, 512);
console.log('Negotiated MTU:', device.mtu);
```

---

### `getMtu(deviceId): Promise<number>`

Returns the current MTU for a connected device.

```typescript
const mtu = await manager.getMtu(deviceId);
```

---

## PHY

BLE 5.0 Physical Layer selection. Higher PHY rates (2M) give faster throughput; coded PHY gives longer range.

### `requestPhy(deviceId, txPhy, rxPhy): Promise<PhyInfo>`

Requests a specific PHY for transmit and receive.

```typescript
requestPhy(
  deviceId: string,
  txPhy: number,
  rxPhy: number
): Promise<PhyInfo>
```

**PHY values:** `1` = LE 1M (default), `2` = LE 2M, `3` = LE Coded.

**Platform notes:**
- **Android only.** iOS does not expose PHY selection -- CoreBluetooth handles it automatically, and you'll just have to trust that it's making good choices.
- The peripheral must also support the requested PHY. If it doesn't, the controller falls back to LE 1M.

```typescript
const phy = await manager.requestPhy(deviceId, 2, 2); // Request 2M PHY
console.log('TX PHY:', phy.txPhy, 'RX PHY:', phy.rxPhy);
```

---

### `readPhy(deviceId): Promise<PhyInfo>`

Reads the current PHY for a connected device.

```typescript
const phy = await manager.readPhy(deviceId);
```

**Platform notes:** Android only.

---

## Connection Priority

### `requestConnectionPriority(deviceId, priority): Promise<DeviceInfo>`

Requests a connection priority level.

```typescript
requestConnectionPriority(
  deviceId: string,
  priority: ConnectionPriority
): Promise<DeviceInfo>
```

**Platform notes:**
- **Android only.** This is a coarse hint to the Bluetooth controller -- `High` means lower latency (connection interval ~11ms), `LowPower` means less radio usage (interval ~100ms), `Balanced` is in between.
- **iOS:** No-op. iOS handles connection parameters automatically, because Apple knows best. Fine-grained interval/latency/timeout can only be set by the peripheral's firmware, not from the app.

```typescript
import { ConnectionPriority } from 'react-native-ble-plx';
await manager.requestConnectionPriority(deviceId, ConnectionPriority.High);
```

---

## L2CAP

L2CAP (Logical Link Control and Adaptation Protocol) channels provide a stream-oriented data channel between devices, bypassing the GATT overhead.

### `openL2CAPChannel(deviceId, psm): Promise<L2CAPChannelEvent>`

Opens an L2CAP channel to a connected device.

```typescript
openL2CAPChannel(
  deviceId: string,
  psm: number
): Promise<L2CAPChannelEvent>
```

**Platform notes:**
- **iOS only.** Android L2CAP support is limited and not exposed in this library.
- PSM (Protocol/Service Multiplexer) must be a dynamic value read from a GATT characteristic on the peripheral.
- L2CAP channels do NOT wake suspended iOS apps -- only GATT notifications do.

```typescript
const channel = await manager.openL2CAPChannel(deviceId, 0x0080);
console.log('Channel ID:', channel.channelId);
```

---

### `writeL2CAPChannel(channelId, data): Promise<void>`

Writes data to an open L2CAP channel.

```typescript
await manager.writeL2CAPChannel(channelId, btoa('payload'));
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `channelId` | `number` | Channel ID from `openL2CAPChannel`. |
| `data` | `string` | Base64-encoded data to send. |

---

### `closeL2CAPChannel(channelId): Promise<void>`

Closes an L2CAP channel.

```typescript
await manager.closeL2CAPChannel(channelId);
```

---

### `monitorL2CAPChannel(channelId, listener): Subscription`

Subscribes to incoming data and close events on an open L2CAP channel. The listener receives data frames as Base64-encoded strings.

When the channel closes, the listener fires one final time and the subscription auto-cleans itself (removing both native listeners and the manager's tracked subscription):

- **Clean close:** the listener receives `(null, null)` -- both error and data are null, indicating graceful shutdown.
- **Error close:** the listener receives `(BleError, null)` -- the error describes what went wrong.

In both cases, you do **not** need to call `.remove()` on the subscription after an auto-close -- it has already been cleaned up.

```typescript
monitorL2CAPChannel(
  channelId: number,
  listener: (error: BleError | null, data: { channelId: number; data: string } | null) => void
): Subscription
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `channelId` | `number` | Channel ID from `openL2CAPChannel`. |
| `listener` | `function` | Called for each incoming data frame. On channel close, called once with `(BleError, null)` for error close or `(null, null)` for clean close. |

**Returns:** `Subscription` -- call `.remove()` to stop listening before the channel closes. Removing the subscription does **not** close the underlying L2CAP channel; call `closeL2CAPChannel` separately. If the channel has already closed, the subscription is already removed and calling `.remove()` is a safe no-op.

```typescript
const channel = await manager.openL2CAPChannel(deviceId, psm);

const sub = manager.monitorL2CAPChannel(channel.channelId, (error, data) => {
  if (error) {
    console.error('L2CAP error close:', error.message);
    return;
  }
  if (data == null) {
    console.log('L2CAP channel closed cleanly');
    return;
  }
  console.log('Received:', data.data); // Base64-encoded
});

// When done, close the channel (subscription auto-removes on close):
await manager.closeL2CAPChannel(channel.channelId);
```

---

## Bonding

### `getBondedDevices(): Promise<readonly DeviceInfo[]>`

Returns the list of bonded (paired) BLE devices.

```typescript
const bonded = await manager.getBondedDevices();
bonded.forEach(d => console.log(d.name, d.id));
```

**Platform notes:**
- **Android:** Returns devices from `BluetoothAdapter.getBondedDevices()`. Note: bond state only indicates that pairing info exists -- it does NOT verify the link is currently encrypted.
- **iOS:** Returns an empty array. iOS has no equivalent API.

---

## Authorization

### `getAuthorizationStatus(): Promise<string>`

Returns the current Bluetooth authorization status.

```typescript
const status = await manager.getAuthorizationStatus();
// 'NotDetermined' | 'Restricted' | 'Denied' | 'Authorized'
```

**Platform notes:**
- **iOS:** Returns the actual `CBManager.authorization` value.
- **Android:** Always returns `'Authorized'` (use runtime permission checks instead).

---

## Events

### `onRestoreState(callback): Subscription`

Subscribes to iOS state restoration events. Called when the system relaunches your app due to a BLE event.

```typescript
const sub = manager.onRestoreState(event => {
  console.log('Restored devices:', event.devices);
});
```

**Platform notes:** iOS only. Requires `createClient()` to be called with a `restoreStateIdentifier`.

---

### `onBondStateChange(callback): Subscription`

Subscribes to bond state changes.

```typescript
const sub = manager.onBondStateChange(event => {
  console.log('Device', event.deviceId, 'bond state:', event.bondState);
});
```

**Platform notes:** Android only. `bondState` is one of `'none'`, `'bonding'`, `'bonded'`.

---

### `onConnectionEvent(callback): Subscription`

Subscribes to connection events.

```typescript
const sub = manager.onConnectionEvent(event => {
  console.log('Device', event.deviceId, 'connection:', event.connectionState);
});
```

**Platform notes:** iOS 13+.

---

## Cancellation

### `cancelTransaction(transactionId): Promise<void>`

Cancels a pending BLE operation by transaction ID.

```typescript
await manager.cancelTransaction('my-read-tx');
```

Any operation that accepts an optional `transactionId` parameter can be cancelled this way. If the operation has already completed, this is a no-op.

---

## Error Codes

All errors thrown by the library are instances of `BleError` with a `code` property from `BleErrorCode`:

| Code | Name | Value | Description |
|------|------|-------|-------------|
| Connection | `DeviceNotFound` | `0` | Device not found or out of range |
| | `DeviceDisconnected` | `1` | Device disconnected unexpectedly |
| | `ConnectionFailed` | `2` | Connection attempt failed |
| | `ConnectionTimeout` | `3` | Connection timed out |
| Operations | `OperationCancelled` | `100` | Operation cancelled via `cancelTransaction` |
| | `OperationTimeout` | `101` | Operation timed out |
| | `OperationNotSupported` | `102` | Operation not supported on this platform |
| | `OperationInProgress` | `103` | Another operation is already in progress |
| GATT | `CharacteristicNotFound` | `200` | Characteristic UUID not found |
| | `ServiceNotFound` | `201` | Service UUID not found |
| | `DescriptorNotFound` | `202` | Descriptor not found |
| | `CharacteristicWriteFailed` | `203` | Write operation failed |
| | `CharacteristicReadFailed` | `204` | Read operation failed |
| | `MTUNegotiationFailed` | `205` | MTU negotiation failed |
| Permissions | `BluetoothUnauthorized` | `300` | Bluetooth not authorized |
| | `BluetoothPoweredOff` | `301` | Bluetooth is powered off |
| | `LocationPermissionDenied` | `302` | Location permission denied |
| | `ScanPermissionDenied` | `303` | Scan permission denied |
| | `ConnectPermissionDenied` | `304` | Connect permission denied |
| Manager | `ManagerNotInitialized` | `400` | `createClient()` not called |
| | `ManagerDestroyed` | `401` | `destroyClient()` already called |
| Bonding | `BondingFailed` | `500` | Bonding/pairing failed |
| | `BondLost` | `501` | Bond information lost |
| | `PairingRejected` | `502` | Pairing rejected by user or peripheral |
| L2CAP | `L2CAPChannelFailed` | `600` | L2CAP channel open failed |
| | `L2CAPChannelClosed` | `601` | L2CAP channel closed unexpectedly |
| PHY | `PhyNegotiationFailed` | `700` | PHY negotiation failed |
| Scan | `ScanFailed` | `800` | Scan start failed |
| | `ScanThrottled` | `801` | Too many scan starts (Android throttle) |
| Other | `UnknownError` | `999` | Catch-all for unrecognized errors |

### `BleError` Properties

Every `BleError` instance includes:

| Property | Type | Description |
|----------|------|-------------|
| `code` | `BleErrorCode` | Unified error code (see table above) |
| `message` | `string` | Human-readable description |
| `isRetryable` | `boolean` | Whether the operation can be retried |
| `deviceId` | `string \| undefined` | Device that caused the error |
| `serviceUUID` | `string \| undefined` | Relevant service UUID |
| `characteristicUUID` | `string \| undefined` | Relevant characteristic UUID |
| `operation` | `string \| undefined` | Operation that failed (e.g., `'read'`, `'write'`, `'connect'`) |
| `platform` | `'android' \| 'ios'` | Which platform threw the error |
| `nativeDomain` | `string \| undefined` | Native error domain (e.g., `'CBError'`) |
| `nativeCode` | `number \| undefined` | Raw platform error code |
| `gattStatus` | `number \| undefined` | Android GATT status (0=success, 133=common failure) |
| `attErrorCode` | `number \| undefined` | ATT protocol error code |
