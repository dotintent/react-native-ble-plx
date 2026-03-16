# Plan A: TurboModule Infrastructure + JS/TS API

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the TurboModule Codegen spec, TypeScript API layer, event batching, and error model for react-native-ble-plx v4.0.

**Architecture:** Codegen spec (`NativeBlePlx.ts`) defines the JS↔Native contract with typed EventEmitters. `BleManager.ts` wraps the native module with a developer-friendly API. `EventBatcher.ts` handles notification backpressure. All types use `as const` objects (not enums).

**Tech Stack:** TypeScript, React Native 0.82+ TurboModule Codegen, Jest

**Spec:** `docs/specs/2026-03-15-v4-turbomodule-rewrite.md`

---

## File Structure

```
src/
├── specs/
│   └── NativeBlePlx.ts          ← Codegen spec (THE contract)
├── BleManager.ts                ← Public API class
├── Device.ts                    ← Device wrapper
├── Characteristic.ts            ← Characteristic wrapper
├── Service.ts                   ← Service wrapper
├── Descriptor.ts                ← Descriptor wrapper
├── BleError.ts                  ← Unified error model + error codes
├── types.ts                     ← Public TypeScript types (const objects)
├── EventBatcher.ts              ← Notification backpressure
├── index.ts                     ← Public exports
__tests__/
├── BleManager.test.ts
├── EventBatcher.test.ts
├── BleError.test.ts
├── protocol.test.ts             ← Binary parsing tests
```

---

## Chunk 1: Codegen Spec + Types + Error Model

### Task 1: Codegen spec file

**Files:**
- Create: `src/specs/NativeBlePlx.ts`

- [ ] **Step 1: Create the Codegen spec with all typed interfaces and EventEmitters**

This is the most important file — it generates the native bindings. All types MUST be inline. Copy the complete spec from the design doc Section 5a. Include:
- All `Readonly<{}>` type aliases (DeviceInfo, CharacteristicInfo, ScanResult, etc.)
- All method signatures with typed parameters (no `Object` escape hatches)
- All `readonly onXxx: CodegenTypes.EventEmitter<T>` declarations
- `TurboModuleRegistry.get<Spec>('NativeBlePlx')` (nullable, not getEnforcing)

- [ ] **Step 2: Add codegenConfig to package.json**

```json
{
  "codegenConfig": {
    "name": "NativeBlePlxSpec",
    "type": "modules",
    "jsSrcsDir": "src/specs",
    "android": {
      "javaPackageName": "com.bleplx"
    }
  }
}
```

- [ ] **Step 3: Verify Codegen parses the spec via build smoke test**

Codegen runs automatically during platform builds — there is no standalone CLI command. Verify by running:

```bash
# Android: Gradle will invoke Codegen
cd example && cd android && ./gradlew generateCodegenArtifactsFromSchema

# iOS: pod install invokes Codegen
cd example && cd ios && pod install
```

Expected: native headers generated in build output without Codegen parse errors.

- [ ] **Step 4: Commit**

```bash
git add src/specs/NativeBlePlx.ts package.json
git commit -m "feat: TurboModule Codegen spec with typed EventEmitters"
```

---

### Task 2: TypeScript types and error model

**Files:**
- Create: `src/types.ts`
- Create: `src/BleError.ts`

- [ ] **Step 1: Create types.ts with const objects (not enums)**

