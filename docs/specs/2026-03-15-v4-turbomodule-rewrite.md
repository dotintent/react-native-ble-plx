# react-native-ble-plx v4.0 — TurboModule Rewrite Spec

**Date:** 2026-03-15
**Status:** Draft (rev 2 — post Codex review)
**Scope:** Complete native rewrite as TurboModule with modern BLE features, testing, and all audit fixes

---

## 1. Overview

Rewrite react-native-ble-plx as a React Native TurboModule with two independent native implementations:
- **Android:** Kotlin + Nordic Android-BLE-Library + Scanner Compat Library
- **iOS:** Swift + direct CoreBluetooth with async/await actor-based operation queue

This addresses all 25 issues from the code audit, adds modern BLE 5.0 features, New Architecture support, and comprehensive automated testing.

### Goals

- Zero audit issues remaining
- TurboModule (New Architecture) from day one — no Bridge fallback needed
- Modern BLE features: PHY selection, L2CAP, extended advertising, connection events
- Thread-safe by design on both platforms
- Comprehensive testing: unit (CI), simulated integration (CI), hardware integration (pre-release)
- Backward-compatible JS API where possible (smooth upgrade path from v3.x)

### Non-Goals

- Peripheral/server role (central-only, same as v3)
- Web/desktop platform support
- LE Audio / LC3 codec support
- Companion Device Manager (optional future enhancement)

### Support Floor

- **React Native 0.82+** (legacy architecture removed in 0.82)
- **iOS 14+** (async/await requires iOS 13, but CB authorization APIs need 14+)
- **Android API 26+** (Android 8.0 — minimum for Nordic BLE Library 2.x)

### Background BLE

