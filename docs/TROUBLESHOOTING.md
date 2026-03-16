# Troubleshooting

BLE on mobile is a minefield. Here are the problems you will encounter and how to fix them.

---

## "BLE state is Unknown / PoweredOff"

**Symptom:** `manager.state()` returns `Unknown` or `PoweredOff`.

**Causes and fixes:**

1. **You're running on a simulator/emulator.** BLE doesn't work there. Use a physical device. There is no workaround, no mock, no clever hack. Physical device.

2. **Bluetooth is actually off.** Check Settings on the device. On iOS, also check Control Center -- the Bluetooth icon should be blue, not gray.

3. **You're calling `state()` too early.** On iOS, the BLE stack reports `Unknown` for a brief moment after app launch while CoreBluetooth initializes. Use `onStateChange` to wait for the real state:

   ```typescript
   const sub = manager.onStateChange(state => {
     if (state === State.PoweredOn) {
       sub.remove();
       startYourBleStuff();
     }
   }, true); // true = also emit current state immediately
   ```

4. **iOS: Bluetooth authorization denied.** If the user denied Bluetooth permission, the state shows as `Unauthorized`. Check `getAuthorizationStatus()` and prompt the user to enable it in Settings.

---

## "Scan doesn't find any devices"

**Symptom:** `startDeviceScan` callback never fires, or fires with zero devices.

**Causes and fixes:**

1. **Permissions not granted.** This is the #1 cause on Android. Check that you've requested and received:
   - Android 12+: `BLUETOOTH_SCAN` and `BLUETOOTH_CONNECT`
   - Android 11 and below: `ACCESS_FINE_LOCATION`
   - Without permissions, scans silently return nothing. No error, no crash, just... silence.

2. **The peripheral isn't advertising.** Verify with a third-party BLE scanner app (nRF Connect, LightBlue) that the device is actually visible.

3. **Android scan throttling.** Android 7+ limits scan starts to approximately 5 per 30 seconds. If you're rapidly starting/stopping scans (common during development), you'll hit this limit and get zero results. Wait 30 seconds and try again. In production, don't start/stop scans rapidly.

4. **iOS background scanning without service UUIDs.** If your app is backgrounded on iOS and you pass `null` for `serviceUuids`, you'll get zero results. Background scanning MUST specify service UUID filters.

5. **Wrong service UUID format.** UUIDs must be the full 128-bit format (`0000180a-0000-1000-8000-00805f9b34fb`) or the short 16-bit format (`180a`). Verify you're using the right one.

6. **`legacyScan` filtering out BLE 5.0 devices.** If the peripheral uses BLE 5.0 Extended Advertising, set `legacyScan: false` in scan options:

   ```typescript
   manager.startDeviceScan(null, { legacyScan: false }, callback);
   ```

---

## "Connection times out"

**Symptom:** `connectToDevice` rejects with a timeout error.

**Causes and fixes:**

1. **Device is out of range or not advertising.** BLE range varies wildly -- from 1 meter to 100 meters depending on the environment, device, and antenna. Move closer.

2. **Device is already connected to something else.** Most BLE peripherals only allow one central connection at a time. Disconnect from nRF Connect or whatever other app is hogging the connection.

3. **Android: `autoConnect: false` with slow peripherals.** Direct connection (`autoConnect: false`, the default) has a ~30 second system timeout. If the peripheral is slow to respond, try `autoConnect: true` for a more patient background connection. Or set an explicit `timeout` with `retries`:

   ```typescript
   await manager.connectToDevice(deviceId, {
     timeout: 15000,
     retries: 3,
     retryDelay: 2000,
   });
   ```

4. **Android: GATT 133 ("the error code of despair").** GATT status 133 is Android's catch-all "something went wrong" error. Common causes:
   - Too many simultaneous connections (Android typically supports 6-7)
   - Previous connection wasn't cleaned up properly
   - Bluetooth stack corruption

   Fix: Clear the Bluetooth cache (Settings > Apps > Bluetooth > Storage > Clear Cache), toggle Bluetooth off/on, or restart the phone. In code, use the `retries` option.