```typescript
// src/types.ts — Public types using const objects with as const

export const State = {
  Unknown: 'Unknown',
  Resetting: 'Resetting',
  Unsupported: 'Unsupported',
  Unauthorized: 'Unauthorized',
  PoweredOff: 'PoweredOff',
  PoweredOn: 'PoweredOn',
} as const;
export type State = typeof State[keyof typeof State];

export const LogLevel = {
  None: 'None',
  Verbose: 'Verbose',
  Debug: 'Debug',
  Info: 'Info',
  Warning: 'Warning',
  Error: 'Error',
} as const;
export type LogLevel = typeof LogLevel[keyof typeof LogLevel];

export const ConnectionPriority = {
  Balanced: 0,
  High: 1,
  LowPower: 2,
} as const;
export type ConnectionPriority = typeof ConnectionPriority[keyof typeof ConnectionPriority];

export const ConnectionState = {
  Disconnected: 'disconnected',
  Connecting: 'connecting',
  Connected: 'connected',
  Disconnecting: 'disconnecting',
} as const;
export type ConnectionState = typeof ConnectionState[keyof typeof ConnectionState];

export interface ScanOptions {
  scanMode?: number;
  callbackType?: number;
  legacyScan?: boolean;
  allowDuplicates?: boolean;
}

export interface ConnectOptions {
  autoConnect?: boolean;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  requestMtu?: number;
}
```

- [ ] **Step 2: Create BleError.ts with unified error codes**

```typescript
// src/BleError.ts — Unified cross-platform error model

export const BleErrorCode = {
  DeviceNotFound: 0,
  DeviceDisconnected: 1,
  ConnectionFailed: 2,
  ConnectionTimeout: 3,
  OperationCancelled: 100,
  OperationTimeout: 101,
  OperationNotSupported: 102,
  OperationInProgress: 103,
  CharacteristicNotFound: 200,
  ServiceNotFound: 201,
  DescriptorNotFound: 202,
  CharacteristicWriteFailed: 203,
  CharacteristicReadFailed: 204,
  MTUNegotiationFailed: 205,
  BluetoothUnauthorized: 300,
  BluetoothPoweredOff: 301,
  LocationPermissionDenied: 302,
  ScanPermissionDenied: 303,
  ConnectPermissionDenied: 304,
  ManagerNotInitialized: 400,
  ManagerDestroyed: 401,
  BondingFailed: 500,
  BondLost: 501,
  PairingRejected: 502,
  L2CAPChannelFailed: 600,
  L2CAPChannelClosed: 601,
  PhyNegotiationFailed: 700,
  ScanFailed: 800,
  ScanThrottled: 801,
  UnknownError: 999,
} as const;
export type BleErrorCode = typeof BleErrorCode[keyof typeof BleErrorCode];

export class BleError extends Error {
  readonly code: BleErrorCode;
  readonly isRetryable: boolean;
  readonly deviceId?: string;
  readonly serviceUUID?: string;
  readonly characteristicUUID?: string;
  readonly operation?: string;
  readonly platform: 'android' | 'ios';
  readonly nativeDomain?: string;
  readonly nativeCode?: number;
  readonly gattStatus?: number;
  readonly attErrorCode?: number;

  constructor(errorInfo: {
    code: number;
    message: string;
    isRetryable: boolean;
    platform: string;
    deviceId?: string | null;
    serviceUuid?: string | null;
    characteristicUuid?: string | null;
    operation?: string | null;
    nativeDomain?: string | null;
    nativeCode?: number | null;
    gattStatus?: number | null;
    attErrorCode?: number | null;
  }) {
    super(errorInfo.message);
    this.name = 'BleError';
    this.code = errorInfo.code as BleErrorCode;
    this.isRetryable = errorInfo.isRetryable;
    this.platform = errorInfo.platform as 'android' | 'ios';
    this.deviceId = errorInfo.deviceId ?? undefined;
    this.serviceUUID = errorInfo.serviceUuid ?? undefined;
    this.characteristicUUID = errorInfo.characteristicUuid ?? undefined;
    this.operation = errorInfo.operation ?? undefined;
    this.nativeDomain = errorInfo.nativeDomain ?? undefined;
    this.nativeCode = errorInfo.nativeCode ?? undefined;
    this.gattStatus = errorInfo.gattStatus ?? undefined;
    this.attErrorCode = errorInfo.attErrorCode ?? undefined;
  }
}
```

- [ ] **Step 3: Write tests for BleError**