Background BLE with state restoration is **supported** (not dropped — it's a v3 feature users depend on). The broken state restoration race (audit #11) is fixed, not removed. iOS background modes are opt-in via Expo plugin config, same as v3.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────┐
│  TypeScript API (BleManager, Device, etc.)       │
│  TurboModule Codegen Spec                        │
├─────────────────────────────────────────────────┤
│  JS Event Bridge (backpressure + batching)       │
├──────────────────────┬──────────────────────────┤
│  Android TurboModule │  iOS TurboModule          │
│  Kotlin              │  Swift                    │
├──────────────────────┼──────────────────────────┤
│  Nordic BLE Library  │  CoreBluetooth            │
│  + Scanner Compat    │  + async/await actor      │
│  + Coroutines        │  + operation queue        │
├──────────────────────┼──────────────────────────┤
│  BluetoothGatt       │  CBCentralManager         │
│  BluetoothLeScanner  │  CBPeripheral             │
└──────────────────────┴──────────────────────────┘
```

### JS/TS Layer

- **TurboModule Codegen spec** (`NativeBlePlx.ts`) defines the native interface — methods, typed events, and types. This generates native bindings automatically. **NOT** `RCTEventEmitter` — use the [typed native module events](https://reactnative.dev/docs/0.79/the-new-architecture/native-modules-custom-events) pattern from RN 0.79+.
- **TypeScript types** using `as const` objects (not enums) for runtime values
- **Event bridge** with backpressure and per-stream batching rules (see Event Batching section)
- **Deterministic cancellation**: every operation has a timeout; every Promise resolves or rejects, never hangs
- **Cross-platform error model**: rich error type with platform-specific diagnostic fields (see Error Model section)

### Android Native (Kotlin)

- **Nordic Android-BLE-Library v2.11.0** for GATT operations
  - Atomic request queues (operation serialization)
  - MTU/PHY negotiation (handles Android 14 MTU=517 forced behavior)
  - Bonding state management as Kotlin Flow
  - Connection lifecycle with retry
- **Nordic Scanner Compat Library** for scanning
  - Provides consistent scan API across Android versions
  - BLE 5.0 extended advertising scan support
  - **Does NOT handle scan throttling automatically** — we must implement our own debouncing (Android 7+ limits to ~5 `startScan` calls per 30s; exceeding this silently returns zero results)
- **Auto-MTU on connect**: Request MTU 517 during connection setup automatically (the #1 user-reported issue with current ble-plx is silent data truncation from the 23-byte default). **Android 14+ caveat:** The system automatically initiates MTU 517 on first connection. Calling `requestMtu` again can cause disconnects on some peripherals. Implementation must check `Build.VERSION.SDK_INT >= 34` and skip explicit MTU request if the system already negotiated ≥ 517.
- **`neverForLocation` flag**: `BLUETOOTH_SCAN` permission must include `android:usesPermissionFlags="neverForLocation"` in manifest (unless the app derives location from BLE scans). Without this, apps still need Location permissions on Android 12+.
- **Kotlin coroutines** for async operations (natural TurboModule Promise mapping)
- **Thread-safe by design**: Nordic library handles GATT threading; coroutine dispatchers for our code
- **Android 12+ permissions**: proper `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT` runtime checks
- **No `enable()`/`disable()`**: removed — use system settings intent instead

### iOS Native (Swift + ObjC++ adapter)

- **Direct CoreBluetooth** with custom async/await wrapper
- **Swift actor with custom executor** (Swift 5.9+) backed by the same `DispatchQueue` as CoreBluetooth — solves the `CBPeripheral`/`CBCentralManager` non-Sendable problem
- **`@preconcurrency import CoreBluetooth`** to silence Swift 6 Sendable warnings
- **Thin ObjC++ `.mm` entry point** — Codegen generates ObjC headers, pure-Swift TurboModules are not possible. The chain is:

```
JS Spec → Codegen → ObjC++ TurboModule (.mm) → Swift BLEModuleImpl (@objc) → BLEActor → CoreBluetooth
```

- **Never pass CB objects across actor boundaries** — extract Sendable values (UUID, Data, String) first
- **GATT operation queue** as a separate actor — CoreBluetooth does NOT serialize operations; rapid successive reads/writes fail silently
  - `withResponse` writes await completion callback
  - `withoutResponse` writes check `canSendWriteWithoutResponse` + flow control
- **State restoration** via `CBCentralManagerOptionRestoreIdentifierKey` (proper implementation, not the broken `.amb()` race)
- **Modern iOS features**:
  - L2CAP channels (`CBPeripheral.openL2CAPChannel`)
  - Connection events (`centralManager:connectionEventDidOccurForPeripheral:`, iOS 13+)
  - Bluetooth authorization handling (`CBManager.authorization`, iOS 13+)
  - iOS 16+ disconnect with reconnection support
- **No retain cycles**: delegate is `weak`, `invalidate` calls `super`
- **Nil-safe**: all methods guard against nil manager, reject Promise with clear error

---

## 3. JS/TS API Changes

### Breaking changes (v3 → v4)

| Change | Rationale |
|--------|-----------|
| `enable()` / `disable()` removed | Broken on Android 12+, no-op on iOS. Use system settings. |
| `State` etc. changed from enum to const object | Fix TypeScript type mismatch |
| Constructor no longer silently returns singleton | Explicit `BleManager.getInstance()` instead |
| `monitorCharacteristic` subscription `.remove()` now also cleans up JS listener | Fixes #1308, #1299 |

### New APIs

| API | Description |
|-----|-------------|
| `requestPhy(deviceId, txPhy, rxPhy)` | BLE 5.0 PHY selection |
| `readPhy(deviceId)` | Read current PHY |
| `openL2CAPChannel(deviceId, psm)` | iOS L2CAP channel (iOS only) |
| `requestConnectionPriority(deviceId, priority)` | Android: coarse priority (balanced/high/lowPower). iOS: no-op. Fine-grained params are peripheral-firmware-only. |
| `getAuthorizationStatus()` | iOS Bluetooth authorization state |
| `onConnectionEvent(listener)` | iOS 13+ connection events |

### Event batching

High-frequency characteristic notifications need backpressure to prevent JS thread overwhelm.

**Rules:**
- **Scan results**: batched, delivered every 100ms (scans are inherently bursty)
- **Characteristic notifications**: per-stream batching, configurable interval (default 0ms = no batching, immediate delivery)
- **Timing-sensitive notifications** (e.g., indicate with ATT ACK): never batched, always immediate
- **Connection state changes**: never batched, always immediate
- **Max batch size**: 50 events per delivery (prevents single huge payload)
- **Ordering**: monotonic per-stream, cross-stream ordering not guaranteed
- **Bypass**: `monitorCharacteristic(..., { batchInterval: 0 })` disables batching for that stream

Configurable via `BleManager` constructor option `scanBatchIntervalMs` (default 100) and per-characteristic `batchInterval` option.

---

## 4. Error Model

Unified error codes across platforms:

```typescript
export const BleErrorCode = {
  // Connection
  DeviceNotFound: 0,
  DeviceDisconnected: 1,
  ConnectionFailed: 2,
  ConnectionTimeout: 3,

  // Operations
  OperationCancelled: 100,
  OperationTimeout: 101,
  OperationNotSupported: 102,
  OperationInProgress: 103,

  // GATT
  CharacteristicNotFound: 200,
  ServiceNotFound: 201,
  DescriptorNotFound: 202,
  CharacteristicWriteFailed: 203,
  CharacteristicReadFailed: 204,
  MTUNegotiationFailed: 205,

  // Permissions
  BluetoothUnauthorized: 300,
  BluetoothPoweredOff: 301,
  LocationPermissionDenied: 302,
  ScanPermissionDenied: 303,
  ConnectPermissionDenied: 304,

  // Platform
  ManagerNotInitialized: 400,
  ManagerDestroyed: 401,

  // Bonding/Pairing
  BondingFailed: 500,
  BondLost: 501,
  PairingRejected: 502,

  // L2CAP
  L2CAPChannelFailed: 600,
  L2CAPChannelClosed: 601,

  // PHY
  PhyNegotiationFailed: 700,

  // Scan
  ScanFailed: 800,              // nativeCode = Android ScanCallback.SCAN_FAILED_* (1-6)
  ScanThrottled: 801,

  UnknownError: 999,
} as const;
```

Each error includes:

```typescript
interface BleError {
  code: number;              // Unified BleErrorCode
  message: string;           // Human-readable
  isRetryable: boolean;      // Hint for caller

  // Context
  deviceId?: string;
  serviceUUID?: string;
  characteristicUUID?: string;
  operation?: string;        // e.g., 'read', 'write', 'connect', 'scan'

  // Platform diagnostics
  platform: 'android' | 'ios';
  nativeDomain?: string;     // e.g., 'CBError', 'android.bluetooth'
  nativeCode?: number;       // Raw platform error code
  gattStatus?: number;       // Android GATT status (0=success, 133=common failure)
  attErrorCode?: number;     // ATT protocol error
  scanErrorCode?: number;    // Android ScanCallback error (1-6)
  cbErrorCode?: number;      // iOS CBError code
}
```

---

## 5. Connection State Machine

```
                    ┌──────────────┐
         scan found │  Discovered  │
                    └──────┬───────┘
                           │ connectToDevice()
                           ▼
                    ┌──────────────┐
                    │  Connecting  │──── timeout/error ────┐
                    └──────┬───────┘                       │
                           │ GATT connected                │
                           ▼                               │
                    ┌──────────────┐                       │
                    │  Connected   │──── GATT error ──────┤
                    └──────┬───────┘                       │
                           │ cancelDeviceConnection()      │
                           ▼                               │
                    ┌───────────────┐                      │
                    │ Disconnecting │                      │
                    └──────┬────────┘                      │
                           │                               │
                           ▼                               ▼
                    ┌──────────────┐
                    │ Disconnected │
                    └──────────────┘
```

**Retry policy:** Configurable via `connectToDevice(deviceId, { retries: 3, retryDelay: 1000 })`.
- `retries`: max connection attempts (default 1 = no retry)
- `retryDelay`: ms between attempts (default 1000)
- Retryable errors: GATT 133, connection timeout. Non-retryable: permission denied, device not found, user cancelled.
- `isRetryable` field in `BleError` tells the caller whether automatic retry was applicable.

**State transitions are emitted as events** via the Codegen typed event emitter, not polled.

---

## 5a. Codegen Spec (`NativeBlePlx.ts`)

The Codegen spec is the contract between JS and native. File MUST be named `NativeBlePlx.ts` (prefix `Native` required by Codegen). All types MUST be defined inline (no imports from other files). Uses `CodegenTypes.EventEmitter<T>` for streaming data (callbacks are single-fire in Codegen).

**`codegenConfig` in package.json:**
```json
{
  "codegenConfig": {
    "name": "NativeBlePlxSpec",
    "type": "modules",
    "jsSrcsDir": "src/specs",
    "android": { "javaPackageName": "com.bleplx" }
  }
}
```

**Spec file (`src/specs/NativeBlePlx.ts`):**

```typescript
import type { TurboModule, CodegenTypes } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

// All types must be inline — Codegen ignores imports from other files
// Union types NOT supported — use string with runtime validation

export type DeviceInfo = Readonly<{
  id: string;              // Android: MAC address, iOS: opaque UUID
  name: string | null;
  rssi: number;
  mtu: number;
  isConnectable: boolean | null;
  serviceUuids: ReadonlyArray<string>;
  manufacturerData: string | null; // Base64-encoded
}>;

export type CharacteristicInfo = Readonly<{
  deviceId: string;
  serviceUuid: string;
  uuid: string;
  value: string | null;    // Base64-encoded
  isNotifying: boolean;
  isIndicatable: boolean;
  isReadable: boolean;
  isWritableWithResponse: boolean;
  isWritableWithoutResponse: boolean;
}>;

export type ScanResult = Readonly<{
  id: string;
  name: string | null;
  rssi: number;
  serviceUuids: ReadonlyArray<string>;
  manufacturerData: string | null;
}>;

export type ConnectionStateEvent = Readonly<{
  deviceId: string;
  state: string;           // 'connecting' | 'connected' | 'disconnecting' | 'disconnected'
  errorCode: number | null;
  errorMessage: string | null;
}>;

export type CharacteristicValueEvent = Readonly<{
  deviceId: string;
  serviceUuid: string;
  characteristicUuid: string;
  value: string;           // Base64-encoded
  transactionId: string | null;
}>;

export type StateChangeEvent = Readonly<{
  state: string;           // 'Unknown' | 'Resetting' | 'Unsupported' | 'Unauthorized' | 'PoweredOff' | 'PoweredOn'
}>;

export type RestoreStateEvent = Readonly<{
  devices: ReadonlyArray<DeviceInfo>;
}>;

export type BleErrorInfo = Readonly<{
  code: number;
  message: string;
  isRetryable: boolean;
  deviceId: string | null;
  serviceUuid: string | null;
  characteristicUuid: string | null;
  operation: string | null;
  platform: string;
  nativeDomain: string | null;
  nativeCode: number | null;
  gattStatus: number | null;
  attErrorCode: number | null;
}>;

export interface Spec extends TurboModule {
  // Lifecycle
  createClient(restoreStateIdentifier: string | null): Promise<void>;
  destroyClient(): Promise<void>;

  // State
  state(): Promise<string>;

  // Scanning (scan throttle debouncing built-in)
  startDeviceScan(uuids: ReadonlyArray<string> | null, options: Readonly<{
    scanMode?: number;           // Android: 0=opportunistic, 1=lowPower, 2=balanced, -1=lowLatency
    callbackType?: number;       // Android: 1=allMatches, 2=firstMatch, 4=matchLost
    legacyScan?: boolean;        // false = BLE 5.0 extended advertising
    allowDuplicates?: boolean;   // iOS only
  }> | null): void;
  stopDeviceScan(): Promise<void>;

  // Connection (auto-MTU 517 on Android)
  connectToDevice(deviceId: string, options: Readonly<{
    autoConnect?: boolean;       // Android: true=background, false=direct (default)
    timeout?: number;            // Connection timeout in ms
    retries?: number;            // Number of retry attempts (default 1)
    retryDelay?: number;         // Ms between retries (default 1000)
    requestMtu?: number;         // Auto-request MTU after connect (default 517 on Android, ignored on iOS)
  }> | null): Promise<DeviceInfo>;
  cancelDeviceConnection(deviceId: string): Promise<DeviceInfo>;
  isDeviceConnected(deviceId: string): Promise<boolean>;

  // Discovery
  discoverAllServicesAndCharacteristics(deviceId: string, transactionId: string | null): Promise<DeviceInfo>;

  // Read/Write
  readCharacteristic(deviceId: string, serviceUuid: string, characteristicUuid: string, transactionId: string | null): Promise<CharacteristicInfo>;
  writeCharacteristic(deviceId: string, serviceUuid: string, characteristicUuid: string, value: string, withResponse: boolean, transactionId: string | null): Promise<CharacteristicInfo>;

  // Monitor (use EventEmitter, not callback — callbacks are single-fire)
  // subscriptionType: 'indicate' | 'notify' | null (null = auto-detect from characteristic
  // properties, preferring notifications when both are available)
  monitorCharacteristic(deviceId: string, serviceUuid: string, characteristicUuid: string, subscriptionType: string | null, transactionId: string | null): void;

  // MTU
  getMtu(deviceId: string): Promise<number>;
  requestMtu(deviceId: string, mtu: number, transactionId: string | null): Promise<DeviceInfo>;

  // PHY (Android only — iOS returns current PHY info but cannot set)
  requestPhy(deviceId: string, txPhy: number, rxPhy: number): Promise<DeviceInfo>;
  readPhy(deviceId: string): Promise<DeviceInfo>;

  // Connection Priority (Android only — coarse: 0=balanced, 1=high, 2=lowPower)
  // NOTE: Fine-grained interval/latency/timeout is NOT settable from app-level APIs.
  // Only the peripheral firmware can request specific connection parameters.
  requestConnectionPriority(deviceId: string, priority: number): Promise<DeviceInfo>;

  // L2CAP (iOS only — PSM must be dynamic, read from GATT characteristic)
  openL2CAPChannel(deviceId: string, psm: number): Promise<Readonly<{ channelId: number }>>;
  writeL2CAPChannel(channelId: number, data: string): Promise<void>;
  closeL2CAPChannel(channelId: number): Promise<void>;

  // Bonding (Android: system bonded devices. iOS: not available — returns empty array)
  getBondedDevices(): Promise<ReadonlyArray<DeviceInfo>>;

  // Authorization (iOS only — Android returns 'Authorized' always)
  getAuthorizationStatus(): Promise<string>;

  // Cancellation
  cancelTransaction(transactionId: string): Promise<void>;

  // ─── Typed Event Emitters (CodegenTypes.EventEmitter) ───
  readonly onScanResult: CodegenTypes.EventEmitter<ScanResult>;
  readonly onConnectionStateChange: CodegenTypes.EventEmitter<ConnectionStateEvent>;
  readonly onCharacteristicValueUpdate: CodegenTypes.EventEmitter<CharacteristicValueEvent>;
  readonly onStateChange: CodegenTypes.EventEmitter<StateChangeEvent>;
  readonly onRestoreState: CodegenTypes.EventEmitter<RestoreStateEvent>;
  readonly onError: CodegenTypes.EventEmitter<BleErrorInfo>;
  readonly onBondStateChange: CodegenTypes.EventEmitter<Readonly<{ deviceId: string; bondState: string }>>;  // bondState: 'none' | 'bonding' | 'bonded'
  readonly onConnectionEvent: CodegenTypes.EventEmitter<Readonly<{ deviceId: string; event: string }>>;  // iOS 13+ connection events
  readonly onL2CAPData: CodegenTypes.EventEmitter<Readonly<{ channelId: number; data: string }>>;        // L2CAP incoming data
  readonly onL2CAPClose: CodegenTypes.EventEmitter<Readonly<{ channelId: number; error: string | null }>>;
}

export default TurboModuleRegistry.get<Spec>('NativeBlePlx');
```

**Key design decisions from research:**
- `TurboModuleRegistry.get` (nullable) for graceful degradation, not `getEnforcing`
- All types inline — Codegen ignores imports
- No union types — use string with runtime validation for enum-like values
- Events as `readonly` `CodegenTypes.EventEmitter<T>` properties — not callbacks (single-fire only)
- `Object` replaced with typed `Readonly<{...}>` throughout — `Object` is an escape hatch
- `requestConnectionParameters` replaced with `requestConnectionPriority` (coarse, Android-only) — fine-grained params are peripheral-firmware-only
- L2CAP expanded to stream lifecycle: open/write/close (not just open)
- `optionsJson` as string for complex options (avoids Codegen type limitations)

**Device identifier note:** Android uses MAC addresses (`AA:BB:CC:DD:EE:FF`), iOS uses opaque per-phone UUIDs (not per-app). The UUID can change after Bluetooth settings reset. There is NO cross-platform stable identifier — embed unique IDs in GATT characteristics or manufacturer advertising data if needed.

---

## 5b. Background BLE — Platform-Specific Requirements

**iOS:**
- Requires `UIBackgroundModes` with `bluetooth-central` in Info.plist
- Background scanning MUST specify service UUID filters — passing `nil` returns zero results in background
- `CBCentralManagerScanOptionAllowDuplicatesKey` is ignored in background
- Scan intervals increase significantly in background
- State restoration requires `CBCentralManagerOptionRestoreIdentifierKey`
- Only GATT characteristic notifications wake suspended apps — L2CAP does NOT

**Android:**
- Background BLE connections require a foreground service with `android:foregroundServiceType="connectedDevice"` (Android 12+ restricts starting foreground services from background)
- Background scanning options: foreground service (most reliable), `PendingIntent`-based scanning (system-managed), or `CompanionDeviceManager` (Android 12+, limited)
- Android 14+ foreground service type declaration required in manifest

**Both platforms:** Background BLE is opt-in via Expo config plugin. The library documents requirements but does not automatically configure background mode.

## 5c. Bonding and Encryption Contract

On Android, `getBondState()` only checks whether bond info exists — it does NOT verify the link is actually encrypted. An attacker can spoof MAC addresses and connect unencrypted. Use Nordic's `ensureBond()` after connection to verify actual link encryption, or read a protected characteristic to trigger automatic pairing.

On iOS, the system handles bonding transparently when the peripheral requires encryption. `setNotifyValue` on an encrypted characteristic triggers pairing automatically. There is no explicit `ensureBond()` equivalent.

`getBondedDevices()` is Android-only. iOS has no equivalent of `BluetoothAdapter.getBondedDevices()` — returns empty array on iOS.

---

## 6. Android Implementation Details

### Dependencies

```kotlin
dependencies {
    implementation("no.nordicsemi.android:ble:2.11.0")
    implementation("no.nordicsemi.android:ble-ktx:2.11.0")  // Kotlin extensions
    implementation("no.nordicsemi.android.support.v18:scanner:1.6.0")  // Scanner Compat
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.0")
}
```

### Key architecture

```kotlin
// TurboModule entry point
class BlePlxModule(reactContext: ReactApplicationContext) : BlePlxSpec(reactContext) {
    private val scanner = BluetoothLeScannerCompat.getScanner()
    private val connections = ConcurrentHashMap<String, BleManagerWrapper>()
    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())

    override fun startDeviceScan(uuids: ReadableArray?, options: ReadableMap?, promise: Promise) {
        scope.launch {
            // Nordic Scanner Compat handles throttling
        }
    }

    override fun connectToDevice(deviceId: String, options: ReadableMap?, promise: Promise) {
        scope.launch {
            val manager = BleManagerWrapper(reactApplicationContext)
            connections[deviceId] = manager
            manager.connect(deviceId, options)
            promise.resolve(manager.toJS())
        }
    }
}

