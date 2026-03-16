# Plan E: v3 Cleanup, Example App, Build Verification, and Hardware Integration

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all v3 code, create a working RN 0.82+ example/test app that builds on both platforms, write native unit tests, and create hardware integration test infrastructure.

**Architecture:** Fresh RN 0.82+ app with `file:../` local dependency to trigger Codegen. Test firmware on nRF52840 XIAO with GATT test service. Maestro flows for E2E testing on physical phones.

**Tech Stack:** React Native 0.82+, Jest, JUnit 5/MockK, XCTest, Arduino (nRF52840), Maestro

**Depends on:** Plans A, B, C (all implemented)

---

## File Structure

```
# Files to DELETE (v3 remnants)
src/BleError.js
src/BleManager.js
src/BleModule.js
src/Characteristic.js
src/Descriptor.js
src/Device.js
src/EventBatcher.js         # (v3 JS version — v4 is .ts)
src/index.d.ts
src/index.js
src/Service.js
src/TypeDefinition.js
src/types.js                # (v3 JS version — v4 is .ts)
src/Utils.js
__tests__/BleError.test.js
__tests__/BleManager.js
__tests__/BleManager.test.js  # (old v3 — v4 is different file)
__tests__/Characteristic.js
__tests__/Descriptor.js
__tests__/Device.js
__tests__/EventBatcher.test.js  # (old v3)
__tests__/Service.js
__tests__/Utils.js
.flowconfig

# Files to CREATE/MODIFY
example/                     # Fresh RN 0.82+ app (replace existing)
android/src/test/kotlin/     # JUnit tests
ios/Tests/                   # XCTest tests
integration-tests/hardware/peripheral-firmware/  # Arduino test firmware
integration-tests/hardware/maestro/              # Updated Maestro flows
```

---

## Phase 1: v3 Cleanup

### Task 1: Remove v3 source and config

**Files:**
- Delete: all `src/*.js`, `src/index.d.ts`
- Delete: all `__tests__/*.js`
- Delete: `.flowconfig`
- Modify: `package.json` — remove Flow devDeps, update scripts
- Modify: `.eslintrc.json` — remove Flow/hermes overrides

- [ ] **Step 1: Delete all v3 JS source files**

```bash
rm src/BleError.js src/BleManager.js src/BleModule.js src/Characteristic.js \
   src/Descriptor.js src/Device.js src/EventBatcher.js src/index.d.ts \
   src/index.js src/Service.js src/TypeDefinition.js src/types.js src/Utils.js
```

- [ ] **Step 2: Delete all v3 JS test files**

```bash
rm __tests__/BleError.test.js __tests__/BleManager.js __tests__/BleManager.test.js \
   __tests__/Characteristic.js __tests__/Descriptor.js __tests__/Device.js \
   __tests__/EventBatcher.test.js __tests__/Service.js __tests__/Utils.js
```

Note: Keep __tests__/*.test.ts (v4 tests).

- [ ] **Step 3: Delete Flow config**

```bash
rm .flowconfig
```

- [ ] **Step 4: Update package.json**

Remove from devDependencies:
- `@babel/preset-flow`
- `eslint-plugin-flowtype`
- `eslint-plugin-ft-flow`
- `flow-bin`
- `hermes-eslint`
- `documentation`

Update scripts:
- `lint`: remove `flow &&` and `documentation lint index.js` references
- `docs`: remove (was documentation build)
- Keep `test`, `build`, `typecheck`

- [ ] **Step 5: Update .eslintrc.json**

Remove the Flow/hermes-eslint override block entirely (the one matching `src/**/*.js`).
Remove Flow-related globals (`$Keys`, `$Values`).

- [ ] **Step 6: Verify v4 tests still pass**

```bash
npx jest --config jest.config.js __tests__/
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: remove all v3 JS/Flow source, tests, and config"
```

---

## Phase 2: Example App + Build Verification

### Task 2: Create fresh RN 0.82+ example app

**Files:**
- Replace: `example/` directory entirely

- [ ] **Step 1: Remove old example app**

```bash
rm -rf example/
```

- [ ] **Step 2: Create fresh RN 0.82+ app**

```bash
npx react-native@latest init BlePlxExample --directory example
```

- [ ] **Step 3: Wire local library dependency**

In `example/package.json`:
```json
{
  "dependencies": {
    "react-native-ble-plx": "file:../"
  }
}
```

- [ ] **Step 4: Configure Android**

Set `ANDROID_HOME=~/Library/Android/sdk` in `example/android/local.properties`:
```
sdk.dir=/Users/shan/Library/Android/sdk
```

- [ ] **Step 5: Configure iOS**

```bash
cd example/ios && pod install
```

- [ ] **Step 6: Commit scaffold**

```bash
git commit -m "feat: fresh RN 0.82+ example app with local library dependency"
```

### Task 3: Build test screens

**Files:**
- Create: `example/src/screens/ScanScreen.tsx`
- Create: `example/src/screens/DeviceScreen.tsx`
- Create: `example/src/screens/CharacteristicScreen.tsx`
- Create: `example/src/App.tsx`

Screens:
1. **ScanScreen** — Start/stop scan, list discovered devices, tap to connect. testID: `scan-start`, `scan-stop`, `device-list`, `device-item-{id}`
2. **DeviceScreen** — Show services/characteristics after discovery, disconnect button. testID: `service-list`, `char-item-{uuid}`, `disconnect-btn`
3. **CharacteristicScreen** — Read value, write value, start/stop monitor. testID: `read-btn`, `write-input`, `write-btn`, `monitor-toggle`, `value-display`

All screens use BleManager v4 API directly (not Device wrapper — test the raw API).

- [ ] **Step 1: Create App with navigation**
- [ ] **Step 2: Create ScanScreen**
- [ ] **Step 3: Create DeviceScreen**
- [ ] **Step 4: Create CharacteristicScreen**
- [ ] **Step 5: Commit**

### Task 4: Android build verification

- [ ] **Step 1: Build Android**

```bash
cd example/android && ANDROID_HOME=~/Library/Android/sdk ./gradlew assembleDebug
```

Expected: Codegen generates `NativeBlePlxSpec` Java files, build succeeds.

- [ ] **Step 2: Fix any compilation errors in android/src/main/kotlin/**
- [ ] **Step 3: Commit fixes if needed**

### Task 5: iOS build verification

- [ ] **Step 1: Build iOS**

```bash
cd example/ios && xcodebuild -workspace BlePlxExample.xcworkspace -scheme BlePlxExample \
  -configuration Debug -sdk iphonesimulator -arch arm64
