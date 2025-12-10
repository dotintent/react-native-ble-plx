# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Manager

This project uses **pnpm**, not npm or yarn. All package manager commands should use `pnpm`.

## Common Commands

### Testing
- `pnpm test:package` - Run main package tests (80 tests in `__tests__/BleManager.js`)
- `pnpm test:plugin` - Run Expo config plugin tests (8 tests)
- `pnpm test` - Run all tests (package + example)
- `pnpm test:example` - Run example app tests
- `pnpm test:expo` - Test Expo example app prebuild

### Building
- `pnpm run prepack` - Build the package (uses react-native-builder-bob)
- `pnpm build:plugin` - Compile TypeScript plugin to `plugin/build/`
- `pnpm build:android` - Build example Android app
- `pnpm build:ios` - Build example iOS app

### Development
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm lint` - Run all linters (ESLint, documentation lint, typecheck)
- `pnpm lint:plugin` - Lint Expo config plugin code
- `pnpm clean` - Clean all build artifacts
- `pnpm clean:plugin` - Clean plugin build artifacts
- `pnpm bootstrap` - Install dependencies for all workspaces

### Publishing
Follow the release process documented in README.md:
1. Ensure tests pass: `pnpm test:package && pnpm test:plugin`
2. Commit changes with conventional commit messages
3. Bump version in `package.json`
4. Build: `pnpm run prepack`
5. Publish: `pnpm publish --access public --no-git-checks`
6. Tag release: `git tag vX.Y.Z && git push origin vX.Y.Z`

## Architecture Overview

### Core Components

This is a React Native Bluetooth Low Energy library with native modules for iOS (Objective-C/Swift) and Android (Java).

**JavaScript Layer** (`src/`):
- `BleManager.ts` - Main singleton manager, entry point for all BLE operations
- `Device.ts` - Represents a BLE device with connection methods
- `Service.ts` - Represents a GATT service
- `Characteristic.ts` - Represents a GATT characteristic (read/write/notify)
- `Descriptor.ts` - Represents a GATT descriptor
- `BleModule.ts` - TypeScript interfaces for native module bridge
- `BleError.ts` - Error types and codes
- `TypeDefinition.ts` - Type definitions and enums

**Native Bridge Pattern**:
- JS classes (Device, Service, Characteristic, Descriptor) wrap native objects
- Each wrapper stores a `_manager: BleManager` reference (non-enumerable via `Object.defineProperty`)
- Methods delegate to BleManager, which calls native module via `BleModule`
- All data passed as Base64 strings for characteristic/descriptor values
- **Important**: The `_manager` property is set via `Object.defineProperty` with `writable: false` (default). Do NOT add a redundant `this._manager = manager` assignment after `Object.defineProperty` as it will throw a read-only error. Use the definite assignment assertion (`_manager!: BleManager`) to satisfy TypeScript.

**Platform Differences**:
- Monitor methods have different signatures on iOS vs Android
- Android supports `subscriptionType` parameter, iOS does not
- Use explicit conditional calls for TypeScript compatibility:
  ```ts
  if (isIOS) {
    return this._manager._monitorCharacteristic(this.id, listener, transactionId ?? undefined)
  }
  return this._manager._monitorCharacteristic(this.id, listener, transactionId ?? undefined, subscriptionType)
  ```
- **Note**: Avoid array spread patterns (`...args`) for platform-specific arguments as TypeScript cannot verify spread arrays against function signatures (TS2556 error)

### Expo Config Plugin (`plugin/`)

The plugin configures native projects for Expo managed workflow:
- `withBLE.ts` - Main plugin orchestrator
- `withBLEAndroidManifest.ts` - Adds Android permissions
- `withBluetoothPermissions.ts` - Adds iOS permissions to Info.plist
- `withBLEBackgroundModes.ts` - Configures iOS background modes
- `withBLERestorationPodfile.ts` - Adds optional iOS BLE state restoration subspec

**Important**: The Podfile plugin strips npm scope from package name (e.g., `@sfourdrinier/react-native-ble-plx` → `react-native-ble-plx`) when generating CocoaPods pod references.

### iOS State Restoration (Optional Feature)

When `iosEnableRestoration: true` in plugin config:
- Plugin adds `react-native-ble-plx/Restoration` subspec to Podfile
- Writes `BlePlxRestoreIdentifier` to Info.plist
- Swift adapter (`BlePlxRestorationAdapter.swift`) registers with host app's restoration registry
- JS must pass same identifier to `BleManager` constructor's `restoreStateIdentifier` option

### Testing Strategy

**Test Infrastructure**:
- Jest with mocked `BleModule` native module
- Mock helpers create realistic native objects: `createMockDevice()`, `createMockService()`, etc.
- Singleton reset: `BleManager.sharedInstance = null` in `beforeEach()`
- All tests must return proper mock objects (not `undefined`) due to TypeScript strict checks

**Defensive Programming**:
- All constructors validate input: `if (!nativeDevice) throw new Error(...)`
- This prevents TypeScript crashes when mocks return undefined
- TypeScript is stricter than Flow: `this.id = nativeDevice.id` throws if `nativeDevice` is undefined

**Platform-Specific Tests**:
- Monitor tests verify iOS doesn't receive `subscriptionType` parameter
- Use spread operator pattern to avoid passing extra args on iOS

## Key Technical Details

### Dependencies
- React 19.1.1
- React Native 0.81.4
- Expo 54
- @expo/config-plugins 54.0.0
- TypeScript 5.2.2

### Node Compatibility
- Requires Node >= 18.0.0

### Package Structure
- Main package: `@sfourdrinier/react-native-ble-plx` (scoped npm package)
- TypeScript source in `src/`, compiled output in `lib/`
- Native code in `android/` (Java) and `ios/` (Objective-C/Swift)
- Config plugin in `plugin/` (TypeScript, compiled to `plugin/build/`)
- Example apps in `example/` (bare RN) and `example-expo/` (Expo)

### Commit Conventions
- `fix:` - Bug fixes (patch version bump)
- `feat:` - New features (minor version bump)
- `chore:` - Maintenance tasks
- `docs:` - Documentation updates

### Important Notes
- This is a **forked** repo from `dotintent/react-native-ble-plx`
- Upstream repo is stale (last update Feb 2025), this fork is actively maintained
- When making changes, ensure both iOS and Android platforms are considered
- Always test on both platforms when modifying monitor/subscription logic