// Per-device GATT manager using Nordic BLE Library
class BleManagerWrapper(context: Context) : BleManager(context) {
    // Nordic handles operation queue, MTU, PHY, bonding
    // All callbacks are coroutine-safe via ktx extensions
}
```

### Permission handling

```kotlin
// Runtime permission checks before every BLE operation
private fun requireScanPermission() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_SCAN)
            != PackageManager.PERMISSION_GRANTED) {
            throw BleError(BleErrorCode.ScanPermissionDenied)
        }
    }
}
```

### Android 14 MTU handling

Nordic BLE Library handles the forced MTU=517 behavior. We document it and expose the actual negotiated MTU to JS.

---

## 6. iOS Implementation Details

### Architecture

```swift
// ObjC++ entry point (.mm file) — generated by Codegen, delegates to Swift
// BlePlx.mm conforms to NativeBlePlxSpec and calls into BLEModuleImpl

// Swift implementation — exposed via @objc
@objc public class BLEModuleImpl: NSObject {
    private var bleActor: BLEActor?

    @objc public func createClient(_ restoreId: String?) async throws {
        bleActor?.invalidate()
        bleActor = BLEActor(restoreId: restoreId)
    }
}

// BLE actor with custom executor on CoreBluetooth's queue
@preconcurrency import CoreBluetooth

