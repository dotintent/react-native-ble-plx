# react-native-ble-plx Code Audit

**Date:** 2026-03-15
**Version audited:** 3.5.1 (commit `92a496d`)
**Fork:** github.com/iotashan/react-native-ble-plx
**Reviewed by:** Claude Opus 4 + OpenAI Codex (5 parallel review agents)

---

## Executive Summary

react-native-ble-plx is the most popular React Native BLE library, but it has significant issues:

- **Thread safety bugs** on both iOS and Android that can cause crashes
- **Broken `enable()` on Android 12+** — always fails due to Activity cast
- **Monitor subscription cleanup is broken** in the JS layer — causes the #1 reported issue
- **No New Architecture (TurboModules/Fabric) support** — critical for RN 0.77+
- **No modern BLE features** — no BLE 5.0 PHY, no L2CAP, no extended advertising
- **Stale dependencies and documentation**

The library works for basic BLE use cases but has real concurrency bugs and hasn't kept up with platform evolution.

---

## Maintenance Status

| Metric | Value |
|--------|-------|
| Current version | 3.5.1 (2026-02-17) |
| Last commit | ~1 month ago |
| React Native tested | 0.77.0 |
| New Architecture | NOT supported |
| iOS minimum | 11.0 (podspec) |
| Android minSdk | 24 (Android 7.0) |
| Android targetSdk | 34 (Android 14) |
| Open issues | 27 |

**Verdict:** Moderately maintained — bug fixes arrive but docs are stale, no New Arch support, no modern BLE features.

---

## Critical Issues

### 1. Thread-unsafe shared mutable state (iOS + Android)

**Both platforms** use plain dictionaries/HashMaps for BLE state (`connectedDevices`, `discoveredServices`, `discoveredCharacteristics`, etc.) accessed from multiple threads without synchronization.

- **Android:** `HashMap` fields in `BleModule.java:68-72` accessed from RxJava callbacks (IO/computation threads) and React Native method thread
- **iOS:** Mutable dictionaries in `BleModule.swift` accessed from RxSwift callbacks and the method queue

**Impact:** `ConcurrentModificationException` (Android) or crash on concurrent dictionary access (iOS). Intermittent, hard to reproduce.

**Fix:** Use `ConcurrentHashMap` (Android) or `DispatchQueue`-synchronized access (iOS).

### 2. `SafePromise` not thread-safe (iOS)

The `finished` flag in `SafePromise.swift` is a plain `Bool` with no synchronization. If `resolve` and `reject` race on different threads, the promise can be resolved/rejected twice, crashing React Native.

### 3. Monitor subscription cleanup broken (JS)

