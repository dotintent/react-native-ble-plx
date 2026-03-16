# Plan B: Android Native — Kotlin TurboModule

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Android native layer as a Kotlin TurboModule using Nordic Android-BLE-Library for GATT operations and Scanner Compat for scanning.

**Architecture:** `BlePlxModule.kt` extends the Codegen-generated `NativeBlePlxSpec`. Uses `ConcurrentHashMap` for thread-safe state. Coroutine scope per module instance, cancelled on `invalidate()`. Per-device `BleManagerWrapper` extends Nordic's `BleManager`. `ScanManager` wraps Scanner Compat with built-in scan throttle debouncing.

**Tech Stack:** Kotlin, Nordic Android-BLE-Library 2.11.0, Nordic Scanner Compat 1.6.0, Kotlin Coroutines, JUnit 5, MockK

**Spec:** `docs/specs/2026-03-15-v4-turbomodule-rewrite.md` (Sections 2, 6)

**Depends on:** Plan A (Codegen spec must exist)

---

## File Structure

```
android/src/main/kotlin/com/bleplx/
├── BlePlxModule.kt              ← TurboModule entry point (extends NativeBlePlxSpec)
├── BlePlxPackage.kt             ← ReactPackage registration
├── BleManagerWrapper.kt         ← Per-device Nordic BleManager subclass
├── ScanManager.kt               ← Scanner Compat + throttle debouncing
├── PermissionHelper.kt          ← Runtime permission checks (API 31+)
├── EventSerializer.kt           ← Native objects → Codegen event types
├── ErrorConverter.kt            ← Android errors → unified BleErrorCode
└── L2CAPManager.kt              ← L2CAP support (stub for Android — iOS only)
android/src/test/kotlin/com/bleplx/
├── ScanManagerTest.kt
├── ErrorConverterTest.kt
├── PermissionHelperTest.kt
└── EventSerializerTest.kt
```

---

## Chunk 1: Module scaffolding + permissions

### Task 1: Kotlin TurboModule entry point

**Files:**
- Create: `android/src/main/kotlin/com/bleplx/BlePlxModule.kt`
- Create: `android/src/main/kotlin/com/bleplx/BlePlxPackage.kt`

- [ ] **Step 1: Create BlePlxModule extending NativeBlePlxSpec**

```kotlin
class BlePlxModule(reactContext: ReactApplicationContext)
    : NativeBlePlxSpec(reactContext) {

    companion object {
        const val NAME = "NativeBlePlx"
    }

    private val moduleScope = CoroutineScope(Dispatchers.Default + SupervisorJob())
    private val connectedManagers = ConcurrentHashMap<String, BleManagerWrapper>()
    private var scanManager: ScanManager? = null

    override fun getName(): String = NAME

    override fun invalidate() {
        super.invalidate()
        moduleScope.cancel()
        scanManager?.stopScan()
        connectedManagers.values.forEach { it.close() }
        connectedManagers.clear()
    }

    // ... method stubs for all spec methods
}
```

- [ ] **Step 2: Create BlePlxPackage for module registration**

- [ ] **Step 3: Update build.gradle with Nordic dependencies**

```groovy
dependencies {
    implementation 'com.facebook.react:react-android'
    implementation 'no.nordicsemi.android:ble:2.11.0'
    implementation 'no.nordicsemi.android:ble-ktx:2.11.0'
    implementation 'no.nordicsemi.android.support.v18:scanner:1.6.0'
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.0'
}
```

- [ ] **Step 4: Commit**

```bash
git add android/
git commit -m "feat(android): Kotlin TurboModule scaffolding with Nordic dependencies"
```

---

### Task 2: Permission helper

**Files:**
- Create: `android/src/main/kotlin/com/bleplx/PermissionHelper.kt`
- Create: `android/src/test/kotlin/com/bleplx/PermissionHelperTest.kt`

- [ ] **Step 1: Write tests for permission checks**

Test: API < 31 requires BLUETOOTH + location, API 31+ requires BLUETOOTH_SCAN/CONNECT, missing permission throws correct BleError.

- [ ] **Step 2: Implement PermissionHelper**