actor BLEActor {
    let queue = DispatchQueue(label: "com.bleplx.ble")

    // Custom executor: actor runs on same queue as CoreBluetooth
    nonisolated var unownedExecutor: UnownedSerialExecutor {
        queue.asUnownedSerialExecutor()
    }

    private lazy var centralManager = CBCentralManager(
        delegate: delegateHandler, queue: queue
    )
    private let delegateHandler = CentralManagerDelegate()
    private var peripherals: [UUID: PeripheralWrapper] = [:]

    func scan(serviceUUIDs: [CBUUID]?, options: [String: Any]?) -> AsyncStream<ScanResult> { ... }
    func connect(peripheralId: UUID, options: ConnectionOptions) async throws -> PeripheralWrapper { ... }
    func disconnect(peripheralId: UUID) async throws { ... }
}

// Per-peripheral GATT operation queue (also an actor on the BLE queue)
actor PeripheralWrapper {
    private let peripheral: CBPeripheral  // Safe: same queue as actor executor
    private let delegateHandler: PeripheralDelegate
    private let operationQueue = GATTOperationQueue()

    func discoverServices(_ uuids: [CBUUID]?) async throws -> [CBService] { ... }

    func readCharacteristic(_ characteristic: CBCharacteristic) async throws -> Data {
        // Queued: only one outstanding GATT operation at a time
        return try await operationQueue.enqueue {
            self.peripheral.readValue(for: characteristic)
        }
    }

    func writeCharacteristic(_ characteristic: CBCharacteristic, data: Data, type: CBCharacteristicWriteType) async throws {
        if type == .withoutResponse {
            // Flow control: check canSendWriteWithoutResponse first
            while !peripheral.canSendWriteWithoutResponse {
                try await delegateHandler.waitForWriteReady()
            }
        }
        try await operationQueue.enqueue {
            self.peripheral.writeValue(data, for: characteristic, type: type)
        }
    }

    // L2CAP — dynamic PSM only (no static PSMs on iOS)
    // Must retain channel + peripheral strongly; schedule on correct RunLoop
    // L2CAP does NOT wake suspended apps — only GATT notifications do
    func openL2CAPChannel(psm: CBL2CAPPSM) async throws -> L2CAPChannelWrapper { ... }
}
```

### Delegate-to-async bridging

```swift
// Using CheckedContinuation for one-shot operations
func readCharacteristic(_ characteristic: CBCharacteristic) async throws -> Data {
    return try await withCheckedThrowingContinuation { continuation in
        pendingReads[characteristic.uuid] = continuation
        peripheral.readValue(for: characteristic)
    }
}

