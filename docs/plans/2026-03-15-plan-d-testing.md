# Plan D: Testing — Unit, Simulated Integration, Hardware

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Comprehensive test suite with CI-friendly simulated tests and a pre-release hardware test framework.

**Architecture:** Three test tiers: (1) Unit tests per platform (Jest/JUnit/XCTest) run on every PR. (2) Simulated integration tests with mock GATT peripherals run in CI. (3) Hardware integration tests with real BLE devices run pre-release.

**Tech Stack:** Jest, JUnit 5, MockK, XCTest, Nordic CoreBluetoothMock (iOS), Robolectric (Android), Maestro/Detox (hardware)

**Spec:** `docs/specs/2026-03-15-v4-turbomodule-rewrite.md` (Section 7)

**Depends on:** Plans A, B, C (all code must exist)

---

## File Structure

```
__tests__/                        ← JS unit tests (Jest)
├── BleManager.test.ts
├── EventBatcher.test.ts
├── BleError.test.ts
├── protocol.test.ts
android/src/test/kotlin/com/bleplx/   ← Android unit tests (JUnit 5)
├── ScanManagerTest.kt
├── ErrorConverterTest.kt
├── PermissionHelperTest.kt
├── EventSerializerTest.kt
├── BleManagerWrapperTest.kt
ios/Tests/                        ← iOS unit tests (XCTest)
├── GATTOperationQueueTests.swift
├── ErrorConverterTests.swift
├── EventSerializerTests.swift
├── StateRestorationTests.swift
integration-tests/
├── simulated/                    ← Mock GATT peripheral tests (CI)
│   ├── ios/
│   │   ├── MockPeripheral.swift  ← CoreBluetoothMock-based fake peripheral
│   │   └── SimulatedBLETests.swift
│   ├── android/
│   │   ├── MockGattServer.kt    ← Custom mock GATT
│   │   └── SimulatedBLETests.kt
│   └── js/
│       └── fullSync.test.ts     ← End-to-end JS flow with mocked native
├── hardware/                     ← Dual-device tests (pre-release)
│   ├── peripheral-firmware/      ← nRF52840 test firmware
│   ├── test-app/                 ← Phone test app
│   └── maestro/                  ← Maestro flows
│       ├── scan-pair-sync.yaml
│       ├── disconnect-recovery.yaml
│       └── indicate-stress.yaml
```

---

## Chunk 1: JS Unit Tests

### Task 1: Protocol parsing tests

**Files:**
- Create: `__tests__/protocol.test.ts`

- [ ] **Step 1: Write tests for Base64 encode/decode, DeviceInfo parsing, CharacteristicInfo parsing, error event conversion**

Key scenarios: valid data, truncated data, null fields, unknown event types, 0xFFFFFFFF timestamp sentinel.

- [ ] **Step 2: Run tests, commit**

---

### Task 2: Full JS flow tests with mocked native

**Files:**
- Create: `integration-tests/simulated/js/fullSync.test.ts`

- [ ] **Step 1: Mock the TurboModule and test**

