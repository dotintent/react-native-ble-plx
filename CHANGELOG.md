# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