// Using AsyncStream for ongoing notifications
func monitorCharacteristic(_ characteristic: CBCharacteristic) -> AsyncStream<Data> {
    AsyncStream { continuation in
        notificationStreams[characteristic.uuid] = continuation
        peripheral.setNotifyValue(true, for: characteristic)
        continuation.onTermination = { _ in
            self.peripheral.setNotifyValue(false, for: characteristic)
        }
    }
}
```

### State restoration

```swift
// BOOTSTRAP TIMING: On background relaunch triggered by Bluetooth state restoration,
// the native .mm module (or Expo plugin AppDelegate extension) must eagerly instantiate
// CBCentralManager with the restore identifier during application(_:willFinishLaunchingWithOptions:)
// — BEFORE the JS bridge is ready. Buffer the willRestoreState payload until JS calls
// createClient() and subscribes to onRestoreState.
//
// IMPORTANT: willRestoreState fires BEFORE centralManagerDidUpdateState.
// Do NOT assume Bluetooth state is ready here. Only re-attach delegates and store peripheral refs.
// State restoration only works for system-terminated apps — force-quit by user disables it.
func centralManager(_ central: CBCentralManager, willRestoreState dict: [String: Any]) {
    if let peripherals = dict[CBCentralManagerRestoredStatePeripheralsKey] as? [CBPeripheral] {
        for peripheral in peripherals {
            let wrapper = PeripheralWrapper(peripheral: peripheral)
            self.peripherals[peripheral.identifier] = wrapper
        }
    }
    // Correctly read scan options (fix copy-paste bug from v3)
    if let scanOptions = dict[CBCentralManagerRestoredStateScanOptionsKey] as? [String: Any] {
        // Handle restored scan state
    }
}
```

---

## 7. Testing Strategy

### Unit tests (CI — runs on every PR)

| Layer | Framework | Coverage |
|-------|-----------|----------|
| JS/TS | Jest | Protocol parsing, state management, event batching, error mapping |
| Android | JUnit + MockK | Permission checks, error conversion, event serialization, Nordic integration mocks |
| iOS | XCTest | Actor operation queue, delegate-to-async bridging, error conversion, state restoration |

### Simulated integration tests (CI)

Mock GATT peripherals that exercise the full protocol stack without real Bluetooth hardware:

**Android:** Create a custom `MockBleManager` extending Nordic's `BleManager` with a mock GATT layer (Nordic Android-BLE-Library 2.x does not include mock utilities — those are in the newer Kotlin-BLE-Library which isn't production-ready). Alternatively, use Robolectric shadows for `BluetoothGatt`. Test:
- Full connect → discover → read → write → notify → disconnect cycle
- Indicate-based streaming (Smart Cap Rx protocol)
- Watermark ACK flow
- MTU negotiation
- Connection parameter changes
- Error scenarios (disconnect mid-transfer, timeout, permission denied)
- Permission revoke mid-scan
- Bluetooth off mid-operation
- Bond failure during pairing
- State restoration after app kill (iOS)
- Event batch ordering under high notification load

**iOS:** Use `CBMCentralManagerMock` from Nordic's [CoreBluetoothMock](https://github.com/NordicSemiconductor/IOS-CoreBluetooth-Mock) library. Same test scenarios as Android.

**JS:** Mock the TurboModule native interface and test the full JS flow:
- Scan → connect → sync → disconnect lifecycle
- Event batching under high notification frequency
- Cancellation and timeout behavior
- Error propagation

### Hardware integration tests (pre-release)

Dual-device test framework:
- **Peripheral device:** nRF52840 DK (or XIAO) running a test firmware that exposes known GATT services
- **Central device:** Phone running the test app
- **Test runner:** Maestro or Detox controlling the phone, serial commands to the peripheral
- **Test cases:** Real BLE pairing, MTU negotiation, PHY selection, indicate streaming, disconnect recovery

Smart Cap Rx protocol as the primary integration test:
- Time Sync write
- Event stream indicate transfer
- Watermark ACK
- Factory reset double-write

---

## 8. Smart Cap Rx Specific Features

Features our app needs that must work correctly:

| Feature | Status in v3 | v4 |
|---------|-------------|-----|
| Indicate (not Notify) | Untested but code path exists | First-class support, integration tested |
| Write With Response | Works but no ATT confirmation exposed | Promise resolves on ATT ACK |
| Bonded LESC Just Works | Untested | Tested with nRF52840 |
| Connection parameters | Android: 1ms delay (broken), iOS: no-op | Both platforms: proper negotiation |
| MTU negotiation | Works but iOS hardcodes 23 for scanned | Correct on both platforms |
| Event batching | Not handled — notification storms crash JS | Configurable batching |
| Reliable disconnect detection | Android: null error always | Proper GATT error propagation |

---

## 9. Migration Guide (v3 → v4)

### Package changes

```diff
- "react-native-ble-plx": "^3.5.1"
+ "react-native-ble-plx": "^4.0.0"
```

Requires React Native 0.82+ (legacy architecture removed in 0.82).

### API changes

```typescript
// v3: enum (incorrect TypeScript)
import { State } from 'react-native-ble-plx';
if (state === State.PoweredOn) { ... }

