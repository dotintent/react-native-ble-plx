# E2E Testing Infrastructure

react-native-ble-plx v4 has automated end-to-end tests that run on physical hardware. BLE cannot be meaningfully tested in simulators, so we use two real phones connected via USB to a Mac, with maestro-runner driving the UI.

## Overview

The test setup works like this:
- **Device A** runs the example app (BLE scanner/central)
- **Device B** runs the BlePlxTest app (BLE peripheral/GATT server)
- **maestro-runner** automates the UI on Device A
- A shell script orchestrates the whole thing

Each test flow connects to the BlePlxTest peripheral, performs BLE operations, and verifies results through the UI.

## Hardware Setup

| Device | Role | ID |
|--------|------|----|
| iPhone 15 Pro Max | Scanner or Peripheral | UDID: `00008130-000A34C12021401C` |
| Android phone | Scanner or Peripheral | Serial: `1A211FDF60055L` |

Both devices connected via USB to a Mac. The test script can swap roles -- you can run the test suite with Android as the scanner and iPhone as the peripheral, or vice versa.

## Test Apps (4 Total)

| App | Platform | Package / Bundle ID | Purpose |
|-----|----------|-------------------|---------|
| Example App | Android | `com.bleplxexample` | Scanner under test |
| Example App | iOS | `com.iotashan.example.--PRODUCT-NAME-rfc1034identifier-` | Scanner under test |
| BlePlxTest | Android | `com.bleplx.testperipheral` | GATT server peripheral |
| BlePlxTest | iOS | `com.bleplx.testperipheral.ios` | GATT server peripheral |

The BlePlxTest peripheral exposes a known GATT service with these characteristics:
- **Read Counter** -- returns an incrementing integer on each read
- **Write Echo** -- write a value, read it back
- **Notify Stream** -- emits notifications at regular intervals
- **Indicate Stream** -- emits indications at regular intervals
- **MTU Test** -- returns the negotiated MTU value
- **Write No Response** -- accepts write-without-response, echoes via read
- **L2CAP** -- exposes a PSM for L2CAP channel testing

## Prerequisites

### Software

- **maestro-runner** -- `~/.maestro-runner/bin/maestro-runner`
  ```bash
  curl -fsSL https://open.devicelab.dev/install/maestro-runner | bash
  ```
- **pymobiledevice3** -- for iOS device communication
  ```bash
  pip3 install pymobiledevice3
  ```
- **Xcode** -- for iOS builds and `xcrun devicectl`
- **Android Studio** -- for `adb` and Gradle
- **JAVA_HOME** set to Android Studio's JBR (yes, you need a specific Java and yes, it matters):
  ```bash
  export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
  ```

### iOS Tunnel (Required for iOS Tests)

Start the pymobiledevice3 tunnel in a separate terminal before running iOS tests:

```bash
sudo pymobiledevice3 remote tunneld -d
```

This stays running for the duration of your test session.

### BLE Permissions (One-Time Setup)

Pre-grant permissions so the test flows don't get stuck on system dialogs:

**Android:**
```bash
adb shell pm grant com.bleplxexample android.permission.BLUETOOTH_SCAN
adb shell pm grant com.bleplxexample android.permission.BLUETOOTH_CONNECT
adb shell pm grant com.bleplxexample android.permission.ACCESS_FINE_LOCATION
```

**iOS:** Launch the example app manually once and accept all permission prompts.

### Apple Team ID (iOS)

maestro-runner builds WebDriverAgent on the first iOS run. It needs the Apple Developer Team ID (`2974F4A5QH`). After the first build, trust the WDA app on the iPhone: **Settings > General > VPN & Device Management**.

## Running Tests

```bash
# Android as scanner, iPhone as BlePlxTest peripheral
./integration-tests/hardware/maestro/run-e2e.sh android

# iPhone as scanner, Android as BlePlxTest peripheral
./integration-tests/hardware/maestro/run-e2e.sh ios

# Run a single test (e.g., test 03)
./integration-tests/hardware/maestro/run-e2e.sh android 03
```

### What the Script Does

1. Kills BLE apps on both devices (clean slate)
2. Launches BlePlxTest peripheral on the opposite device
3. Waits 5 seconds for the peripheral to start advertising
4. Runs maestro-runner flows sequentially
5. For iOS: auto-swaps `appId` in flow files to the iOS bundle ID
6. Reports pass/fail results and lists untested features

## Test Matrix

| # | Test | What It Validates |
|---|------|------------------|
| 01 | Scan / Connect / Discover | Full happy path -- scan, find BlePlxTest, connect, discover, verify all characteristics |
| 02 | Read Counter | Characteristic read returns incrementing value |
| 03 | Write / Read Echo | Write a base64 value, read it back, verify match |
| 04 | Notify Stream | 5 seconds of notifications -- at least 5 samples, at least 2 distinct values |
| 05 | Indicate Stream | 6 seconds of indications -- at least 3 samples, at least 2 distinct values |
| 06 | MTU Read | MTU value displayed in UI, MTU characteristic readable |
| 07 | Disconnect / Reconnect | Clean disconnect, re-scan, reconnect to same device |
| 08 | Write No Response | Write-without-response echo roundtrip |
| 09 | Scan UUID Filter | Filtered scan by service UUID finds only the test peripheral |
| 10 | Background Mode | Monitoring continues while the app is in the background |
| 11 | L2CAP Channel | Open channel, write data, close channel |

