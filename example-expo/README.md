# BLE PLX Expo Example

Expo SDK 55 example app for `react-native-ble-plx` v4. Uses expo-router for file-based navigation and expo-dev-client for native BLE access.

## Prerequisites

- Node >= 20
- Physical device (BLE does not work in simulators/emulators)
- Xcode 26+ (iOS) or Android Studio (Android)

## Setup

```bash
yarn install
```

## Running

### iOS

```bash
npx expo run:ios --device
```

### Android

```bash
npx expo run:android --device
```

## Notes

- This app does **not** work with Expo Go. It requires a development build (`expo-dev-client`) because BLE needs native modules.
- BLE permissions are configured automatically by the `react-native-ble-plx` config plugin in `app.config.ts`.
- The app links to the parent `react-native-ble-plx` package via `file:../` for local development.