```

Expected: Codegen generates native headers, Swift compiles, build succeeds.

- [ ] **Step 2: Fix any compilation errors in ios/**
- [ ] **Step 3: Commit fixes if needed**

---

## Phase 3: Native Unit Tests

### Task 6: Android unit tests

**Files:**
- Create: `android/src/test/kotlin/com/bleplx/ScanManagerTest.kt`
- Create: `android/src/test/kotlin/com/bleplx/ErrorConverterTest.kt`
- Create: `android/src/test/kotlin/com/bleplx/PermissionHelperTest.kt`
- Create: `android/src/test/kotlin/com/bleplx/EventSerializerTest.kt`

- [ ] **Step 1: ScanManagerTest — throttle logic**

Test: 5 scans in 30s → 6th returns ScanThrottled. Scans spaced by 6s succeed.

- [ ] **Step 2: ErrorConverterTest — GATT error mapping**

Test: GATT 133 → ConnectionFailed + retryable. GATT 19 → DeviceDisconnected. GATT 0x3E → ConnectionFailed. SecurityException → ConnectPermissionDenied.

- [ ] **Step 3: PermissionHelperTest — SDK version gating**

Test: API 30 → BLUETOOTH + location. API 31+ → BLUETOOTH_SCAN + BLUETOOTH_CONNECT.

- [ ] **Step 4: Run tests**

```bash
cd example/android && ANDROID_HOME=~/Library/Android/sdk ./gradlew :react-native-ble-plx:test
```

- [ ] **Step 5: Commit**

### Task 7: iOS unit tests

**Files:**
- Create: `ios/Tests/GATTOperationQueueTests.swift`
- Create: `ios/Tests/ErrorConverterTests.swift`
- Create: `ios/Tests/EventSerializerTests.swift`

- [ ] **Step 1: GATTOperationQueueTests**

Test: operations execute serially, timeout fires, cancel before execution works.

- [ ] **Step 2: ErrorConverterTests**

Test: CBError.connectionFailed → ConnectionFailed. CBATTError codes. CBError.peerRemovedPairingInformation → BondLost.

- [ ] **Step 3: Run tests**

```bash
cd example/ios && xcodebuild test -workspace BlePlxExample.xcworkspace -scheme BlePlxExample \
  -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 16'
```

- [ ] **Step 4: Commit**

---

## Phase 4: Hardware Integration

### Task 8: nRF52840 test firmware

**Files:**
- Create: `integration-tests/hardware/peripheral-firmware/ble_test_peripheral/ble_test_peripheral.ino`
- Create: `integration-tests/hardware/peripheral-firmware/ble_test_peripheral/config.h`

Arduino sketch for XIAO nRF52840 that exposes:
- **Test Service** (UUID: `12345678-1234-1234-1234-123456789abc`)
  - Read characteristic (returns incrementing counter)
  - Write characteristic (echoes back on read)
  - Notify characteristic (sends counter every 500ms when subscribed)
  - Indicate characteristic (sends counter every 1s when subscribed, requires ACK)
- Configurable MTU response
- Serial command interface: `disconnect`, `set-value <hex>`, `toggle-notify`, `reset`
- LED feedback for connection state

- [ ] **Step 1: Create test firmware**
- [ ] **Step 2: Test with nRF Connect app**
- [ ] **Step 3: Commit**

### Task 9: Maestro integration test flows

**Files:**
- Update: `integration-tests/hardware/maestro/scan-pair-sync.yaml`
- Update: `integration-tests/hardware/maestro/disconnect-recovery.yaml`
- Update: `integration-tests/hardware/maestro/indicate-stress.yaml`
- Create: `integration-tests/hardware/maestro/write-read-roundtrip.yaml`

Pre-requisites documented in each flow:
- BLE permissions pre-granted (`adb shell pm grant` for Android, manual for iOS)
- Test peripheral powered on and advertising

- [ ] **Step 1: Update flows with real testIDs from example app**
- [ ] **Step 2: Create write-read-roundtrip flow**
- [ ] **Step 3: Commit**