Mock `NativeBlePlx` with in-memory state. Test the full flow:
1. `createClient()` → state = PoweredOn
2. `startDeviceScan()` → onScanResult fires with mock device
3. `connectToDevice()` → resolves with DeviceInfo
4. `writeCharacteristic()` → resolves with value
5. `monitorCharacteristic()` → onCharacteristicValueUpdate fires
6. Subscription `.remove()` → stops native monitor AND JS listener (audit #3 fix)
7. `cancelDeviceConnection()` → onConnectionStateChange fires
8. Error scenarios: permission denied, connection timeout, GATT error

- [ ] **Step 2: Run tests, commit**

---

## Chunk 2: Android Native Tests

### Task 3: Android unit tests

**Files:**
- Multiple test files in `android/src/test/kotlin/com/bleplx/`

- [ ] **Step 1: ScanManagerTest — throttle logic**

Test: 5 scans in 30s → 6th blocked with ScanThrottled. Scans spaced by 6s succeed. Stop/start cycle counts correctly.

- [ ] **Step 2: ErrorConverterTest — GATT error mapping**

Test: GATT 133 → ConnectionFailed + isRetryable=true. GATT 19 → DeviceDisconnected + isRetryable=false. SecurityException → ConnectPermissionDenied. ScanCallback error codes 1-6.

- [ ] **Step 3: PermissionHelperTest — SDK version gating**

Test: API 30 requires BLUETOOTH + location. API 31+ requires BLUETOOTH_SCAN + BLUETOOTH_CONNECT. Missing permission → correct error code.

- [ ] **Step 4: BleManagerWrapperTest — MTU auto-negotiation**

Test: API < 34 → requestMtu(517) called. API >= 34 → requestMtu NOT called (system auto-negotiates).

- [ ] **Step 5: Run all tests, commit**

```bash
cd android && ./gradlew test
```

---

### Task 4: Android simulated integration tests

**Files:**
- Create: `integration-tests/simulated/android/MockGattServer.kt`
- Create: `integration-tests/simulated/android/SimulatedBLETests.kt`

- [ ] **Step 1: Create MockGattServer using Robolectric shadows**

Simulates: service discovery, characteristic read/write, notification/indication, MTU negotiation, disconnect. Configurable responses and error injection.

- [ ] **Step 2: Write integration tests**

Full connect → discover → read → write → monitor → disconnect cycle. Indicate-based streaming (Smart Cap Rx protocol). Watermark ACK flow. Error injection: disconnect mid-transfer, timeout, permission revoked. Concurrent Write + Indicate stress test (Gemini finding).

- [ ] **Step 3: Run tests, commit**

---

## Chunk 3: iOS Native Tests

### Task 5: iOS unit tests

**Files:**
- Multiple test files in `ios/Tests/`

- [ ] **Step 1: GATTOperationQueueTests**

Test: operations execute serially, timeout fires, concurrent enqueue waits, cancel stops pending.

- [ ] **Step 2: ErrorConverterTests — CBError mapping**

Test: CBError.connectionFailed → ConnectionFailed. CBATTError → attErrorCode mapping. CBError.peerRemovedPairingInformation → BondLost.

- [ ] **Step 3: StateRestorationTests**

Test: `willRestoreState` fires before `didUpdateState` — verify buffering works. Restored peripherals re-attach delegates. Background relaunch bootstrap path.

- [ ] **Step 4: Run tests, commit**

```bash
cd ios && xcodebuild test -scheme BlePlx-Tests
```

---

### Task 6: iOS simulated integration tests

**Files:**
- Create: `integration-tests/simulated/ios/MockPeripheral.swift`
- Create: `integration-tests/simulated/ios/SimulatedBLETests.swift`

- [ ] **Step 1: Create MockPeripheral using Nordic CoreBluetoothMock**

`pod 'CoreBluetoothMock'` — provides `CBMCentralManagerMock` and `CBMPeripheralSpec` for simulating GATT peripherals without real Bluetooth.

- [ ] **Step 2: Write integration tests**

Same scenarios as Android: full lifecycle, Smart Cap Rx protocol, error injection, GATT queue stress, L2CAP channel lifecycle. Plus iOS-specific: state restoration after simulated background kill, `canSendWriteWithoutResponse` flow control, `CBManagerAuthorization` changes mid-scan.

- [ ] **Step 3: Run tests, commit**

---

## Chunk 4: Hardware Integration Tests

### Task 7: Test peripheral firmware

**Files:**
- Create: `integration-tests/hardware/peripheral-firmware/`

- [ ] **Step 1: Create nRF52840 test firmware**

Arduino sketch (or Zephyr) for nRF52840 DK/XIAO that exposes:
- A test GATT service with read/write/notify/indicate characteristics
- Configurable MTU response
- Configurable connection parameters
- Smart Cap Rx protocol service (for protocol-level testing)
- Serial command interface for test control (trigger disconnect, change values, inject errors)

- [ ] **Step 2: Commit**

---

### Task 8: Maestro hardware test flows

**Files:**
- Create: `integration-tests/hardware/maestro/*.yaml`

- [ ] **Step 1: Create Maestro flows**

- `scan-pair-sync.yaml`: scan → find test device → connect → sync time → transfer events → ACK → disconnect
- `disconnect-recovery.yaml`: connect → trigger remote disconnect → verify reconnection
- `indicate-stress.yaml`: connect → rapid indicate stream → verify no dropped packets → ACK

- [ ] **Step 2: Document test setup**

README with: required hardware (nRF52840 + phone), firmware flash instructions, Maestro install, how to run tests.

- [ ] **Step 3: Commit**

```bash
git add integration-tests/
git commit -m "test: hardware integration framework with nRF52840 test firmware and Maestro flows"
```
