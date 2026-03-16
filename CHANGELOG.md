# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [4.0.0-alpha.0] - 2026-03-16

### Changed

- Complete rewrite as a TurboModule for React Native New Architecture (0.82+)
- Android native layer rewritten in Kotlin using Nordic Android-BLE-Library
- iOS native layer rewritten in Swift with actor-based CoreBluetooth wrapper
- `State`, `ConnectionPriority`, `ConnectionState`, `LogLevel` changed from TypeScript enums to `as const` objects
- `BleManager` constructor no longer auto-initializes — `createClient()` must be called explicitly
- `BleManager` is no longer a silent singleton — each instance is independent
- Monitor subscription `.remove()` now properly cleans up both native and JS listeners
- All values remain Base64-encoded (same as v3)
- Minimum React Native version raised to 0.82.0
- Minimum iOS version raised to 15
- Minimum Android API raised to 23

### Added

- TurboModule with Codegen typed events (no manual NativeEventEmitter setup)
- `requestPhy()` and `readPhy()` for BLE 5.0 PHY selection (Android)
- `openL2CAPChannel()`, `writeL2CAPChannel()`, `closeL2CAPChannel()` for L2CAP streams (iOS)
- `requestConnectionPriority()` for Android connection priority hints
- `getAuthorizationStatus()` for iOS Bluetooth authorization state
- `onConnectionEvent()` for iOS 13+ connection events
- `onBondStateChange()` for Android bond state monitoring
- `onRestoreState()` for iOS background state restoration
- Connection retry with `retries` and `retryDelay` options in `connectToDevice()`
- Auto-MTU 517 negotiation on Android connect
- Event batching for scan results and characteristic notifications
- `BleError` unified cross-platform error model with rich diagnostic fields
- `MonitorOptions` with `batchInterval` and `subscriptionType` parameters
- `BleManagerOptions` with `scanBatchIntervalMs` constructor option
- Complete documentation rewrite: README, Getting Started, API Reference, Migration Guide, Troubleshooting, E2E Testing Guide

### Removed

- `enable()` and `disable()` (broken on Android 12+, no-op on iOS)
- `setLogLevel()` (not exposed in TurboModule interface)
- Bridge-based native modules (New Architecture only)
- Support for React Native < 0.82

### Fixed

- All 25 issues from the v3 code audit
- Thread-unsafe shared state on both platforms
- Monitor subscription cleanup leak (#1308, #1299)
- Hardcoded MTU 23 on iOS for scanned devices
- State restoration race condition on iOS
- Never-settled promises (every operation now has a timeout)
- Android disconnection always reporting null error
- Promise double-resolution on iOS

## [3.5.1] - 2026-02-17

### Changed

- Update README.md ([#1320](https://github.com/dotintent/react-native-ble-plx/pull/1320))

### Fixed

- Guard to avoid `Service.getDeviceID()` null object reference and `cleanServicesAndCharacteristicsForDevice` out-of-bounds crashes ([#1290](https://github.com/dotintent/react-native-ble-plx/pull/1290))
- Prevent Android `Promise.reject` crash with null arguments ([#1329](https://github.com/dotintent/react-native-ble-plx/pull/1329))

## [3.5.0] - 2025-02-07

### Changed

- upgraded react native to 0.77.0
- added `subscriptionType` param to monitor characteristic methods ( [#1266](https://github.com/dotintent/react-native-ble-plx/issues/1266))

### Fixed

- return `serviceUUIDs` from `discoverAllServicesAndCharacteristicsForDevice` ([#1150](https://github.com/dotintent/react-native-ble-plx/issues/1150))

## [3.4.0] - 2024-12-20

### Changed

- internal `_manager` property isn't enumerable anymore. This change will hide it from the `console.log`, `JSON.stringify` and other similar methods.
- `BleManager` is now a singleton. It will be created only once and reused across the app. This change will allow users to declare instance in React tree (hooks and components). This change should not affect the existing codebase, where `BleManager` is created once and used across the app.

### Fixed

- Timeout parameter in connect method on Android causing the connection to be closed after the timeout period even if connection was established.
- Missing `serviceUUIDs` data after `discoverAllServicesAndCharacteristics` method call

## [3.2.1] - 2024-07-9

### Changed

- reverted methods from arrow functions to regular functions to avoid issues with `this` context
- improved react native fast refresh support on android

### Fixed

- Example app xcode node path issue

## [3.2.0] - 2024-05-31

### Added

- Android Instance will be checked before calling its method, an error will be visible on the RN side
- Added information related to Android 14 to the documentation.

### Changed

- Changed destroyClient, cancelTransaction, setLogLevel, startDeviceScan, stopDeviceScan calls to promises to allow error reporting if it occurs.

### Fixed

- Fixed one of the functions calls that clean up the BLE instance after it is destroyed.

## [3.1.2] - 2023-10-26

### Added

- The rawScanRecord has been added to advertising data

### Fixed

- The onDisconnected event is nowDispatched
- The missing advertising data fields on iOS has been added

## [3.1.1] - 2023-10-26

### Fixed

- Expo config plugin for prebuilding

## [3.1.0] - 2023-10-17

### Added

- Handling Bluetooth 5 Advertising Extensions on Android by legacyScan flag
- isConnectable flag for android devices
- Expo config plugin for prebuilding

### Changed

- Android permissions section in docs and readme
- Merged MultiPlatformBleAdapter (https://github.com/dotintent/MultiPlatformBleAdapter) with react-native-ble-plx repo

### Fixed

- Application crash when multiple listeners were set to watch the disconnect action and the device was disconnected
- Handling wrong Bluetooth Address error on Android

## [3.0.0] - 2023-09-28

### Added

- Example project

### Changed

- Updated MultiplatformBleAdapter to version 0.2.0.
- Updated RN bridge config
- Changed CI flow
- Updated CI to RN 0.72.x
- Updated docs
- Updated dependencies

### Fixed

- iOS 16 bugs
