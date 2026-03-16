# E2E BLE Test Plan

## Architecture

Two physical devices: iPhone (UDID: 00008130-000A34C12021401C) and Android (ID: 1A211FDF60055L).
Each test configuration uses one device as peripheral (BlePlxTest) and the other as scanner (example app).

### Configurations
- `android-scans-ios`: Android=scanner, iPhone=BlePlxTest peripheral
- `ios-scans-android`: iPhone=scanner, Android=BlePlxTest peripheral

### Orchestration
Shell script `run-e2e.sh <android|ios>`:
1. Kill apps on both devices
2. Launch BlePlxTest on peripheral device (adb/devicectl)
3. Wait with bounded readiness check (up to 15s)
4. Run Maestro flows against scanner device
5. Collect results

### Shared Subflow
`_connect-and-discover.yaml` — every test imports this:
1. Launch app fresh
2. Wait for PoweredOn
3. Start scan
4. Wait for "BlePlxTest" (up to 20s)
5. **Stop scan** (critical: some Android devices fail connect during active scan)
6. Tap BlePlxTest to connect
7. Wait for DeviceScreen
8. Discover services
9. Expand test service

## Test Matrix

| Flow | Feature | Characteristics | Assertions |
|------|---------|----------------|------------|
| 01-scan-connect-discover | Scan, connect, discover | - | Services listed, test service expandable |
| 02-read-counter | Read characteristic | 9A01 | Value changes between reads (read twice, compare) |
| 03-write-read-echo | Write + read roundtrip | 9A02 | Written base64 matches readback |
| 04-notify-stream | Notification monitoring | 9A03 | sample_count >= 5 over 5s, distinct_count >= 2 |
| 05-indicate-stream | Indication monitoring | 9A04 | sample_count >= 3 over 5s, distinct_count >= 2 |
| 06-mtu-read | MTU query + characteristic | 9A05 | getMtu() > 0, MTU char readable |
| 07-disconnect-reconnect | Disconnect and reconnect | - | Clean disconnect, re-scan finds device, reconnect succeeds |

## Semantic TestIDs (added to example app)

### ScanScreen
- `scan-start-btn`, `scan-stop-btn`, `device-list`, `device-item-{id}`
- `ble-state` — displays current BLE state text

### DeviceScreen
- `discover-btn`, `disconnect-btn`
- `device-mtu` — displays MTU value
- `service-test` — the test service header (semantic, not UUID-based)
- `char-read-counter`, `char-write-echo`, `char-notify-stream`, `char-indicate-stream`, `char-mtu-test`

### CharacteristicScreen
- `read-btn`, `write-input`, `write-btn`, `monitor-toggle`
- `value-display` — current value
- `sample-count` — number of monitor samples received
- `distinct-count` — number of distinct values received

## Features NOT Testable via Maestro E2E

These features CANNOT be tested with the current setup and must be noted:

1. **L2CAP Channels** (openL2CAPChannel, writeL2CAPChannel, closeL2CAPChannel) — Neither test peripheral app implements L2CAP PSM. Would require significant peripheral work.
2. **PHY Requests** (requestPhy, readPhy) — Android-only API; iOS doesn't expose PHY settings. No observable UI effect.
3. **Connection Priority** (requestConnectionPriority) — Android-only; no observable effect in UI, affects radio timing only.
4. **Bond State** (onBondStateChange, getBondedDevices) — Requires system pairing dialog which Maestro cannot control.
5. **State Restoration** (onRestoreState) — Requires killing the app process while connected and relaunching with CoreBluetooth background restoration. Complex to orchestrate.
6. **Write Without Response** — Test peripheral's Write Echo uses PROPERTY_WRITE (with response). Would need a separate characteristic.
7. **Permission Denied Flows** — Maestro cannot reliably intercept/deny system permission dialogs.
8. **Multiple Simultaneous Connections** — Only one BlePlxTest peripheral per device.
9. **Transaction Cancellation** (cancelTransaction) — Requires mid-flight cancel timing that's impractical in UI tests.
10. **Authorization Status** (getAuthorizationStatus) — Returns current state but can't be toggled via Maestro.
11. **Scan with Service UUID Filter** — Could test but adds complexity; scanning without filter covers the code path.
12. **Background Mode / App Lifecycle** — Would need Maestro to background/foreground the app during active connections.

## iOS Peripheral Fixes Needed
1. Backpressure handling: `updateValue` can return false when queue is full; must wait for `peripheralManagerIsReady(toUpdateSubscribers:)`
2. Keep app foregrounded during tests (CoreBluetooth reduces advertising when backgrounded)
