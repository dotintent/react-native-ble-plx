# BLE E2E Tests (Maestro)

Automated end-to-end tests for react-native-ble-plx using two physical devices.

## Setup

### Devices
- **iPhone**: UDID `00008130-000A34C12021401C`
- **Android**: ID `1A211FDF60055L`

### Apps Required
| App | Android Package | iOS Bundle ID |
|-----|----------------|---------------|
| Example (scanner) | `com.bleplxexample` | `com.iotashan.example.--PRODUCT-NAME-rfc1034identifier-` |
| BlePlxTest (peripheral) | `com.bleplx.testperipheral` | `com.bleplx.testperipheral.ios` |

### Prerequisites
1. Both devices connected (`adb devices`, `xcrun devicectl list devices`)
2. All 4 apps installed on appropriate devices
3. BLE permissions pre-granted on both devices
4. Metro bundler running for the example app
5. `maestro` CLI installed (`brew install maestro`)

### BLE Permissions

#### Android (API 31+)
```bash
adb shell pm grant com.bleplxexample android.permission.BLUETOOTH_SCAN
adb shell pm grant com.bleplxexample android.permission.BLUETOOTH_CONNECT
adb shell pm grant com.bleplxexample android.permission.ACCESS_FINE_LOCATION
```

#### iOS
Grant BLE and location permissions manually on first launch, then terminate and re-launch.

## Running Tests

```bash
# Android as scanner, iPhone as peripheral
./run-e2e.sh android

# iPhone as scanner, Android as peripheral
./run-e2e.sh ios

# Run a specific test only
./run-e2e.sh android 03    # write-read-echo test
./run-e2e.sh ios 04        # notify-stream test
```

## Test Flows

| File | Test | What it validates |
|------|------|------------------|
| `_connect-and-discover.yaml` | (shared subflow) | Scan, stop scan, connect, discover, expand test service |
| `01-scan-connect-discover.yaml` | Scan/Connect/Discover | Full happy path, all 5 characteristics visible, MTU shown |
| `02-read-counter.yaml` | Read Characteristic | Read counter returns a value, second read returns different value |
| `03-write-read-echo.yaml` | Write/Read Roundtrip | Write base64 "SGVsbG8=", read back, verify match |
| `04-notify-stream.yaml` | Notification Stream | 5s of notifications, >= 5 samples, >= 2 distinct values |
| `05-indicate-stream.yaml` | Indication Stream | 6s of indications, >= 3 samples, >= 2 distinct values |
| `06-mtu-read.yaml` | MTU Query | MTU on DeviceScreen, MTU characteristic readable |
| `07-disconnect-reconnect.yaml` | Disconnect/Reconnect | Disconnect, re-scan, reconnect, re-discover |

### Legacy Flows (pre-v4, may need updating)
| File | Notes |
|------|-------|
| `scan-pair-sync.yaml` | Uses old UUID scheme (fff1-fff3) |
| `write-read-roundtrip.yaml` | Uses old UUID scheme |
| `disconnect-recovery.yaml` | Requires manual firmware disconnect trigger |
| `indicate-stress.yaml` | Uses old UUID scheme |

## TestID Reference

### ScanScreen
| testID | Element |
|--------|---------|
| `scan-start-btn` | Start Scan button |
| `scan-stop-btn` | Stop Scan button |
| `device-list` | FlatList of devices |
| `device-item-{id}` | Individual device row |

### DeviceScreen
| testID | Element |
|--------|---------|
| `discover-btn` | Discover Services button |
| `disconnect-btn` | Disconnect button |
| `device-mtu` | MTU display text |
| `service-test` | Test service header (expandable) |
| `service-list` | FlatList of services |
| `test-char-list` | Expanded test characteristic list |
| `char-read-counter` | Read Counter characteristic |
| `char-write-echo` | Write Echo characteristic |
| `char-notify-stream` | Notify Stream characteristic |
| `char-indicate-stream` | Indicate Stream characteristic |
| `char-mtu-test` | MTU Test characteristic |

### CharacteristicScreen
| testID | Element |
|--------|---------|
| `read-btn` | Read button |
| `write-input` | Write value TextInput |
| `write-btn` | Write button |
| `monitor-toggle` | Monitor enable/disable Switch |
| `value-display` | Current value display |
| `sample-count` | Monitor sample count (e.g. "Samples: 12") |
| `distinct-count` | Monitor distinct value count (e.g. "Distinct: 8") |

## Features NOT Covered by E2E Tests

These react-native-ble-plx features **cannot** be tested with the current Maestro E2E setup:

| Feature | API Methods | Reason |
|---------|------------|--------|
| **L2CAP Channels** | `openL2CAPChannel`, `writeL2CAPChannel`, `closeL2CAPChannel` | Neither test peripheral implements L2CAP PSM |
| **PHY Requests** | `requestPhy`, `readPhy` | Android-only API; no observable UI effect |
| **Connection Priority** | `requestConnectionPriority` | Android-only; affects radio timing only, no UI feedback |
| **Bond State / Pairing** | `onBondStateChange`, `getBondedDevices` | Requires system pairing dialog that Maestro can't control |
| **State Restoration** | `onRestoreState` | Requires killing app during active BLE connection and relaunching with CoreBluetooth background restoration |
| **Write Without Response** | `writeCharacteristicForDevice(_, _, _, _, false)` | Test peripheral's Write Echo uses write-with-response only; would need a 6th characteristic |
| **Permission Denied Flows** | N/A | Maestro cannot reliably deny system permission dialogs |
| **Multiple Connections** | N/A | Only one BlePlxTest peripheral available per device |
| **Transaction Cancellation** | `cancelTransaction` | Requires canceling mid-flight; timing is impractical in UI tests |
| **Authorization Status** | `getAuthorizationStatus` | Read-only; cannot toggle Bluetooth authorization via Maestro |
| **Background Mode** | N/A | Would require backgrounding the app during active connections |
| **Scan with UUID Filter** | `startDeviceScan([uuids], ...)` | Covered by unfiltered scan code path; filter is a CoreBluetooth/Android pass-through |

## Architecture Notes

- **Stop scan before connect**: The shared subflow explicitly stops scanning before connecting. Some Android devices fail connection attempts during active scans.
- **Auto-expand test service**: After discovery, DeviceScreen auto-expands the test service so characteristics are immediately visible to Maestro.
- **Sample/distinct counters**: CharacteristicScreen tracks notification/indication sample counts for reliable stream assertions.
- **Semantic testIDs**: Characteristic rows use semantic IDs (`char-read-counter`) not raw UUIDs, avoiding casing issues across platforms.
- **iOS peripheral backpressure**: The iOS BlePlxTest handles `updateValue` returning `false` and waits for `peripheralManagerIsReady(toUpdateSubscribers:)`.
- **Fire-and-forget peripheral**: The peripheral app is launched on the server device and left running. Maestro only controls the scanner device.