// v4: const object (correct)
import { State } from 'react-native-ble-plx';
if (state === State.PoweredOn) { ... }  // Same usage, correct types
```

```typescript
// v3: enable() — broken on Android 12+
await manager.enable();

// v4: removed — use system settings
import { Linking } from 'react-native';
Linking.openSettings();
```

```typescript
// v3: monitor subscription cleanup broken
const sub = manager.monitorCharacteristicForDevice(...);
sub.remove();  // BUG: doesn't clean up JS listener

// v4: fixed
const sub = manager.monitorCharacteristicForDevice(...);
sub.remove();  // Properly cleans up native + JS listeners
```

### New features

```typescript
// PHY selection (Android only)
await manager.requestPhy(deviceId, PhyType.LE_2M, PhyType.LE_2M);

// Connection priority (Android only — coarse levels, not fine-grained params)
// Fine-grained interval/latency/timeout can only be set by peripheral firmware
await manager.requestConnectionPriority(deviceId, ConnectionPriority.HIGH);

// L2CAP (iOS only)
const channel = await manager.openL2CAPChannel(deviceId, 0x0080);
```

---

## 10. File Structure

```
react-native-ble-plx/
├── src/                          ← TypeScript API + TurboModule spec
│   ├── NativeBlePlx.ts        ← Codegen spec
│   ├── BleManager.ts             ← Main API class
│   ├── Device.ts
│   ├── Characteristic.ts
│   ├── Service.ts
│   ├── Descriptor.ts
│   ├── BleError.ts               ← Unified error model
│   ├── types.ts                  ← All TypeScript types (const objects)
│   └── EventBatcher.ts           ← JS-side notification batching
├── android/
│   └── src/main/kotlin/com/bleplx/
│       ├── BlePlxModule.kt       ← TurboModule entry point
│       ├── BleManagerWrapper.kt  ← Per-device Nordic BLE Manager
│       ├── ScanManager.kt        ← Nordic Scanner Compat wrapper
│       ├── PermissionHelper.kt   ← Runtime permission checks
│       ├── EventSerializer.kt    ← Native → JS event conversion
│       └── ErrorConverter.kt     ← GATT error → unified error code
├── ios/
│   ├── BlePlx.mm                 ← ObjC++ TurboModule entry (Codegen-generated base class)
│   ├── BLEModuleImpl.swift       ← Swift @objc implementation (delegates to actor)
│   ├── BleActor.swift            ← Central manager actor
│   ├── PeripheralWrapper.swift   ← Per-peripheral operation queue actor
│   ├── ScanManager.swift         ← Scan with AsyncStream
│   ├── EventSerializer.swift     ← Native → JS event conversion
│   ├── ErrorConverter.swift      ← CB error → unified error code
│   └── StateRestoration.swift    ← Background restoration handler
├── __tests__/                    ← JS unit tests
├── android/src/test/             ← Android unit tests
├── ios/Tests/                    ← iOS unit tests
├── integration-tests/
│   ├── simulated/                ← Mock GATT peripheral tests (CI)
│   └── hardware/                 ← Dual-device test framework (pre-release)
└── plugin/                       ← Expo config plugin (updated)
```

---

## 11. Resolved Audit Issues

All 25 issues from AUDIT.md are resolved by the rewrite:

| # | Issue | Resolution |
|---|-------|-----------|
| 1-2 | Thread-unsafe shared state (iOS+Android) | Swift actors (iOS), ConcurrentHashMap + coroutines (Android) |
| 3 | Monitor subscription cleanup (JS) | Subscription `.remove()` cleans up both native + JS |
| 4 | `enable()` broken Android 12+ | Removed. Use system settings. |
| 5 | Empty AndroidManifestNew.xml | Proper manifest for namespace mode |
| 6 | Scan listener leak (JS) | Stop previous scan before starting new |
| 7 | Disconnection monitor leak (iOS) | Actor tracks all subscriptions |
| 8 | `getState()` permission crash (Android) | Runtime permission check |
| 9 | Hardcoded MTU 23 (iOS) | Report actual `maximumWriteValueLength` |
| 10 | `requestConnectionPriority` no-op (iOS) | Documented as Android-only, iOS returns error |
| 11 | State restoration race (iOS) | Proper async handling, no `.amb()` |
| 12 | Never-settled promises (JS) | Every operation has timeout, always resolves/rejects |
| 13 | Silent reconnect on connect (Android) | Configurable behavior, not silent |
| 14 | Wrong TypeScript types | Const objects with `as const`, all types correct |
| 15 | `disable()` crash Android 13+ | Removed |
| 16 | JSON error no escaping (iOS) | Proper Codable serialization |
| 17 | Static IdGenerator (Android) | Per-instance IDs |
| 18 | Global RxJavaPlugins (Android) | No RxJava |
| 19 | Promise double-resolution (iOS) | Actor isolation prevents races |
| 20 | `RestoredState` wrong key (iOS) | Fixed: `CBCentralManagerRestoredStateScanOptionsKey` |
| 21 | Disconnect null error (Android) | Propagate GATT error code |
| 22 | Strong delegate retain cycle (iOS) | Weak delegate |
| 23 | `createClient` re-entry (iOS) | Invalidate previous before creating new |
| 24 | Nil manager hangs promises (iOS) | Guard + reject with `ManagerNotInitialized` |
| 25 | `invalidate` no super (iOS) | Calls `super.invalidate()` |
