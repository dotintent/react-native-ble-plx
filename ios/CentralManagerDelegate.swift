import Foundation
@preconcurrency import CoreBluetooth

// MARK: - Connection result

struct ConnectionResult: Sendable {
    let peripheralId: UUID
    let error: Error?
}

// MARK: - CentralManagerDelegate

/// Bridges CBCentralManagerDelegate callbacks to async/await patterns.
/// Uses AsyncStream for scan results and CheckedContinuation for connections.
final class CentralManagerDelegate: NSObject, CBCentralManagerDelegate, Sendable {

    // MARK: - State

    private let stateSubject = AsyncStreamBridge<CBManagerState>()
    private let scanSubject = AsyncStreamBridge<ScanResultSnapshot>()
    private let connectionSubject = AsyncStreamBridge<ConnectionResult>()
    private let disconnectionSubject = AsyncStreamBridge<ConnectionResult>()
    private let restorationSubject = AsyncStreamBridge<RestorationState>()

    /// Pending connection continuations keyed by peripheral UUID
    private let pendingConnections = LockedDictionary<UUID, CheckedContinuation<Void, Error>>()

    /// Raw restoration dicts buffered for same-queue access by BLEActor/StateRestoration.
    /// Only accessed from the CB queue — not Sendable, not crossed across isolation domains.
    private let rawRestorationDicts = LockedBox<[[String: Any]]>([])

    /// Discovered peripherals retained during scanning so CoreBluetooth doesn't deallocate them.
    private let discoveredPeripherals = LockedDictionary<UUID, CBPeripheral>()

    // MARK: - Streams

    var stateStream: AsyncStream<CBManagerState> { stateSubject.stream }
    var scanStream: AsyncStream<ScanResultSnapshot> { scanSubject.stream }
    var disconnectionStream: AsyncStream<ConnectionResult> { disconnectionSubject.stream }
    var restorationStream: AsyncStream<RestorationState> { restorationSubject.stream }

    // MARK: - Connection management

    func addConnectionContinuation(_ continuation: CheckedContinuation<Void, Error>, for peripheralId: UUID) {
        pendingConnections.set(peripheralId, value: continuation)
    }

    func removeConnectionContinuation(for peripheralId: UUID) {
        pendingConnections.removeValue(forKey: peripheralId)
    }