```typescript
// __tests__/BleError.test.ts
import { BleError, BleErrorCode } from '../src/BleError';

test('BleError constructs with all fields', () => {
  const err = new BleError({
    code: BleErrorCode.ConnectionFailed,
    message: 'GATT error 133',
    isRetryable: true,
    platform: 'android',
    gattStatus: 133,
    deviceId: 'AA:BB:CC:DD:EE:FF',
    operation: 'connect',
    nativeDomain: null, nativeCode: null,
    serviceUuid: null, characteristicUuid: null, attErrorCode: null,
  });
  expect(err.code).toBe(BleErrorCode.ConnectionFailed);
  expect(err.isRetryable).toBe(true);
  expect(err.gattStatus).toBe(133);
  expect(err.deviceId).toBe('AA:BB:CC:DD:EE:FF');
  expect(err instanceof Error).toBe(true);
});

test('BleErrorCode values are correct', () => {
  expect(BleErrorCode.DeviceNotFound).toBe(0);
  expect(BleErrorCode.ManagerNotInitialized).toBe(400);
  expect(BleErrorCode.UnknownError).toBe(999);
});
```

- [ ] **Step 4: Run tests**

```bash
npx jest __tests__/BleError.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/BleError.ts __tests__/BleError.test.ts
git commit -m "feat: TypeScript types (const objects) and unified error model"
```

---

### Task 3: Event batcher

**Files:**
- Create: `src/EventBatcher.ts`
- Create: `__tests__/EventBatcher.test.ts`

- [ ] **Step 1: Write failing tests for EventBatcher**

```typescript
// __tests__/EventBatcher.test.ts
import { EventBatcher } from '../src/EventBatcher';

test('immediate mode delivers events without delay', () => {
  const received: number[] = [];
  const batcher = new EventBatcher<number>(0, 50, (batch) => {
    received.push(...batch);
  });
  batcher.push(1);
  batcher.push(2);
  expect(received).toEqual([1, 2]);
  batcher.dispose();
});

test('batched mode collects events and delivers on interval', (done) => {
  const received: number[][] = [];
  const batcher = new EventBatcher<number>(50, 50, (batch) => {
    received.push([...batch]);
    if (received.length === 1) {
      expect(received[0]).toEqual([1, 2, 3]);
      batcher.dispose();
      done();
    }
  });
  batcher.push(1);
  batcher.push(2);
  batcher.push(3);
  // Events should not be delivered yet
  expect(received).toEqual([]);
});

test('max batch size caps delivery', (done) => {
  const received: number[][] = [];
  const batcher = new EventBatcher<number>(50, 3, (batch) => {
    received.push([...batch]);
    if (received.length === 1) {
      expect(received[0].length).toBeLessThanOrEqual(3);
      batcher.dispose();
      done();
    }
  });
  for (let i = 0; i < 10; i++) batcher.push(i);
});
```

- [ ] **Step 2: Implement EventBatcher**

```typescript
// src/EventBatcher.ts
export class EventBatcher<T> {
  private buffer: T[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private disposed = false;

  constructor(
    private intervalMs: number,
    private maxBatchSize: number,
    private onBatch: (events: T[]) => void,
  ) {
    if (intervalMs > 0) {
      this.timer = setInterval(() => this.flush(), intervalMs);
    }
  }

  push(event: T): void {
    if (this.disposed) return;
    if (this.intervalMs === 0) {
      this.onBatch([event]);
      return;
    }
    this.buffer.push(event);
    if (this.buffer.length >= this.maxBatchSize) {
      this.flush();
    }
  }

  flush(): void {
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0, this.maxBatchSize);
    this.onBatch(batch);
  }

  dispose(): void {
    this.disposed = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.flush();
  }
}
```

- [ ] **Step 3: Run tests**

```bash
npx jest __tests__/EventBatcher.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/EventBatcher.ts __tests__/EventBatcher.test.ts
git commit -m "feat: EventBatcher with configurable interval, max batch size, and immediate mode"
```

---

## Chunk 2: BleManager API + Device/Characteristic Wrappers

### Task 4: BleManager class

**Files:**
- Create: `src/BleManager.ts`

- [ ] **Step 1: Create BleManager wrapping the native module**

