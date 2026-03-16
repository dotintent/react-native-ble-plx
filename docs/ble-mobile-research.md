# Rewriting react-native-ble-plx as a TurboModule: the definitive guide

**A TurboModule rewrite of react-native-ble-plx using Nordic's Android-BLE-Library (Kotlin) and CoreBluetooth (Swift) is both feasible and urgently needed**, since the current v3.5.1 crashes under React Native's New Architecture (enabled by default since RN 0.76). This guide covers every critical pitfall, from Codegen's type system limitations to CoreBluetooth's non-Sendable objects to Android's scan throttling — distilled into actionable patterns for implementation. The existing library's bridge-based architecture, Base64 serialization overhead, and missing features (L2CAP, BLE 5.0 PHY, GATT server role) make a clean TurboModule rewrite the right path forward rather than incremental migration.

---

## TurboModule Codegen: what works and what will bite you

The Codegen spec file (`NativeBlePlx.ts`) must follow strict naming conventions: the file must be prefixed with `Native`, the interface must be named exactly `Spec` extending `TurboModule`, and it must export via `TurboModuleRegistry`. Breaking any of these rules causes silent failures or parser errors.

**Supported types** include `string`, `number`, `boolean`, `Float`, `Double`, `Int32`, `Promise<T>`, `Readonly<{...}>` for typed objects, `ReadonlyArray<T>`, nullable types via `| null`, optional object fields via `?`, and single-fire callbacks. For untyped escape hatches, `UnsafeObject` maps to `NSDictionary`/`ReadableMap`.

**Critical limitations that directly impact a BLE library design:**

- **Union types are not supported.** You cannot define `type WriteType = 'withResponse' | 'withoutResponse'` as a parameter type — the codegen parser rejects `TSUnionType`. Use string parameters with runtime validation instead, or use enum syntax for numeric enums.
- **All types must be defined inline in the spec file.** Importing types from other files is completely ignored by Codegen. Every `Readonly<{...}>` type alias must live in `NativeBlePlx.ts` itself. The React Native team acknowledges this is "not optimal" but fixing it would be a "big breaking change" — still unresolved as of June 2025.
- **`Map<K,V>` is not supported.** Use `Readonly<{[key: string]: V}>` for string-keyed dictionaries.
- **Generics, tuples, and multiple interface inheritance are not supported.**
- **Platform-specific spec files (`.ios.ts`/`.android.ts`) are ignored.** Use a single spec with no-op methods on each platform.
- **Callbacks are single-fire.** You cannot hold a callback reference and invoke it repeatedly from native. For BLE scan results and characteristic notifications, use `EventEmitter` instead.

**Event emitters** use the new `CodegenTypes.EventEmitter<T>` pattern (RN 0.76+), which is type-safe and generates platform-specific emit methods. Define events as `readonly` properties on the spec:

```typescript
import type { TurboModule, CodegenTypes } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type ScanResult = Readonly<{
  id: string;
  name: string | null;
  rssi: number;
  serviceUuids: ReadonlyArray<string>;
  manufacturerData: string | null; // Base64-encoded
}>;

export interface Spec extends TurboModule {
  startScan(serviceUuids: string[], options: string): void;
  stopScan(): Promise<void>;
  connect(deviceId: string, options: string): Promise<void>;
  readonly onScanResult: CodegenTypes.EventEmitter<ScanResult>;
  readonly onDisconnection: CodegenTypes.EventEmitter<Readonly<{ deviceId: string; error: string | null }>>;
}

export default TurboModuleRegistry.get<Spec>('NativeBlePlx');
```

On the native side, Codegen generates `emitOnScanResult` / `emitOnDisconnection` methods on the base class. JS subscribes via `NativeBlePlx?.onScanResult((result) => {...})` — no more `NativeEventEmitter` boilerplate. **Import path gotcha**: use `CodegenTypes.EventEmitter<T>` via `import type { CodegenTypes } from 'react-native'` rather than deep imports, which break on some RN 0.76.x versions.

Use `TurboModuleRegistry.get` (nullable) rather than `getEnforcing` for graceful degradation. Make new methods optional (`method?: () => void`) for forward compatibility with older native binaries.

**The `codegenConfig` in package.json** should be:

```json
{
  "codegenConfig": {
    "name": "NativeBlePlxSpec",
    "type": "modules",
    "jsSrcsDir": "src/specs",
    "android": {
      "javaPackageName": "com.bleplx"
    }
  }
}
```

One `codegenConfig` per package; arrays are not supported. Multiple spec files in the same `jsSrcsDir` are discovered automatically. **Avoid `includesGeneratedCode: true`** unless you plan to regenerate for every RN major version — libraries pre-generated with RN <0.84 break on 0.84+ due to `ResultT` type alias changes.

---

## Android: Kotlin + Nordic BLE Library integration patterns

**Use Nordic Android-BLE-Library `2.11.0`** (`no.nordicsemi.android:ble:2.11.0` + `ble-ktx:2.11.0`) and Scanner Compat `1.6.0` (`no.nordicsemi.android.support.v18:scanner:1.6.0`). The pure-Kotlin rewrite (`kotlin.ble:client-android`) is explicitly "not recommended for production" by Nordic. The stable 2.x library with Kotlin coroutine extensions via `ble-ktx` is the correct choice.

**BleManager architecture**: Subclass `BleManager`, override `isRequiredServiceSupported(gatt)` to discover and cache characteristic references, `onServicesInvalidated()` to null them, and optionally `initialize()` to queue setup operations (enable notifications, request MTU). All GATT operations are **automatically serialized** by Nordic's internal queue — no manual queuing needed on Android.

```kotlin
class DeviceBleManager(context: Context) : BleManager(context) {
    private var txChar: BluetoothGattCharacteristic? = null
    private var rxChar: BluetoothGattCharacteristic? = null

    override fun isRequiredServiceSupported(gatt: BluetoothGatt): Boolean {
        val service = gatt.getService(SERVICE_UUID) ?: return false
        txChar = service.getCharacteristic(TX_UUID)
        rxChar = service.getCharacteristic(RX_UUID)
        return txChar != null && rxChar != null
    }

    override fun initialize() {
        requestMtu(517).enqueue()
        enableNotifications(rxChar).enqueue()
    }

    override fun onServicesInvalidated() {
        txChar = null
        rxChar = null
    }
}
```

With `ble-ktx`, operations become suspending functions: `connect(device).retry(3, 100).timeout(15_000).suspend()`. Use `suspendForResponse<T>()` for reads with parsed responses.

**The seven critical Android BLE gotchas:**

1. **Error 133 (GATT_ERROR)** is Android's catch-all mystery error. **Always** use `.retry(3, 100)` on connections. Common triggers: reconnecting too fast, Samsung stack bugs, and Bluetooth adapter congestion.

2. **MTU must be explicitly requested** — Android defaults to 23 bytes (20 usable). Call `requestMtu(517)` in `initialize()`. If the peripheral initiates MTU exchange instead, `onMtuChanged()` may not fire on some Android versions. Always request from the central (Android) side.

3. **Scan throttling**: Android 7.0+ limits apps to **5 `startScan()` calls per 30 seconds**. Exceeding this silently returns zero results with no error callback. Scans >30 minutes are auto-downgraded to `SCAN_MODE_OPPORTUNISTIC`. The Scanner Compat library does **not** automatically handle this — you must implement throttle protection: debounce start/stop cycles, reuse long-running scans, and space restarts by ≥6 seconds.

