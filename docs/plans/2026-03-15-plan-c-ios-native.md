# Plan C: iOS Native — Swift TurboModule

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the iOS native layer as a Swift TurboModule using direct CoreBluetooth with async/await actors and proper GATT operation queuing.

**Architecture:** ObjC++ entry point (`BlePlx.mm`) conforms to Codegen-generated spec, delegates to `@objc BLEModuleImpl` Swift class, which owns a `BLEActor` (Swift actor with custom executor on CoreBluetooth's DispatchQueue). Per-peripheral `PeripheralWrapper` actors handle GATT operation serialization. State restoration bootstraps eagerly on background relaunch.

**Tech Stack:** Swift 5.9+, CoreBluetooth, Swift Concurrency (actors, async/await, AsyncStream), ObjC++, XCTest

**Spec:** `docs/specs/2026-03-15-v4-turbomodule-rewrite.md` (Sections 3, 7)

**Depends on:** Plan A (Codegen spec must exist)

---

## File Structure

```
ios/
├── BlePlx.mm                    ← ObjC++ TurboModule entry (Codegen base class)
├── BlePlx-Bridging-Header.h     ← Swift/ObjC bridge
├── BLEModuleImpl.swift          ← @objc Swift class, delegates to actor
├── BLEActor.swift               ← Central manager actor (custom executor)
├── PeripheralWrapper.swift      ← Per-peripheral GATT queue actor
├── GATTOperationQueue.swift     ← Serial operation queue with timeouts
├── CentralManagerDelegate.swift ← CB delegate → async bridge
├── PeripheralDelegate.swift     ← CB peripheral delegate → async bridge
├── ScanManager.swift            ← Scan with AsyncStream
├── StateRestoration.swift       ← Background restoration handler
├── EventSerializer.swift        ← CB objects → Codegen event types
├── ErrorConverter.swift         ← CB errors → unified BleErrorCode
├── L2CAPManager.swift           ← L2CAP channel lifecycle
ios/Tests/
├── GATTOperationQueueTests.swift
├── ErrorConverterTests.swift
├── EventSerializerTests.swift
```

---

## Chunk 1: ObjC++ entry + Swift actor scaffolding

### Task 1: ObjC++ TurboModule entry point

**Files:**
- Create: `ios/BlePlx.mm`
- Create: `ios/BlePlx-Bridging-Header.h`

- [ ] **Step 1: Create .mm file conforming to generated spec**

The `.mm` file:
- Imports Codegen-generated header
- Extends `NativeBlePlxSpec` (generated ObjC++ base class)
- Delegates every method to `BLEModuleImpl` (Swift, via `@objc`)
- Registers as `NativeBlePlx` module name

```objc
// BlePlx.mm
#import <NativeBlePlxSpec/NativeBlePlxSpec.h>
#import "react_native_ble_plx-Swift.h"

@interface BlePlx : NativeBlePlxSpec
@property (nonatomic, strong) BLEModuleImpl *impl;
@end

@implementation BlePlx

RCT_EXPORT_MODULE(NativeBlePlx)

- (instancetype)init {
    self = [super init];
    if (self) {
        _impl = [[BLEModuleImpl alloc] init];
    }
    return self;
}

- (void)createClient:(NSString *)restoreStateIdentifier
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject {
    [_impl createClient:restoreStateIdentifier resolve:resolve reject:reject];
}

// ... delegate all methods to _impl

- (void)invalidate {
    [_impl invalidate];
    [super invalidate];  // Fix audit #25 — call super
}

@end
```

- [ ] **Step 2: Commit**

```bash
git add ios/BlePlx.mm ios/BlePlx-Bridging-Header.h
git commit -m "feat(ios): ObjC++ TurboModule entry point"
```

---

### Task 2: BLEModuleImpl + BLEActor scaffolding

**Files:**
- Create: `ios/BLEModuleImpl.swift`
- Create: `ios/BLEActor.swift`

- [ ] **Step 1: Create BLEModuleImpl (@objc, delegates to actor)**

```swift
@objc public class BLEModuleImpl: NSObject {
    private var actor: BLEActor?
    private var emitter: ((String, Any) -> Void)?

    @objc public func setEventEmitter(_ emitter: @escaping (String, Any) -> Void) {
        self.emitter = emitter
    }

    @objc public func createClient(_ restoreId: String?,
                                    resolve: @escaping RCTPromiseResolveBlock,
                                    reject: @escaping RCTPromiseRejectBlock) {
        // Invalidate previous if exists
        actor?.invalidate()
        actor = BLEActor(restoreId: restoreId)
        resolve(nil)
    }

    @objc public func invalidate() {
        actor?.invalidate()
        actor = nil
    }
}
```

- [ ] **Step 2: Create BLEActor with custom executor**

```swift
@preconcurrency import CoreBluetooth

actor BLEActor {
    let queue = DispatchQueue(label: "com.bleplx.ble")

    nonisolated var unownedExecutor: UnownedSerialExecutor {
        queue.asUnownedSerialExecutor()
    }

    private var centralManager: CBCentralManager!
    private let delegateHandler: CentralManagerDelegate
    private var peripherals: [UUID: PeripheralWrapper] = [:]

    init(restoreId: String?) {
        delegateHandler = CentralManagerDelegate()
        let options: [String: Any] = restoreId != nil
            ? [CBCentralManagerOptionRestoreIdentifierKey: restoreId!]
            : [:]
        centralManager = CBCentralManager(
            delegate: delegateHandler, queue: queue, options: options
        )
    }

    func invalidate() {
        centralManager.stopScan()
        peripherals.values.forEach { $0.disconnect() }
        peripherals.removeAll()
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add ios/BLEModuleImpl.swift ios/BLEActor.swift
git commit -m "feat(ios): BLEModuleImpl + BLEActor with custom executor on CB queue"
```

---

### Task 3: Delegate-to-async bridges

**Files:**
- Create: `ios/CentralManagerDelegate.swift`
- Create: `ios/PeripheralDelegate.swift`

- [ ] **Step 1: CentralManagerDelegate — bridges CB delegate → async**

Uses `AsyncStream` for scan results, `CheckedContinuation` for connection, state change subjects. Handles `willRestoreState` with bootstrap timing (fires before `didUpdateState`). Implements `centralManager(_:connectionEventDidOccurForPeripheral:)` (iOS 13+) and emits `onConnectionEvent`.

- [ ] **Step 2: PeripheralDelegate — bridges peripheral delegate → async**

`CheckedContinuation` for: service discovery, characteristic read, characteristic write (withResponse), descriptor operations. `AsyncStream` for characteristic notifications. Flow control for `peripheralIsReady(toSendWriteWithoutResponse:)`.

- [ ] **Step 3: Commit**

---

## Chunk 2: GATT operation queue + scanning

### Task 4: GATT operation queue

**Files:**
- Create: `ios/GATTOperationQueue.swift`
- Create: `ios/Tests/GATTOperationQueueTests.swift`

- [ ] **Step 1: Write failing tests**

Test: operations execute serially, timeout fires after configured interval, concurrent enqueue waits for previous to complete, cancel stops pending operations.

- [ ] **Step 2: Implement GATTOperationQueue actor**

```swift
actor GATTOperationQueue {
    private var pending: [QueuedOperation] = []
    private var isExecuting = false
    private let timeoutSeconds: TimeInterval = 10.0

    func enqueue(_ operation: @escaping () -> Void) async throws -> Data? {
        return try await withCheckedThrowingContinuation { continuation in
            let op = QueuedOperation(work: operation, continuation: continuation)
            pending.append(op)
            if !isExecuting { executeNext() }
        }
    }

    func operationCompleted(result: Result<Data?, Error>) {
        // Resume current continuation with result, then executeNext()
        isExecuting = false
        executeNext()
    }

    private func executeNext() { ... }
}
```

- [ ] **Step 3: Run tests, commit**

---

### Task 5: Peripheral wrapper with GATT queue

**Files:**
- Create: `ios/PeripheralWrapper.swift`

- [ ] **Step 1: Implement PeripheralWrapper actor**

Per-peripheral actor that:
- Owns `CBPeripheral` reference (safe — same queue via custom executor)
- Owns `PeripheralDelegate` (weak back-reference to avoid retain cycle)
- Owns `GATTOperationQueue`
- Exposes: `discoverServices()`, `readCharacteristic()`, `writeCharacteristic()`, `monitorCharacteristic()` (returns `AsyncStream<Data>`)
- Handles `writeWithoutResponse` flow control via `canSendWriteWithoutResponse`

- [ ] **Step 2: Commit**

---

### Task 6: Scan manager

**Files:**
- Create: `ios/ScanManager.swift`

- [ ] **Step 1: Implement scan with AsyncStream**

Wraps `CBCentralManager.scanForPeripherals`. Returns `AsyncStream<ScanResult>`. Handles background mode constraint (must have service UUIDs when backgrounded). Properly stops scan on `AsyncStream` termination.

- [ ] **Step 2: Commit**

---

## Chunk 3: State restoration + L2CAP + final wiring

### Task 7: State restoration

**Files:**
- Create: `ios/StateRestoration.swift`

- [ ] **Step 1: Implement restoration handler**

- Handles `willRestoreState` delegate callback (fires BEFORE `didUpdateState`)
- Re-attaches delegates to restored peripherals
- Stores peripheral references strongly (CB does not retain them)
- Buffers restoration data until JS subscribes via `onRestoreState`
- Bootstrap: native module eagerly creates `CBCentralManager` on background relaunch during `application(_:willFinishLaunchingWithOptions:)`, before JS bridge is ready

- [ ] **Step 2: Commit**

---

### Task 8: L2CAP manager

**Files:**
- Create: `ios/L2CAPManager.swift`

- [ ] **Step 1: Implement L2CAP channel lifecycle**

- `openChannel(peripheral, psm)` → returns `L2CAPChannelWrapper`
- `L2CAPChannelWrapper` owns channel + streams, strongly retains both
- Schedules `NSInputStream`/`NSOutputStream` on correct RunLoop
- `StreamDelegate` → `AsyncStream` bridge for incoming data
- Write method with flow control
- Close method cleans up streams and channel
- Documents: L2CAP does NOT wake suspended apps

- [ ] **Step 2: Commit**

---

### Task 9: Error converter + event serializer

**Files:**
- Create: `ios/ErrorConverter.swift`
- Create: `ios/EventSerializer.swift`

- [ ] **Step 1: Map CBError → BleErrorCode**

CBError codes (.invalidParameters, .peerRemovedPairingInformation, etc.) → unified codes. CBATTError codes → `attErrorCode`. Includes `isRetryable` logic.

- [ ] **Step 2: Serialize CB objects → Codegen event types**

Extract Sendable values (UUID strings, Data as Base64, booleans) from CB objects. Never pass `CBPeripheral` or `CBCharacteristic` across actor boundaries.

- [ ] **Step 3: Test and commit**

---

### Task 10: Wire everything into BLEModuleImpl

- [ ] **Step 1: Implement all method delegations from BLEModuleImpl → BLEActor**

Each `@objc` method launches a Task, calls into the actor, converts results, and calls resolve/reject.

- [ ] **Step 2: Implement all event emissions**

Scan results, connection state changes, characteristic values, state changes, restoration events, **L2CAP data/close events**, and **connection events (iOS 13+)** → all flow through the event emitter set by the `.mm` file. Specifically:
- Wire `L2CAPManager` AsyncStream → `emitOnL2CAPData` / `emitOnL2CAPClose`
- Wire `CentralManagerDelegate.connectionEvent` → `emitOnConnectionEvent`

- [ ] **Step 3: Update podspec**

```ruby
s.source_files = "ios/**/*.{h,m,mm,cpp,swift}"
s.private_header_files = "ios/**/*.h"
s.platforms = { :ios => "14.0" }
install_modules_dependencies(s)
```

- [ ] **Step 4: Build test on iOS simulator**

```bash
cd example && npx react-native run-ios
```

- [ ] **Step 5: Commit**

```bash
git add ios/
git commit -m "feat(ios): complete Swift TurboModule with actor-based CoreBluetooth"
```