5. **iOS: device not in range after scan.** iOS scan results include cached devices that may no longer be in range. The `connectToDevice` call will hang until timeout. Always check `isConnectable` from the scan result.

---

## Android 12+ Permission Dance

Android 12 (API 31) split the old blanket Bluetooth permission into granular ones. Here's what you need and when:

| Operation | Permission Required |
|-----------|-------------------|
| Scanning | `BLUETOOTH_SCAN` |
| Connecting / reading / writing | `BLUETOOTH_CONNECT` |
| Scanning on Android 11 and below | `ACCESS_FINE_LOCATION` |

**Common mistakes:**

- **Forgetting `BLUETOOTH_CONNECT`.** You can scan and find devices, but connecting fails silently or crashes.
- **Not requesting at runtime.** Declaring permissions in `AndroidManifest.xml` is necessary but not sufficient. You must also call `PermissionsAndroid.request()` at runtime.
- **Requesting before the Activity is ready.** Permission requests need an active Activity. Don't request permissions in module constructors or static initializers.

---

## iOS Background Mode Setup

For BLE to work while your app is backgrounded on iOS:

1. **Enable the capability:** Xcode > Target > Signing & Capabilities > Background Modes > "Uses Bluetooth LE accessories"

2. **Or in Info.plist:**
   ```xml
   <key>UIBackgroundModes</key>
   <array>
     <string>bluetooth-central</string>
   </array>
   ```

3. **Scan with service UUID filters:** Background scans with `serviceUuids: null` return nothing.

4. **Use state restoration:** Pass a `restoreStateIdentifier` to `createClient()` so the system can relaunch your app for BLE events.

**Things that DON'T work in background on iOS:**
- Scanning without service UUID filters
- `allowDuplicates` is ignored in background
- Scan intervals increase significantly
- L2CAP channels do NOT wake suspended apps -- only GATT characteristic notifications do

---

## "Monitor stops receiving after backgrounding"

**Symptom:** Characteristic notifications work in the foreground but stop when the app goes to the background.

**iOS:**
- Enable the `bluetooth-central` background mode (see above)
- Make sure your subscription is on a GATT characteristic (notifications/indications), not an L2CAP channel
- The system may throttle delivery in the background. Notifications are still received but may be delivered in batches when the app returns to the foreground.

**Android:**
- You need a foreground service with `android:foregroundServiceType="connectedDevice"` to maintain BLE connections in the background
- Without a foreground service, Android 12+ restricts BLE operations when the app is backgrounded
- The Expo config plugin's `isBackgroundEnabled` flag adds the necessary hardware feature declaration, but you still need to implement the foreground service yourself

---

## Metro Bundler + Physical Device Setup

**"Unable to load script" / blank white screen on device:**

The Metro bundler needs to be reachable from your physical device.

**Android:**

```bash
# Forward Metro's port over USB
adb reverse tcp:8081 tcp:8081
npx react-native start
```

**iOS:**

Metro should work over the local network if your Mac and iPhone are on the same Wi-Fi. If it doesn't:
1. Make sure your Mac's firewall isn't blocking port 8081
2. In Xcode, check the IP address in your build configuration
3. As a last resort, set `BUNDLE_URL` manually

---

## Debugging with Native Logs

When JavaScript error messages aren't enough (and they often aren't), look at the native logs.

### Android (adb logcat)

```bash
# Filter for BLE-related logs
adb logcat | grep -iE "ble|bluetooth|gatt|bleplx"

# More verbose -- includes system Bluetooth stack
adb logcat | grep -iE "bt_|bluetooth|BleManager|BlePlx"

# Common useful tags:
# BlePlxModule - TurboModule entry point
# BleManagerWrapper - Nordic BLE Library operations
# bt_btm - Android Bluetooth stack
# BluetoothGatt - GATT operations
```

### iOS (Xcode Console)