4. **Android 12+ permissions** require `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, and optionally `BLUETOOTH_ADVERTISE` at runtime (shown as "Nearby Devices" to users). Add `android:maxSdkVersion="30"` to legacy `BLUETOOTH`/`BLUETOOTH_ADMIN` and `ACCESS_FINE_LOCATION` permissions. The `neverForLocation` flag on `BLUETOOTH_SCAN` filters out some BLE beacons — only use if you truly never derive location from scans.

5. **Android 14+ foreground service types**: Background BLE requires a foreground service with `android:foregroundServiceType="connectedDevice"`. Android 12+ restricts starting foreground services from background. For background scanning, use foreground services (most reliable), `PendingIntent`-based scanning (system-managed), or `CompanionDeviceManager` (Android 12+, limited).

6. **Device cache after firmware updates**: Android caches GATT service structure. After OTA updates that change services, use `refreshDeviceCache()` (reflection-based) or `ensureBond()` to force re-discovery.

7. **Bonding security gap**: `getBondState()` only checks whether bond info exists, not whether the link is encrypted. An attacker can spoof MAC addresses and connect unencrypted. Use Nordic's `ensureBond()` to verify actual encryption, or read a protected characteristic to trigger automatic pairing (matches iOS behavior).

**Thread safety pattern for the TurboModule:**

```kotlin
class BlePlxModule(reactContext: ReactApplicationContext)
    : NativeBlePlxSpec(reactContext) {

    private val moduleScope = CoroutineScope(Dispatchers.Default + SupervisorJob())
    private val connectedManagers = ConcurrentHashMap<String, DeviceBleManager>()

    override fun connect(address: String, promise: Promise) {
        moduleScope.launch {
            try {
                val device = bluetoothAdapter.getRemoteDevice(address)
                val manager = DeviceBleManager(reactApplicationContext)
                manager.connect(device).retry(3, 100).timeout(15_000).suspend()
                connectedManagers[address] = manager
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("BLE_CONNECT_ERROR", e.message, e)
            }
        }
    }

    override fun invalidate() {
        super.invalidate()
        moduleScope.cancel()
        connectedManagers.values.forEach { it.close() }
        connectedManagers.clear()
    }
}
```

**Always cancel the `CoroutineScope` in `invalidate()`** to prevent leaks on RN reload. Use `ConcurrentHashMap` for shared mutable state (device maps). `promise.resolve()` / `promise.reject()` are thread-safe and can be called from any thread. Use `Dispatchers.Default` for BLE work, never `Dispatchers.Main`.

---

## iOS: Swift + CoreBluetooth with the actor isolation challenge

**CoreBluetooth has no async/await support as of iOS 18.** Apple has not modernized the framework — it remains entirely delegate-based. You must wrap it manually using `withCheckedThrowingContinuation` for one-shot operations and `AsyncStream` for ongoing events.

**The fundamental Swift concurrency challenge**: `CBPeripheral`, `CBCentralManager`, and other CoreBluetooth objects do **not conform to `Sendable`**. Passing them across actor boundaries violates Swift 6 strict concurrency. Apple provides no official guidance for resolving this.

**The recommended architecture uses a custom actor executor** (Swift 5.9+) backed by the same `DispatchQueue` that CoreBluetooth uses:

```swift
actor BLEActor {
    let queue = DispatchQueue(label: "com.bleplx.ble")
    nonisolated var unownedExecutor: UnownedSerialExecutor {
        queue.asUnownedSerialExecutor()
    }

    private lazy var centralManager = CBCentralManager(
        delegate: delegateHandler, queue: queue
    )
    // Actor-isolated code now runs on the same queue as CoreBluetooth
}
```

This eliminates the mismatch between actor isolation and CoreBluetooth's dispatch queue requirement. Without custom executors, the alternative is keeping all CoreBluetooth interaction in a plain `NSObject` class on the BLE queue, then bridging extracted **Sendable values** (UUIDs, Data, Strings — not CB objects) into actors via continuations.

**Practical workarounds for Swift 6 concurrency:**
- Use `@preconcurrency import CoreBluetooth` to silence Sendable warnings from the framework
- Mark wrapper types as `@unchecked Sendable` when you guarantee thread safety through your dispatch queue
- Mark delegate conformance methods as `nonisolated`
- Never pass `CBPeripheral` or `CBCharacteristic` across actor boundaries — extract the data first

**CoreBluetooth does NOT queue GATT operations.** Unlike Nordic on Android, rapid successive `readValue`/`writeValue` calls fail silently or produce ATT errors. You **must** implement a serial operation queue:

```swift
actor GATTOperationQueue {
    private var pending: [(work: () -> Void, continuation: CheckedContinuation<Data?, Error>)] = []
    private var isExecuting = false

    func enqueue(_ operation: @escaping () -> Void) async throws -> Data? {
        try await withCheckedThrowingContinuation { continuation in
            pending.append((work: operation, continuation: continuation))
            if !isExecuting { executeNext() }
        }
    }

    func operationCompleted(result: Result<Data?, Error>) {
        // Resume current continuation, then executeNext()
    }
}
```

Rules: one outstanding operation per type at a time, manual timeouts (10-30 seconds, since CoreBluetooth has none built-in), and flow control for write-without-response via `canSendWriteWithoutResponse` and the `peripheralIsReady(toSendWriteWithoutResponse:)` delegate.

**State restoration** requires initializing `CBCentralManager` with `CBCentralManagerOptionRestoreIdentifierKey`, implementing `willRestoreState` to re-set delegates and retain peripherals, and checking `UIApplication.LaunchOptionsKey.bluetoothCentrals` in the app delegate. Critical gotchas: `willRestoreState` fires **before** `centralManagerDidUpdateState`; the central manager does **not** retain strong references to peripherals (you must store them yourself); and state restoration only works for system-terminated apps — force-quit by user disables it.

**Background BLE on iOS** requires `UIBackgroundModes` with `bluetooth-central` in Info.plist, and `NSBluetoothAlwaysUsageDescription`. Background scanning **must specify service UUID filters** — passing `nil` returns zero results in background. `CBCentralManagerScanOptionAllowDuplicatesKey` is ignored in background. Scan intervals increase significantly.

**Extended advertising support is hardware-dependent and limited.** Check `CBCentralManager.supportsFeatures(.extendedScanAndConnect)`. Only LE 2M PHY extended ads are supported — **Coded PHY (long range) is not supported on iOS** for scanning. No API exists to control scan window/interval.

**L2CAP channels** (`CBL2CAPChannel`, available since iOS 11) require: dynamically assigned PSMs (read from a GATT characteristic, no static PSMs on iOS), strong retention of both the channel and peripheral (losing reference = instant disconnect with error 436), manually opening input/output streams and scheduling them on the correct RunLoop, and reading/writing from the same DispatchQueue as the stream schedule. L2CAP does **not** wake suspended apps — only GATT characteristic notifications do that.

**The iOS TurboModule requires an Objective-C++ entry point.** Codegen generates Obj-C headers; pure-Swift TurboModules are not possible. The architecture is:

```
JS Spec → Codegen → Obj-C++ TurboModule (.mm) → Swift BLEModuleImpl → BLEActor → CoreBluetooth
```

The `.mm` file conforms to the generated spec and delegates to a Swift `@objc public class`. All Swift classes/methods exposed to Obj-C need `@objc public`.

---

## Cross-platform BLE differences that the abstraction layer must handle

**MTU negotiation** is the most impactful divergence. iOS automatically negotiates **~185 bytes** upon connection with no developer API. Android defaults to **23 bytes** and requires explicit `requestMtu(517)`. A BLE library must auto-request MTU on Android during connection setup — the current ble-plx leaves this to developers, causing silent data truncation as the #1 reported issue.

**Device identifiers** are fundamentally incompatible: Android uses MAC addresses (`AA:BB:CC:DD:EE:FF`), iOS uses opaque UUIDs generated per-phone (not per-app). The UUID can change after Bluetooth settings reset. There is **no cross-platform stable identifier** — embed unique IDs in GATT characteristics or manufacturer advertising data.

**Notification/indication subscription** differs critically: iOS handles CCCD descriptor writes automatically when you call `setNotifyValue(true)`, while Android requires manually writing `0x0001` (notify) or `0x0002` (indicate) to descriptor `0x2902`. Forgetting the Android CCCD write is the second most common BLE bug in React Native apps.

**Write type enforcement** diverges: iOS strictly validates characteristic properties and silently ignores mismatched write types, while Android is permissive and may allow write-without-response on characteristics that don't advertise it. Write-without-response bursts that work on Android may stall on iOS due to internal flow control (`canSendWriteWithoutResponse`).

**Connection parameters** cannot be set from either platform's app-level API — only the peripheral firmware can request changes. iOS enforces stricter minimum intervals (**15ms** for non-HID vs Android's **7.5ms**). Both platforms cache GATT tables, but the cache invalidation mechanisms differ completely.

---

## What react-native-ble-plx v3.5.1 gets wrong

The current library has **27+ open issues** and crashes under React Native's New Architecture (issues #1277, #1278). It uses the classic `RCT_EXPORT_MODULE` bridge pattern — all BLE data crosses as JSON, adding latency especially for high-frequency notifications. There is no TurboModule spec, no Codegen integration, and no official roadmap for migration.

**Architecture problems a rewrite should fix:**

- **Base64 encoding overhead**: All data traverses the bridge as Base64 strings. TurboModules with JSI can pass typed data more efficiently.
- **Singleton BleManager**: v3 forces a singleton pattern, limiting flexibility for multi-manager scenarios.
- **No GATT operation queue on iOS**: The current library doesn't properly serialize CoreBluetooth operations, causing silent failures under load.
- **Missing features**: No L2CAP support, no BLE 5.0 PHY selection, no GATT server (peripheral) role, no explicit bonding API, incomplete extended advertising support, and no built-in permission management.
- **Android disconnect bug**: After v2→v3 migration, devices disconnect after 5 seconds on Android (#1157) with no error, suggesting lifecycle management issues.
- **Scan result disappearance**: Devices don't reappear in scans after disconnecting (#1279), pointing to improper scan state management.

The competing library `react-native-ble-manager` (~44K weekly downloads vs ble-plx's ~90K) offers simpler APIs, peripheral role support, and bonded device retrieval, but lacks ble-plx's granular state control. Neither library supports the New Architecture. **Flutter BLE plugins are generally considered more stable** by BLE experts — a well-architected TurboModule rewrite could close this gap.

---

## Library packaging: podspec, Gradle, and distribution

**Use `create-react-native-library`** (Callstack's official tool, recommended by React Native docs) to scaffold, then customize for Swift/BLE needs:

```bash
npx create-react-native-library@latest react-native-ble-plx
# Select: Turbo module, Kotlin & Objective-C
# Then manually add Swift files and update podspec
```

**Podspec for Swift** — include `.swift` in source_files, make headers private, use `install_modules_dependencies`:

```ruby
Pod::Spec.new do |s|
  s.name         = "react-native-ble-plx"
  s.source_files = "ios/**/*.{h,m,mm,cpp,swift}"
  s.private_header_files = "ios/**/*.h"
  install_modules_dependencies(s)  # Handles all New Architecture deps
