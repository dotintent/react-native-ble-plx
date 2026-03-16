# iOS Unit Tests

This directory holds XCTest unit tests for the `react-native-ble-plx` iOS
TurboModule. Tests run on the iOS Simulator with no physical Bluetooth
hardware required thanks to Nordic Semiconductor's `CoreBluetoothMock` library.

## Setup

### Add CoreBluetoothMock via Swift Package Manager

In Xcode, add the package dependency:
```
https://github.com/NordicSemiconductor/IOS-CoreBluetooth-Mock
```
Version: `>= 0.18.0`

Add it as a test-only dependency to the `react-native-ble-plxTests` target.

### Create the Xcode test target

In Xcode: File → New → Target → Unit Testing Bundle.
Name it `react-native-ble-plxTests`. Link it against the module's source
files (not the full app).

## Test files to create

### `BlePlxModuleTests.swift`

Test the `BlePlxModule` TurboModule using `CBMCentralManagerMock`:

```swift
import XCTest
import CoreBluetoothMock
@testable import react_native_ble_plx

final class BlePlxModuleTests: XCTestCase {
    // ...
}
```

Key test cases:

- `testCreateClient_powersOnManager()` — after `createClient()`, the mock
  central manager is in `.poweredOn` state and `onStateChange` fires with
  `"PoweredOn"`.
- `testStartDeviceScan_callsScanAPI()` — `startDeviceScan(nil, nil)` calls
  `centralManager.scanForPeripherals(withServices:options:)` with the
  correct arguments.
- `testStopDeviceScan_stopsScanning()` — `stopDeviceScan()` calls
  `centralManager.stopScan()`.
- `testConnectToDevice_resolvesWithDeviceInfo()` — mock a peripheral
  discovery followed by a connection; verify the resolved `DeviceInfo` has
  the correct fields.
- `testMonitorCharacteristic_receivesNotification()` — configure a mock
  peripheral characteristic to send notifications and verify the
  `onCharacteristicValueUpdate` event fires with base64-encoded data.
- `testCancelTransaction_stopsNotifications()` — after `cancelTransaction()`,
  no further `onCharacteristicValueUpdate` events should arrive.
- `testUnexpectedDisconnect_firesOnConnectionStateChange()` — simulate a link
  loss via `CBMCentralManagerMock` and verify the error event contains the
  correct `errorCode`.

### `BleErrorTests.swift`

Test the iOS → `BleErrorCode` mapping:

- `CBError.connectionTimeout` → `BleErrorCode.connectionTimeout`
- `CBATTError.insufficientAuthentication` → `BleErrorCode.bluetoothUnauthorized`
- `CBError.peripheralDisconnected` → `BleErrorCode.deviceDisconnected`

### `Base64Tests.swift`

Verify that characteristic value encoding round-trips correctly between
`Data` and base64 `String` for edge cases:
- Empty data → `""`
- Single zero byte → `"AA=="`
- Binary data with all byte values 0–255

## Running

From the repository root:
```sh
xcodebuild test \
  -workspace ios/BlePlxExample.xcworkspace \
  -scheme react-native-ble-plxTests \
  -destination 'platform=iOS Simulator,name=iPhone 16'
```

Or within Xcode: select the `react-native-ble-plxTests` scheme and press
`Cmd+U`.

## CoreBluetoothMock quick reference

```swift
// Set up a mock central manager in poweredOn state
CBMCentralManagerMock.simulatePowerOn()

// Register a mock peripheral
let mockPeripheral = CBMPeripheralSpec.simulatePeripheral(
    identifier: UUID(),
    proximity: .near
)
.advertising(
    advertisementData: [
        CBAdvertisementDataLocalNameKey: "BlePlxTest",
        CBAdvertisementDataServiceUUIDsKey: [CBUUID(string: "180D")]
    ],
    withInterval: 0.1
)
.connectable(
    name: "BlePlxTest",
    services: [ /* CBMServiceMock instances */ ]
)
.build()

CBMCentralManagerMock.simulatePeripherals([mockPeripheral])
```

See the [CoreBluetoothMock documentation](https://github.com/NordicSemiconductor/IOS-CoreBluetooth-Mock)
for the full API.