Runtime checks for `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, `ACCESS_FINE_LOCATION` with proper SDK version gating. Throws `BleError` with correct error code when permissions missing.

- [ ] **Step 3: Run tests, commit**

---

### Task 3: Error converter

**Files:**
- Create: `android/src/main/kotlin/com/bleplx/ErrorConverter.kt`

- [ ] **Step 1: Map Android GATT errors → unified BleErrorCode**

Maps: GATT status codes (0, 8, 19, 22, 133, 257), scan error codes (1-6), SecurityException, Nordic-specific errors → BleErrorCode. Includes `isRetryable` logic (133 = retryable, 19 = not).

- [ ] **Step 2: Test and commit**

---

## Chunk 2: Scanning + Connection

### Task 4: Scan manager with throttle debouncing

**Files:**
- Create: `android/src/main/kotlin/com/bleplx/ScanManager.kt`

- [ ] **Step 1: Implement ScanManager**

- Wraps Nordic Scanner Compat
- Tracks scan start timestamps (last 5)
- Rejects start if would exceed 5 starts in 30s window (returns ScanThrottled error)
- Spaces restarts by ≥6 seconds
- Emits results via callback
- Handles `legacyScan` flag for BLE 5.0 extended advertising

- [ ] **Step 2: Test throttle logic**

- [ ] **Step 3: Wire into BlePlxModule startDeviceScan/stopDeviceScan**

- [ ] **Step 4: Commit**

---

### Task 5: BleManagerWrapper (per-device GATT)

**Files:**
- Create: `android/src/main/kotlin/com/bleplx/BleManagerWrapper.kt`

- [ ] **Step 1: Implement Nordic BleManager subclass**

```kotlin
class BleManagerWrapper(context: Context) : BleManager(context) {
    private val characteristics = ConcurrentHashMap<String, BluetoothGattCharacteristic>()

    override fun isRequiredServiceSupported(gatt: BluetoothGatt): Boolean {
        // Cache all discovered characteristics
        gatt.services.forEach { service ->
            service.characteristics.forEach { char ->
                characteristics["${service.uuid}/${char.uuid}"] = char
            }
        }
        return true // Accept any device
    }

    override fun initialize() {
        // Auto-MTU on Android < 34 (Android 14+ auto-negotiates 517)
        if (Build.VERSION.SDK_INT < 34) {
            requestMtu(517).enqueue()
        }
    }

    override fun onServicesInvalidated() {
        characteristics.clear()
    }

    // Expose suspend functions for read/write/monitor
    suspend fun readCharacteristic(serviceUuid: String, charUuid: String): ByteArray { ... }
    suspend fun writeCharacteristic(serviceUuid: String, charUuid: String, data: ByteArray, withResponse: Boolean) { ... }
    fun monitorCharacteristic(serviceUuid: String, charUuid: String): Flow<ByteArray> { ... }
}
```

- [ ] **Step 2: Wire connect/disconnect into BlePlxModule**

Connection with retry: `manager.connect(device).retry(retries, retryDelay).timeout(timeout).suspend()`

- [ ] **Step 3: Commit**

---

### Task 6: Event serializer

**Files:**
- Create: `android/src/main/kotlin/com/bleplx/EventSerializer.kt`

Convert native objects (BluetoothDevice, ScanResult, BluetoothGattCharacteristic) → Codegen typed event structs for emission via `emitOnScanResult`, `emitOnConnectionStateChange`, etc.

- [ ] **Step 1: Implement all serializers**
- [ ] **Step 2: Test and commit**

---

## Chunk 3: Read/Write/Monitor + PHY + Bonding

### Task 7: GATT operations in BlePlxModule

- [ ] **Step 1: Implement readCharacteristic, writeCharacteristic**

Both delegate to `BleManagerWrapper` suspend functions, convert results to Codegen return types.

- [ ] **Step 2: Implement monitorCharacteristic**

Creates a coroutine collecting from `BleManagerWrapper.monitorCharacteristic()` Flow, emits via `emitOnCharacteristicValueUpdate`. Tracked by `transactionId` for cancellation. Properly cleans up on cancel/disconnect.

- [ ] **Step 3: Implement requestMtu, requestConnectionPriority, requestPhy, readPhy**

- [ ] **Step 4: Implement getBondedDevices**

Uses `BluetoothAdapter.getBondedDevices()`. Note: calls `ensureBond()` after connection for encryption verification, not just `getBondState()`.

- [ ] **Step 5: Commit**

---

### Task 8: Android manifest + final wiring

**Files:**
- Modify: `android/src/main/AndroidManifest.xml`
- Create: `android/src/main/AndroidManifestNew.xml` (non-empty!)

- [ ] **Step 1: Fix manifests**

AndroidManifest.xml: proper permissions with `maxSdkVersion`, `neverForLocation` flag.
AndroidManifestNew.xml: same permissions (NOT empty — the v3 bug).

- [ ] **Step 2: Integration test — verify module loads**

```bash
cd example && npx react-native run-android
```

- [ ] **Step 3: Commit**

```bash
git add android/
git commit -m "feat(android): complete Kotlin TurboModule with Nordic BLE Library"
```
