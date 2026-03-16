# Android Unit Tests

This directory is the standard Gradle unit-test source set for the
`react-native-ble-plx` Android module. Tests here run on the JVM (no emulator
or device required) using JUnit 5 and MockK.

## Setup

Add to `android/build.gradle` (already configured if using the v4 module):

```groovy
android {
    testOptions {
        unitTests.all {
            useJUnitPlatform()  // JUnit 5
        }
    }
}

dependencies {
    testImplementation 'org.junit.jupiter:junit-jupiter:5.10.0'
    testImplementation 'io.mockk:mockk:1.13.10'
    testImplementation 'org.jetbrains.kotlinx:kotlinx-coroutines-test:1.7.3'
}
```

## Test files to create

### `BleModuleTest.kt`

Test the `BlePlxModule` TurboModule:

- `createClient()` calls `BluetoothAdapter.enable()` on Android < 13 (requires
  mock of adapter) and resolves the promise.
- `startDeviceScan()` starts a `BluetoothLeScanner` session with the correct
  `ScanSettings` derived from the JS options object.
- `stopDeviceScan()` calls `stopScan()` on the active scanner.
- `connectToDevice()` with `autoConnect: false` opens a GATT connection and
  resolves the promise with the serialized `DeviceInfo`.
- `cancelDeviceConnection()` calls `gatt.disconnect()` and `gatt.close()`.
- `writeCharacteristic()` with `withResponse: true` calls
  `gatt.writeCharacteristic()` with `WRITE_TYPE_DEFAULT`.
- `writeCharacteristic()` with `withResponse: false` uses
  `WRITE_TYPE_NO_RESPONSE`.
- `monitorCharacteristic()` enables notifications (writes to the CCCD) and
  sets up the callback plumbing.
- `cancelTransaction()` cancels any in-flight coroutine for that transaction ID.

### `GattCallbackTest.kt`

Test the `GattCallback` class that bridges Android GATT callbacks to the
JS event emitter:

- `onConnectionStateChange(STATE_CONNECTED)` fires `onConnectionStateChange`
  event with `state: "connected"`.
- `onConnectionStateChange(STATE_DISCONNECTED)` fires the event with
  `state: "disconnected"` and correct `errorCode`/`errorMessage` for non-zero
  GATT status codes.
- `onCharacteristicChanged()` fires `onCharacteristicValueUpdate` with the
  base64-encoded value.
- `onServicesDiscovered()` resolves the pending `discoverAllServices` promise.

### `ScanCallbackTest.kt`

Test the `ScanCallback` that handles `BluetoothLeScanner` results:

- `onScanResult()` fires `onScanResult` with correct `DeviceInfo` fields.
- `onScanFailed()` fires an error event with `BleErrorCode.ScanFailed`.

### `BleErrorMapperTest.kt`

Test the Android → BleErrorCode mapping:

- GATT status 133 maps to `ConnectionFailed` with `isRetryable: true`.
- GATT status 8 (connection timeout) maps to `ConnectionTimeout`.
- Scan failure code `SCAN_FAILED_FEATURE_UNSUPPORTED` maps to
  `OperationNotSupported`.

## Running

```sh
cd android
./gradlew :react-native-ble-plx:testDebugUnitTest
```

HTML report: `android/build/reports/tests/testDebugUnitTest/index.html`