end
```

**Android `build.gradle`** must apply `com.facebook.react` plugin (integrates Codegen), use `safeExtGet` for SDK versions, and add Nordic dependencies:

```groovy
apply plugin: 'com.facebook.react'
apply plugin: 'org.jetbrains.kotlin.android'

dependencies {
    implementation 'com.facebook.react:react-android'
    implementation 'no.nordicsemi.android:ble:2.11.0'
    implementation 'no.nordicsemi.android:ble-ktx:2.11.0'
    implementation 'no.nordicsemi.android.support.v18:scanner:1.6.0'
}
```

**For Expo compatibility**, ship a config plugin that adds `NSBluetoothAlwaysUsageDescription` to Info.plist and BLE permissions to AndroidManifest. Expo SDK 53+ has full New Architecture support; Expo SDK 55+ **requires** it. The library works with development builds, not Expo Go.

**Module name must match exactly** across: the `TurboModuleRegistry.get<Spec>('NativeBlePlx')` call, the native `NAME` constant, and the Kotlin/Obj-C class registration. A mismatch causes silent module-not-found errors.

---

## Conclusion

The rewrite should prioritize three architectural decisions that differ most from the current ble-plx implementation. First, **auto-negotiate MTU on Android** during connection setup rather than leaving it to developers — this alone would eliminate the most common category of user-reported bugs. Second, **implement a proper GATT operation queue on iOS** using Swift actor isolation with a custom executor backed by CoreBluetooth's dispatch queue — the current library's lack of serialization causes silent operation failures. Third, **use `CodegenTypes.EventEmitter<T>`** for all streaming data (scan results, notifications, disconnections) rather than the legacy `NativeEventEmitter` pattern — this provides type safety, automatic subscription cleanup, and eliminates the `addListener`/`removeListeners` boilerplate.

The most likely implementation pain points will be: the Codegen requirement to inline all types in a single spec file (expect a large `NativeBlePlx.ts`), the Obj-C++ bridging layer requirement on iOS preventing pure Swift (plan the `.mm` → Swift delegation pattern early), and Android's scan throttling (build debouncing into the scan API itself rather than exposing raw start/stop). Nordic's BleManager handles GATT queuing on Android, but you must still manage connection lifecycle, coroutine scope cancellation on RN reload, and concurrent device map synchronization carefully.