1. Connect your device and open Xcode
2. Window > Devices and Simulators > select your device > Open Console
3. Filter for: `BLE`, `CoreBluetooth`, `CBManager`, `BlePlx`

Or use the Console.app:
1. Open `/Applications/Utilities/Console.app`
2. Select your device
3. Filter by process name or search for BLE-related terms

**iOS CoreBluetooth logs are notoriously sparse.** The most useful debug tool is often adding `print()` statements to the native Swift code temporarily.

### React Native Logs

```bash
# Android
npx react-native log-android

# iOS
npx react-native log-ios
```

---

## "createClient() was not called"

**Symptom:** Error `ManagerNotInitialized` on any BLE operation.

In v4, you must call `await manager.createClient()` before any other BLE operation. Unlike v3, the constructor doesn't initialize the native client automatically.

```typescript
const manager = new BleManager();
await manager.createClient(); // Don't forget this!
```

---

## "NativeBlePlx TurboModule not found"

**Symptom:** Error on import or first use.

**Causes:**

1. **Not linked properly.** Run `cd ios && pod install` and rebuild.
2. **Using Expo Go.** This library requires native code. Use a development build (`npx expo prebuild`).
3. **Old architecture.** v4 requires React Native 0.82+ with New Architecture. The Bridge-based native modules don't work.
4. **Missing `pod install` after upgrade.** Always run `pod install` after updating the package.

---

## "Characteristic not found" After Successful Discovery

**Symptom:** `discoverAllServicesAndCharacteristics` succeeds, but `readCharacteristicForDevice` fails with `CharacteristicNotFound`.

**Causes:**

1. **Wrong UUID.** BLE UUIDs are case-insensitive but format-sensitive. The standard Bluetooth SIG services use short UUIDs (`180a`) which expand to `0000180a-0000-1000-8000-00805f9b34fb`. Custom services use the full 128-bit form. Double-check your UUIDs against the peripheral's documentation or nRF Connect.

2. **Service/characteristic requires encryption.** Some characteristics are hidden until the connection is encrypted (bonded). Connect, bond, then re-discover.

3. **Discovery timed out silently.** If the peripheral has many services, discovery can take several seconds. Make sure you `await` the discovery promise.

---

## Android-Specific Issues

### GATT Error 133

The most common and least helpful Android BLE error. It means "something went wrong at the GATT level." Possible causes include:
- Bluetooth cache corruption
- Too many connections
- Hardware-specific firmware bugs
- Solar flares (not really, but it feels that way)

Fixes:
- Toggle Bluetooth off and on
- Clear Bluetooth cache (Settings > Apps > Show system > Bluetooth > Clear Cache)
- Use `retries` in `connectToDevice`
- Restart the phone (nuclear option)

### "App was not granted BLUETOOTH_SCAN permission"

On Android 12+, you need runtime `BLUETOOTH_SCAN` permission before scanning. This is in addition to the manifest declaration. See the [Getting Started guide](GETTING_STARTED.md#runtime-permissions) for the full permission request flow.

### Scan Results Empty After Multiple Start/Stop Cycles

Android throttles scan starts. After ~5 start/stop cycles in 30 seconds, the system silently returns zero results. Wait 30 seconds or don't cycle scans rapidly.

---

## iOS-Specific Issues

### "Bluetooth permission denied" But User Was Never Asked

This happens when `NSBluetoothAlwaysUsageDescription` is missing from `Info.plist`. iOS requires this key -- without it, the system denies Bluetooth access without showing a prompt.

### State Shows "Unauthorized"

The user denied the Bluetooth permission prompt, or it was denied via Settings > Privacy > Bluetooth. Direct the user to Settings to re-enable it. You cannot programmatically request the permission again after it's been denied.

### "CBATTError Domain=6" (Offset / Request Not Supported)

The characteristic doesn't support the operation you're trying. Check `isReadable`, `isWritableWithResponse`, `isWritableWithoutResponse` on the `CharacteristicInfo` before attempting the operation.