    // MARK: - CBCentralManagerDelegate

    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        stateSubject.yield(central.state)
    }

    func centralManager(
        _ central: CBCentralManager,
        didDiscover peripheral: CBPeripheral,
        advertisementData: [String: Any],
        rssi RSSI: NSNumber
    ) {
        // Retain the peripheral so CoreBluetooth doesn't deallocate it before connection
        discoveredPeripherals.set(peripheral.identifier, value: peripheral)

        let snapshot = EventSerializer.scanResult(
            from: peripheral,
            advertisementData: advertisementData,
            rssi: RSSI
        )
        scanSubject.yield(snapshot)
    }

    /// Retrieve a discovered peripheral by UUID. Returns nil if not found.
    func discoveredPeripheral(for uuid: UUID) -> CBPeripheral? {
        return discoveredPeripherals.value(forKey: uuid)
    }

    /// Clear discovered peripherals (e.g., when scan stops or manager is destroyed).
    func clearDiscoveredPeripherals() {
        discoveredPeripherals.removeAllValues()
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        if let continuation = pendingConnections.removeValue(forKey: peripheral.identifier) {
            continuation.resume()
        }
        connectionSubject.yield(ConnectionResult(peripheralId: peripheral.identifier, error: nil))
    }

    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        let bleError = error.map {
            ErrorConverter.from(cbError: $0, deviceId: peripheral.identifier.uuidString, operation: "connect")
        } ?? BleError(
            code: .deviceConnectionFailed,
            message: "Failed to connect to device",
            deviceId: peripheral.identifier.uuidString
        )

        if let continuation = pendingConnections.removeValue(forKey: peripheral.identifier) {
            continuation.resume(throwing: bleError)
        }
    }

    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        // If there's a pending connection continuation, resume it with an error
        if let continuation = pendingConnections.removeValue(forKey: peripheral.identifier) {
            let bleError = BleError(
                code: .deviceDisconnected,
                message: "Device disconnected during connection",
                deviceId: peripheral.identifier.uuidString
            )
            continuation.resume(throwing: bleError)
        }

        disconnectionSubject.yield(ConnectionResult(peripheralId: peripheral.identifier, error: error))
    }

    func centralManager(_ central: CBCentralManager, willRestoreState dict: [String: Any]) {
        // willRestoreState fires BEFORE didUpdateState.
        // Store the raw dict for same-queue access (peripherals are not Sendable).
        var current = rawRestorationDicts.value
        current.append(dict)
        rawRestorationDicts.value = current
        // Send the Sendable metadata through the stream for cross-actor signaling.
        restorationSubject.yield(RestorationState(from: dict))
    }

    /// Consume buffered raw restoration dicts. Must be called from the CB queue.
    func consumeRawRestorationDicts() -> [[String: Any]] {
        let dicts = rawRestorationDicts.value
        rawRestorationDicts.value = []
        return dicts
    }

    @available(iOS 13.0, *)
    func centralManager(_ central: CBCentralManager, connectionEventDidOccur event: CBConnectionEvent, for peripheral: CBPeripheral) {
        // Forward as a disconnection if peer disconnected
        if event == .peerDisconnected {
            disconnectionSubject.yield(ConnectionResult(peripheralId: peripheral.identifier, error: nil))
        }
    }

    // MARK: - Cleanup

    func finish() {
        stateSubject.finish()
        scanSubject.finish()
        connectionSubject.finish()
        disconnectionSubject.finish()
        restorationSubject.finish()

        // Cancel all pending connections
        pendingConnections.removeAll { continuation in
            continuation.resume(throwing: BleError(
                code: .bluetoothManagerDestroyed,
                message: "BLE manager was destroyed"
            ))
        }
    }
}

// MARK: - Thread-safe AsyncStream bridge

/// A simple Sendable wrapper around AsyncStream continuation
final class AsyncStreamBridge<T: Sendable>: Sendable {
    private let _continuation: LockedBox<AsyncStream<T>.Continuation?>
    let stream: AsyncStream<T>

    init() {
        let box = LockedBox<AsyncStream<T>.Continuation?>(nil)
        self._continuation = box
        self.stream = AsyncStream { continuation in
            box.value = continuation
        }
    }

    func yield(_ value: T) {
        _continuation.value?.yield(value)
    }

    func finish() {
        _continuation.value?.finish()
        _continuation.value = nil
    }
}

// MARK: - Thread-safe helpers

/// A locked box for Sendable compliance
final class LockedBox<T>: @unchecked Sendable {
    private let lock = NSLock()
    private var _value: T

    init(_ value: T) {
        self._value = value
    }

    var value: T {
        get { lock.withLock { _value } }
        set { lock.withLock { _value = newValue } }
    }

    /// Atomically read and transform the value in a single locked operation.
    @discardableResult
    func mutate<R>(_ transform: (inout T) -> R) -> R {
        lock.withLock { transform(&_value) }
    }
}

/// Thread-safe dictionary
final class LockedDictionary<Key: Hashable, Value>: @unchecked Sendable {
    private let lock = NSLock()
    private var dict: [Key: Value] = [:]

    func set(_ key: Key, value: Value) {
        lock.withLock { dict[key] = value }
    }

    func removeValue(forKey key: Key) -> Value? {
        lock.withLock { dict.removeValue(forKey: key) }
    }

    func value(forKey key: Key) -> Value? {
        lock.withLock { dict[key] }
    }

    func removeAll(handler: (Value) -> Void) {
        lock.withLock {
            for (_, value) in dict {
                handler(value)
            }
            dict.removeAll()
        }
    }

    func removeAllValues() {
        lock.withLock { dict.removeAll() }
    }
}