The BleManager class:
- Gets the native module via `TurboModuleRegistry.get`
- Wraps every native method with proper TypeScript types
- Converts native error events into `BleError` instances
- Manages scan/monitor subscriptions with proper cleanup
- Creates `EventBatcher` instances per-characteristic for notification batching
- Provides `startDeviceScan()` with callback pattern (wraps EventEmitter internally)
- Provides `monitorCharacteristicForDevice()` returning a `Subscription` with working `.remove()`
- Handles `transactionId` generation for cancellation

Key methods: `createClient`, `destroyClient`, `state`, `startDeviceScan`, `stopDeviceScan`, `connectToDevice`, `cancelDeviceConnection`, `discoverAllServicesAndCharacteristics`, `readCharacteristicForDevice`, `writeCharacteristicForDevice`, `monitorCharacteristicForDevice`, `requestMTUForDevice`, `requestConnectionPriority`, `cancelTransaction`, `onDeviceDisconnected`, `onStateChange`

- [ ] **Step 2: Commit**

```bash
git add src/BleManager.ts
git commit -m "feat: BleManager API wrapping TurboModule with subscription management"
```

---

### Task 5: Device, Service, Characteristic, Descriptor wrappers

**Files:**
- Create: `src/Device.ts`
- Create: `src/Service.ts`
- Create: `src/Characteristic.ts`
- Create: `src/Descriptor.ts`

- [ ] **Step 1: Create wrapper classes**

Each class wraps the native data and provides convenience methods that delegate back to BleManager. Device has `connect()`, `discoverAllServicesAndCharacteristics()`, `services()`, etc. Characteristic has `read()`, `write()`, `monitor()`.

- [ ] **Step 2: Create index.ts exporting all public API**

```typescript
// src/index.ts
export { BleManager } from './BleManager';
export { Device } from './Device';
export { Service } from './Service';
export { Characteristic } from './Characteristic';
export { Descriptor } from './Descriptor';
export { BleError, BleErrorCode } from './BleError';
export { State, LogLevel, ConnectionPriority, ConnectionState } from './types';
export type { ScanOptions, ConnectOptions } from './types';
```

- [ ] **Step 3: Commit**

```bash
git add src/Device.ts src/Service.ts src/Characteristic.ts src/Descriptor.ts src/index.ts
git commit -m "feat: Device/Service/Characteristic/Descriptor wrappers and public exports"
```

---

### Task 6: BleManager unit tests

**Files:**
- Create: `__tests__/BleManager.test.ts`

- [ ] **Step 1: Write tests with mocked native module**

Test: scan starts/stops correctly, subscription cleanup works, monitor `.remove()` cleans up both native and JS listener, error events become `BleError` instances, `transactionId` generation and cancellation.

- [ ] **Step 2: Run tests**

```bash
npx jest __tests__/BleManager.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add __tests__/BleManager.test.ts
git commit -m "test: BleManager unit tests with mocked native module"
```

---

### Task 7: Update Expo config plugin

**Files:**
- Modify: `plugin/src/withBLEAndroidManifest.ts`
- Modify: `plugin/src/withBluetoothPermissions.ts`

- [ ] **Step 1: Update Android manifest for namespace mode**

Fix the empty `AndroidManifestNew.xml` issue. Ensure BLE permissions are declared correctly regardless of AGP version. Add `neverForLocation` flag handling.

- [ ] **Step 2: Commit**

```bash
git add plugin/
git commit -m "fix: Expo plugin — proper manifest for AGP namespace mode, neverForLocation flag"
```

---

### Task 8: Package.json and build config updates

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`

- [ ] **Step 1: Update dependencies**

- Remove `@types/react-native` (deprecated since RN 0.71)
- Update peer dependencies to `react-native >= 0.82`
- Update ESLint toolchain
- Add `codegenConfig`
- Remove `includesGeneratedCode` if present

- [ ] **Step 2: Commit**

```bash
git add package.json tsconfig.json
git commit -m "chore: update deps, add codegenConfig, require RN 0.82+"
```
