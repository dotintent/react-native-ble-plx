# Hardware Test App

This directory documents the React Native test application used to drive
hardware integration tests via Maestro.

## Overview

The hardware tests require a test app installed on a physical iOS or Android
device. The app wraps `react-native-ble-plx` and exposes screen elements that
Maestro can target (by testID / accessibility label).

## Option 1: Use the existing example app

The `example/` directory at the repo root contains a full sample app.
You can install it on a device and point the Maestro flows at it.

1. Build and install the example app:
   ```sh
   # iOS
   cd example/ios && pod install && xcodebuild -scheme BlePlxExample -destination 'id=<device-udid>'

   # Android
   cd example/android && ./gradlew installDebug
   ```

2. The bundle ID / package name for Maestro:
   - iOS: `com.bleplxexample`
   - Android: `com.bleplxexample`

## Option 2: Create a minimal test harness app

For more targeted control, create a minimal app with screens that map 1:1
to the Maestro flow steps:

- **ScanScreen** — a "Start Scan" button and a list that shows discovered
  devices. Each list item has `testID="device-{address}"`.
- **ConnectScreen** — shown after tapping a device. Shows connection state,
  an MTU label, and a "Disconnect" button.
- **CharacteristicScreen** — shows the last received notification value
  in a `Text` element with `testID="char-value"`.

## testID conventions used by Maestro flows

| testID | Usage |
|---|---|
| `start-scan-button` | Tap to begin BLE scan |
| `device-AA:BB:CC:DD:EE:FF` | Tap to connect to specific device |
| `connection-state-label` | Text element showing current state |
| `char-value` | Last received characteristic notification value |
| `write-button` | Tap to write a test value |
| `disconnect-button` | Tap to disconnect |
| `error-label` | Shown when a BleError is received |

## Running against a physical device

Ensure:
1. Bluetooth is enabled on the test phone.
2. The peripheral firmware device is powered on and advertising as `BlePlxTest`.
3. The test app is installed and foregrounded.

Then run:
```sh
maestro test integration-tests/hardware/maestro/scan-pair-sync.yaml
```

## CI considerations

Hardware tests are not run in CI by default because they require physical
devices. Gate them with a separate workflow trigger (`workflow_dispatch` with
`run_hardware_tests: true`) or a dedicated device-farm job.