11 test flows per platform. Run `./run-e2e.sh android` and `./run-e2e.sh ios` separately.

## Writing New Test Flows

Test flows are YAML files in `integration-tests/hardware/maestro/`. They follow the [Maestro flow syntax](https://maestro.mobile.dev/reference/commands).

### Naming Convention

- Numbered flows (`01-`, `02-`, etc.) run in order
- Shared subflows start with `_` (e.g., `_connect-and-discover.yaml`)
- iOS-specific variants end with `-ios.yaml` (e.g., `10-background-mode-ios.yaml`)

### Subflow Reuse

Most tests start with the same scan/connect/discover sequence. Use `runFlow` to include the shared subflow:

```yaml
appId: com.bleplxexample
---
- runFlow: _connect-and-discover.yaml

# Your test-specific steps here
- tapOn:
    id: "read-counter-btn"
- extendedWaitUntil:
    visible:
      id: "counter-value"
    timeout: 5000
```

### Element Selection

Use `id` attributes (React Native `testID` props) for element selection. This is more reliable than text matching, especially across platforms.

### Timeouts

BLE operations can be slow. Use `extendedWaitUntil` with generous timeouts instead of `assertVisible`:

```yaml
# Good -- waits up to 30 seconds
- extendedWaitUntil:
    visible:
      id: "device-BlePlxTest"
    timeout: 30000

# Bad -- fails immediately if not visible
- assertVisible:
    id: "device-BlePlxTest"
```

Note: maestro-runner doesn't support inline `timeout` inside `assertVisible`. Always use `extendedWaitUntil` for anything that might take time.

### iOS-Specific Flows

For tests that behave differently on iOS (like background mode), create a separate `-ios.yaml` variant. The run script automatically swaps it in when running iOS tests.

### Known Limitation: FlatList on Android Fabric

Tapping items inside a `FlatList` is unreliable on Android with Fabric (New Architecture). The workaround is to use a plain `View` with `.map()` instead of `FlatList` for UI elements that need to be tapped in tests. The example app already uses this pattern for the device list and characteristic list.

## Building and Installing Apps

### Example App (Scanner)

**Android:**
```bash
cd example && npx react-native run-android
```

**iOS:**
```bash
cd example/ios
xcodebuild -workspace BlePlxExample.xcworkspace -scheme BlePlxExample \
  -destination 'id=00008130-000A34C12021401C' -configuration Debug build
xcrun devicectl device install app --device 00008130-000A34C12021401C \
  ~/Library/Developer/Xcode/DerivedData/BlePlxExample-*/Build/Products/Debug-iphoneos/BlePlxExample.app
```

### BlePlxTest Peripheral

**Android:**
```bash
cd integration-tests/hardware/test-app  # or peripheral project directory
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

**iOS:**
```bash
cd integration-tests/hardware/peripheral-firmware/ble_test_peripheral  # or iOS peripheral project
xcodebuild -project BlePlxTest.xcodeproj -scheme BlePlxTest \
  -destination 'id=00008130-000A34C12021401C' -configuration Debug build
xcrun devicectl device install app --device 00008130-000A34C12021401C \
  ~/Library/Developer/Xcode/DerivedData/BlePlxTest-*/Build/Products/Debug-iphoneos/BlePlxTest.app
```

## Features NOT Covered by E2E Tests

Some things can't be practically tested with UI automation (not for lack of trying):

| Feature | Why |
|---------|-----|
| PHY Requests | Android-only, no observable UI effect |
| Connection Priority | Affects radio timing, not visible in UI |
| Bond State / Pairing | Requires interacting with system pairing dialog |
| State Restoration | Requires the OS to kill and relaunch the app |
| Permission Denied Flows | Can't control system permission dialogs |
| Multiple Simultaneous Connections | Only one test peripheral available |
| Transaction Cancellation | Mid-flight timing is impractical in UI tests |
| Authorization Status | Read-only state, can't toggle programmatically |

These are covered by unit tests and manual testing during the release process. If you figure out how to automate pairing dialogs, let us know.

## Troubleshooting Test Runs

### Nuclear Option: Restart Everything

When tests get stuck (tunnel dies, WDA won't connect, scans time out):

1. Restart both phones
2. Reconnect USB cables
3. `pkill -f maestro-runner` on the Mac
4. Restart the tunnel: `sudo pymobiledevice3 remote tunneld -d`
5. Unlock the iPhone (CoreBluetooth reduces advertising when locked)
6. Run tests

### "No route to host" / pymobiledevice3 Fails

The tunnel died. Restart it:
```bash
sudo pymobiledevice3 remote tunneld -d
```

### WDA Port in Use (iOS Tests)

The script kills port 8152 between test runs automatically. If you still get "address already in use":
```bash
lsof -ti :8152 | xargs kill -9
```

### BlePlxTest Not Found During Scan

- Make sure the peripheral app is actually running on the other device
- Phones should be physically near each other (within a few feet)
- iPhone locked = reduced advertising. Keep it unlocked during tests.
- Manually launch the peripheral if needed:
  ```bash
  # Android
  adb shell am start -n com.bleplx.testperipheral/.MainActivity
  # iOS
  xcrun devicectl device process launch --terminate-existing \
    --device 00008130-000A34C12021401C com.bleplx.testperipheral.ios
  ```
