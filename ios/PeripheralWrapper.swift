import Foundation
@preconcurrency import CoreBluetooth

// MARK: - PeripheralWrapper

/// Per-peripheral actor that owns the CBPeripheral, its delegate, and a GATT operation queue.
/// Uses a custom executor pinned to the CB dispatch queue for thread safety.
actor PeripheralWrapper {
    let queue: DispatchSerialQueue
    nonisolated var unownedExecutor: UnownedSerialExecutor { queue.asUnownedSerialExecutor() }

    private let peripheral: CBPeripheral
    private let delegate: PeripheralDelegate
    private let gattQueue: GATTOperationQueue
    let deviceId: String

    /// Stream of characteristic notifications for this peripheral
    var characteristicUpdateStream: AsyncStream<CharacteristicUpdateResult> {
        delegate.characteristicUpdateStream
    }

    init(peripheral: CBPeripheral, queue: DispatchSerialQueue) {
        self.peripheral = peripheral
        self.queue = queue
        self.deviceId = peripheral.identifier.uuidString
        self.delegate = PeripheralDelegate(deviceId: peripheral.identifier.uuidString)
        self.gattQueue = GATTOperationQueue()
        peripheral.delegate = delegate
    }

    // MARK: - Discovery

    func discoverAllServicesAndCharacteristics() async throws -> PeripheralSnapshot {
        // Discover services
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            delegate.addServiceDiscoveryContinuation(continuation)
            peripheral.discoverServices(nil)
        }

        // Discover characteristics for each service
        if let services = peripheral.services {
            for service in services {
                try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
                    delegate.addCharacteristicDiscoveryContinuation(continuation, for: service.uuid.uuidString)
                    peripheral.discoverCharacteristics(nil, for: service)
                }
            }
        }

        return EventSerializer.snapshot(from: peripheral)
    }

    // MARK: - Read

    func readCharacteristic(
        serviceUuid: String,
        characteristicUuid: String,
        transactionId: String?
    ) async throws -> CharacteristicSnapshot {
        guard let characteristic = findCharacteristic(serviceUuid: serviceUuid, characteristicUuid: characteristicUuid) else {
            throw BleError(
                code: .characteristicsNotDiscovered,
                message: "Characteristic \(characteristicUuid) not found in service \(serviceUuid)",
                deviceId: deviceId,
                serviceUuid: serviceUuid,
                characteristicUuid: characteristicUuid
            )
        }

        let charKey = "\(serviceUuid)|\(characteristicUuid)"

        return try await gattQueue.enqueue(transactionId: transactionId) { [peripheral, delegate, deviceId] in
            try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<CharacteristicSnapshot, Error>) in
                delegate.addReadContinuation(continuation, for: charKey)
                peripheral.readValue(for: characteristic)
            }
        }
    }

    // MARK: - Write

    func writeCharacteristic(
        serviceUuid: String,
        characteristicUuid: String,
        value: Data,
        withResponse: Bool,
        transactionId: String?
    ) async throws -> CharacteristicSnapshot {
        guard let characteristic = findCharacteristic(serviceUuid: serviceUuid, characteristicUuid: characteristicUuid) else {
            throw BleError(
                code: .characteristicsNotDiscovered,
                message: "Characteristic \(characteristicUuid) not found in service \(serviceUuid)",
                deviceId: deviceId,
                serviceUuid: serviceUuid,
                characteristicUuid: characteristicUuid
            )
        }

        let charKey = "\(serviceUuid)|\(characteristicUuid)"
        let writeType: CBCharacteristicWriteType = withResponse ? .withResponse : .withoutResponse

        if withResponse {
            return try await gattQueue.enqueue(transactionId: transactionId) { [peripheral, delegate, deviceId] in
                try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<CharacteristicSnapshot, Error>) in
                    delegate.addWriteContinuation(continuation, for: charKey)
                    peripheral.writeValue(value, for: characteristic, type: writeType)
                }
            }
        } else {
            // Write without response: check canSendWriteWithoutResponse
            return try await gattQueue.enqueue(transactionId: transactionId) { [peripheral, delegate, deviceId] in
                if !peripheral.canSendWriteWithoutResponse {
                    // Wait for ready signal
                    for await _ in delegate.writeWithoutResponseReadyStream {
                        break
                    }
                }
                peripheral.writeValue(value, for: characteristic, type: writeType)
                return EventSerializer.snapshot(from: characteristic, deviceId: deviceId)
            }
        }
    }

    // MARK: - Monitor (Notify/Indicate)

    func setNotifyValue(_ enabled: Bool, serviceUuid: String, characteristicUuid: String) async throws {
        guard let characteristic = findCharacteristic(serviceUuid: serviceUuid, characteristicUuid: characteristicUuid) else {
            throw BleError(
                code: .characteristicsNotDiscovered,
                message: "Characteristic \(characteristicUuid) not found",
                deviceId: deviceId,
                serviceUuid: serviceUuid,
                characteristicUuid: characteristicUuid
            )
        }

        let charKey = "\(serviceUuid)|\(characteristicUuid)"

        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            delegate.addNotifyContinuation(continuation, for: charKey)
            peripheral.setNotifyValue(enabled, for: characteristic)
        }
    }

    // MARK: - RSSI

    func readRSSI() async throws -> Int {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Int, Error>) in
            delegate.addRSSIContinuation(continuation)
            peripheral.readRSSI()
        }
    }

    // MARK: - MTU

    func mtu() -> Int {
        peripheral.maximumWriteValueLength(for: .withoutResponse) + 3
    }

    // MARK: - Snapshot

    func snapshot() -> PeripheralSnapshot {
        EventSerializer.snapshot(from: peripheral)
    }

    // MARK: - Connection state

    func isConnected() -> Bool {
        peripheral.state == .connected
    }

    // MARK: - Cancel

    func cancelTransaction(_ transactionId: String) async {
        await gattQueue.cancelTransaction(transactionId)
    }

    // MARK: - Cleanup

    func cleanup() {
        delegate.finish()
    }

    // MARK: - L2CAP

    @available(iOS 11.0, *)
    func openL2CAPChannel(psm: CBL2CAPPSM) async throws -> CBL2CAPChannel {
        // Guard against concurrent opens
        guard delegate.pendingL2CAPOpen.value == nil else {
            throw BleError(
                code: .l2capOpenFailed,
                message: "L2CAP channel open already in progress",
                deviceId: deviceId
            )
        }
        return try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<CBL2CAPChannel, Error>) in
            delegate.addL2CAPOpenContinuation(continuation)
            peripheral.openL2CAPChannel(psm)
        }
    }

    // MARK: - Internal

    /// The underlying CBPeripheral — only access from the correct queue
    var cbPeripheral: CBPeripheral { peripheral }

    // MARK: - Private helpers

    private func findCharacteristic(serviceUuid: String, characteristicUuid: String) -> CBCharacteristic? {
        let targetServiceUuid = CBUUID(string: serviceUuid)
        let targetCharUuid = CBUUID(string: characteristicUuid)

        guard let service = peripheral.services?.first(where: { $0.uuid == targetServiceUuid }) else {
            return nil
        }
        return service.characteristics?.first(where: { $0.uuid == targetCharUuid })
    }
}