In `BleManager.js:_handleMonitorCharacteristic`, the returned subscription's `remove()` only cancels the native transaction — it does NOT remove the JS event listener. This causes:
- Duplicate callbacks on subsequent monitors (issue #1308)
- "Stuck" monitors that never clean up (issue #1299)

**This is the #1 most-reported class of bugs.**

### 4. `enable()` broken on Android 12+ (API 31+)

`BleModule.java:1116` attempts to cast `ReactApplicationContext` to `Activity` for `ACTION_REQUEST_ENABLE`, which always fails. On API 33+, `bluetoothAdapter.enable()` throws `SecurityException`.

**Confirmed by both Claude and Codex reviews.**

### 5. Empty `AndroidManifestNew.xml` loses permissions

When using AGP 7.3+ namespace mode, `AndroidManifestNew.xml` (empty) is used instead of the full `AndroidManifest.xml`. All BLE permissions are silently lost.

---

## High Issues

### 6. Scan listener leak (JS)

`startDeviceScan` in `BleManager.js:369` creates a new `_scanEventSubscription` without calling `.remove()` on the previous one. Calling `startDeviceScan` twice in succession leaks the old listener.

### 7. Memory leak: disconnection monitor subscriptions discarded (iOS)

In `BleModule.swift`, disconnection monitoring subscriptions are created with `_ =` (discarded). If `invalidate()` is called before disconnection, these leak and can fire on deallocated objects.

### 8. `getState()` crashes without `BLUETOOTH_CONNECT` permission (Android)

`bluetoothAdapter.getState()` at `BleModule.java:185` requires `BLUETOOTH_CONNECT` on API 31+ but has no runtime permission check.

### 9. Hardcoded MTU of 23 during scanning (iOS)

`BleExtensions.swift` returns `mtu = 23` for scanned (not connected) peripherals. Modern BLE devices negotiate much larger MTUs.

### 10. `requestConnectionPriority` is a no-op on iOS

Silently succeeds without doing anything or informing the caller. On Android, the 1ms delay parameter is too short to confirm the priority was applied.

### 11. State restoration race condition (iOS)

`.amb()` between state change and restoration events can cause restored peripherals to be silently lost if BLE state changes first during app launch.

---

## Medium Issues

### 12. `_callPromise` creates never-settled promises (JS)

Every API call creates a `destroyPromise` that is never resolved or rejected — just abandoned. Under heavy use this causes memory pressure.

### 13. `connectToDevice` silently disconnects on Android

If the device is already connected, the Android path silently disconnects and reconnects. This is surprising and creates race conditions.

### 14. TypeScript types are wrong

- `State`, `LogLevel`, etc. are declared as `enum` in `.d.ts` but are plain objects in JS
- `BleErrorCodeMessage` not exported
- `onDeviceDisconnected` listener has wrong nullable types

### 15. `disable()` crashes on Android API 33+

`bluetoothAdapter.disable()` throws `SecurityException` on API 33+. Called unconditionally.

### 16. JSON error serialization doesn't escape strings (iOS)

`BleError.toJS` builds JSON by string interpolation without escaping. Strings with quotes or backslashes produce malformed JSON.

### 17. Static `IdGenerator` causes cross-instance contamination (Android)

Static mutable state shared across instances. `clear()` in `destroyClient()` invalidates IDs still in use by another instance.

### 18. `RxJavaPlugins.setErrorHandler` set globally (Android)

Global JVM-wide setting that overwrites any other library's error handler.

### 21. Disconnection event always sends null error (Android)

`BlePlxModule.java:413` sends `DisconnectionEvent` with `null` error for both normal and abnormal disconnects. GATT error codes (e.g., GATT 133) go to `onErrorCallback` (which rejects the connect promise) but never to the disconnect event listener. Users calling `onDeviceDisconnected` can't distinguish clean disconnects from error-triggered ones.

### 22. Strong delegate ownership causes lifecycle leak (iOS)

`BlePlx.m` strongly retains `BleClientManager`, and the delegate is also `strong` — never nilled before teardown. Can cause late callbacks after invalidation.

### 23. `createClient` not defensive against re-entry (iOS)

Calling `createClient` twice overwrites `_manager` without invalidating the previous instance. The old adapter keeps running and emitting callbacks.

### 24. Missing nil guards on `_manager` hang JS promises (iOS)

After `destroyClient` sets `_manager = nil`, subsequent method calls message nil. ObjC nil-messaging silently does nothing, so `resolve`/`reject` never fires — JS promises hang forever.

### 25. `invalidate` doesn't call `[super invalidate]` (iOS)

`BlePlx.m:68` overrides `invalidate` without calling super. `RCTEventEmitter` base class cleanup (listener count reset, etc.) is skipped.

---

## Final Tally

**25 issues total** found by 5 independent review agents (3 Claude + 2 Codex):
- **5 critical** (thread safety x2, monitor cleanup, enable() broken, empty manifest)
- **8 high** (scan leak, memory leak, permission crash, MTU, lifecycle leaks, re-entry, nil guards, state restoration)
- **9 medium** (promise leaks, wrong types, JSON injection, static contamination, disconnect errors, etc.)
- **3 low** (naming inconsistency, deprecated getValue(), ID precision)

`BlePlxModule.java:413` sends `DisconnectionEvent` with `null` error for both normal and abnormal disconnects. GATT error codes (e.g., GATT 133) go to `onErrorCallback` (which rejects the connect promise) but never to the disconnect event listener. Users calling `onDeviceDisconnected` can't distinguish clean disconnects from error-triggered ones.

### 19. Promise double-resolution via `onDisposed` (iOS)

Every Rx subscription has both completion handlers and `onDisposed` that tries to reject with "cancelled." Relies on fragile `SafePromise` flag (which itself is not thread-safe — see #2).

### 20. `RestoredState.scanOptions` reads wrong key (iOS)

Copy-paste bug: reads `CBCentralManagerRestoredStatePeripheralsKey` instead of `CBCentralManagerRestoredStateScanOptionsKey`.

---

## Missing Modern BLE Features

| Feature | iOS | Android |
|---------|-----|---------|
| BLE 5.0 PHY (2M, Coded) | No | No |
| Extended Advertising | No | Partial (legacyScan flag) |
| L2CAP Channels | Delegate exists but dead code | No |
| Connection Events (iOS 13+) | No | N/A |
| LE Audio / LC3 | No | No |
| Companion Device Manager | N/A | No |
| iOS 16+ disconnect with reconnection | No | N/A |
| New Architecture (TurboModules) | No | No |

---

## Fixable GitHub Issues

| Issue | Title | Root Cause | Fix Location |
|-------|-------|-----------|-------------|
| #1308 | Duplicate monitor responses | JS subscription cleanup bug | `BleManager.js:_handleMonitorCharacteristic` |
| #1299 | Monitor callback stuck | Same as #1308 | Same |
| #1279 | Device not showing after disconnect | Scan listener leak | `BleManager.js:startDeviceScan` |
| #1267 | `enable()` deprecated API 33 | Missing deprecation warning | `BleManager.js:enable()` |
| #852 | Ensuring subscription ready | No ready callback | `BleManager.js:_handleMonitorCharacteristic` |
| #1160 | onDisconnected never reporting error | JS event filtering | `BleManager.js:onDeviceDisconnected` |

---

## Strategic Recommendations

1. **Fix the monitor subscription cleanup** — addresses the top class of reported bugs
2. **Fix thread safety** on both platforms — use synchronized collections
3. **Add New Architecture support** — RN 0.77 defaults to New Arch; this is the biggest strategic gap
4. **Fix `enable()` on Android 12+** — or remove it and document the alternative
5. **Fix the empty manifest** for AGP namespace mode
6. **Update dependencies** — remove `@types/react-native`, upgrade RxAndroidBle to v3, update vendored RxSwift
7. **Add BLE 5.0 features** — PHY selection, extended advertising
8. **Fix TypeScript types** — enums vs const objects, missing exports
