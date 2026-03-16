import Foundation
@preconcurrency import CoreBluetooth

// MARK: - Characteristic update result

struct CharacteristicUpdateResult: Sendable {
    let characteristicUuid: String
    let serviceUuid: String
    let value: String? // Base64
    let error: Error?
}

struct DiscoveryResult: Sendable {
    let error: Error?
}

struct WriteResult: Sendable {
    let characteristicUuid: String
    let serviceUuid: String
    let error: Error?
}

struct NotifyResult: Sendable {
    let characteristicUuid: String
    let serviceUuid: String
    let isNotifying: Bool
    let error: Error?
}

struct RSSIResult: Sendable {
    let rssi: Int
    let error: Error?
}

// MARK: - PeripheralDelegate

/// Bridges CBPeripheralDelegate callbacks to async/await patterns.
final class PeripheralDelegate: NSObject, CBPeripheralDelegate, Sendable {

    private let deviceId: String

    // Service discovery
    private let serviceDiscoverySubject = AsyncStreamBridge<DiscoveryResult>()

    // Characteristic discovery
    private let characteristicDiscoverySubject = AsyncStreamBridge<DiscoveryResult>()

    // Characteristic read/notify
    private let characteristicUpdateSubject = AsyncStreamBridge<CharacteristicUpdateResult>()

    // Characteristic write
    private let writeSubject = AsyncStreamBridge<WriteResult>()

    // Notify state
    private let notifySubject = AsyncStreamBridge<NotifyResult>()

    // RSSI
    private let rssiSubject = AsyncStreamBridge<RSSIResult>()

    // Write without response flow control
    private let writeWithoutResponseSubject = AsyncStreamBridge<Void>()

    // L2CAP channel open
    let pendingL2CAPOpen = LockedBox<CheckedContinuation<CBL2CAPChannel, Error>?>(nil)

    // Pending continuations for one-shot operations
    private let pendingServiceDiscovery = LockedBox<CheckedContinuation<Void, Error>?>(nil)
    private let pendingCharacteristicDiscovery = LockedDictionary<String, CheckedContinuation<Void, Error>>()
    private let pendingReads = LockedDictionary<String, CheckedContinuation<CharacteristicSnapshot, Error>>()
    private let pendingWrites = LockedDictionary<String, CheckedContinuation<CharacteristicSnapshot, Error>>()
    private let pendingNotifyChanges = LockedDictionary<String, CheckedContinuation<Void, Error>>()
    private let pendingRSSI = LockedBox<CheckedContinuation<Int, Error>?>(nil)

    var characteristicUpdateStream: AsyncStream<CharacteristicUpdateResult> {
        characteristicUpdateSubject.stream
    }

    init(deviceId: String) {
        self.deviceId = deviceId
        super.init()
    }

    // MARK: - Continuation management

    func addServiceDiscoveryContinuation(_ continuation: CheckedContinuation<Void, Error>) {
        pendingServiceDiscovery.value = continuation
    }

    func addCharacteristicDiscoveryContinuation(_ continuation: CheckedContinuation<Void, Error>, for serviceUuid: String) {
        pendingCharacteristicDiscovery.set(serviceUuid, value: continuation)
    }

    func addReadContinuation(_ continuation: CheckedContinuation<CharacteristicSnapshot, Error>, for key: String) {
        pendingReads.set(key, value: continuation)
    }

    func addWriteContinuation(_ continuation: CheckedContinuation<CharacteristicSnapshot, Error>, for key: String) {
        pendingWrites.set(key, value: continuation)
    }

    func addNotifyContinuation(_ continuation: CheckedContinuation<Void, Error>, for key: String) {
        pendingNotifyChanges.set(key, value: continuation)
    }

    func addRSSIContinuation(_ continuation: CheckedContinuation<Int, Error>) {
        pendingRSSI.value = continuation
    }

    func addL2CAPOpenContinuation(_ continuation: CheckedContinuation<CBL2CAPChannel, Error>) {
        pendingL2CAPOpen.value = continuation
    }

    // MARK: - CBPeripheralDelegate — Service Discovery

    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        if let continuation = pendingServiceDiscovery.value {
            pendingServiceDiscovery.value = nil
            if let error = error {
                continuation.resume(throwing: ErrorConverter.from(
                    cbError: error,
                    deviceId: deviceId,
                    operation: "discoverServices"
                ))
            } else {
                continuation.resume()
            }
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        let key = service.uuid.uuidString
        if let continuation = pendingCharacteristicDiscovery.removeValue(forKey: key) {
            if let error = error {
                continuation.resume(throwing: ErrorConverter.from(
                    cbError: error,
                    deviceId: deviceId,
                    serviceUuid: key,
                    operation: "discoverCharacteristics"
                ))
            } else {
                continuation.resume()
            }
        }
    }

    // MARK: - CBPeripheralDelegate — Characteristic Operations

    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        let charKey = characteristicKey(characteristic)

        // Check if this is a pending read
        if let continuation = pendingReads.removeValue(forKey: charKey) {
            if let error = error {
                continuation.resume(throwing: ErrorConverter.from(
                    cbError: error,
                    deviceId: deviceId,
                    serviceUuid: characteristic.service?.uuid.uuidString,
                    characteristicUuid: characteristic.uuid.uuidString,
                    operation: "read"
                ))
            } else {
                let snapshot = EventSerializer.snapshot(from: characteristic, deviceId: deviceId)
                continuation.resume(returning: snapshot)
            }
            return
        }

        // Otherwise it's a notification
        characteristicUpdateSubject.yield(CharacteristicUpdateResult(
            characteristicUuid: characteristic.uuid.uuidString,
            serviceUuid: characteristic.service?.uuid.uuidString ?? "",
            value: characteristic.value?.base64EncodedString(),
            error: error
        ))
    }

    func peripheral(_ peripheral: CBPeripheral, didWriteValueFor characteristic: CBCharacteristic, error: Error?) {
        let charKey = characteristicKey(characteristic)
        if let continuation = pendingWrites.removeValue(forKey: charKey) {
            if let error = error {
                continuation.resume(throwing: ErrorConverter.from(
                    cbError: error,
                    deviceId: deviceId,
                    serviceUuid: characteristic.service?.uuid.uuidString,
                    characteristicUuid: characteristic.uuid.uuidString,
                    operation: "write"
                ))
            } else {
                let snapshot = EventSerializer.snapshot(from: characteristic, deviceId: deviceId)
                continuation.resume(returning: snapshot)
            }
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateNotificationStateFor characteristic: CBCharacteristic, error: Error?) {
        let charKey = characteristicKey(characteristic)
        if let continuation = pendingNotifyChanges.removeValue(forKey: charKey) {
            if let error = error {
                continuation.resume(throwing: ErrorConverter.from(
                    cbError: error,
                    deviceId: deviceId,
                    serviceUuid: characteristic.service?.uuid.uuidString,
                    characteristicUuid: characteristic.uuid.uuidString,
                    operation: "notify"
                ))
            } else {
                continuation.resume()
            }
        }
    }

    // MARK: - CBPeripheralDelegate — RSSI

    func peripheral(_ peripheral: CBPeripheral, didReadRSSI RSSI: NSNumber, error: Error?) {
        if let continuation = pendingRSSI.value {
            pendingRSSI.value = nil
            if let error = error {
                continuation.resume(throwing: ErrorConverter.from(
                    cbError: error,
                    deviceId: deviceId,
                    operation: "readRSSI"
                ))
            } else {
                continuation.resume(returning: RSSI.intValue)
            }
        }
    }

    // MARK: - CBPeripheralDelegate — L2CAP

    func peripheral(_ peripheral: CBPeripheral, didOpen channel: CBL2CAPChannel?, error: Error?) {
        let continuation: CheckedContinuation<CBL2CAPChannel, Error>? = pendingL2CAPOpen.mutate { current in
            let taken = current
            current = nil
            return taken
        }
        if let continuation = continuation {
            if let error = error {
                continuation.resume(throwing: ErrorConverter.from(
                    cbError: error,
                    deviceId: deviceId,
                    operation: "openL2CAPChannel"
                ))
            } else if let channel = channel {
                continuation.resume(returning: channel)
            } else {
                continuation.resume(throwing: BleError(
                    code: .l2capOpenFailed,
                    message: "L2CAP channel open returned nil channel without error",
                    deviceId: deviceId
                ))
            }
        }
    }

    // MARK: - CBPeripheralDelegate — Write without response

    func peripheralIsReady(toSendWriteWithoutResponse peripheral: CBPeripheral) {
        writeWithoutResponseSubject.yield(())
    }

    var writeWithoutResponseReadyStream: AsyncStream<Void> {
        writeWithoutResponseSubject.stream
    }

    // MARK: - Cleanup

    func finish() {
        serviceDiscoverySubject.finish()
        characteristicDiscoverySubject.finish()
        characteristicUpdateSubject.finish()
        writeSubject.finish()
        notifySubject.finish()
        rssiSubject.finish()
        writeWithoutResponseSubject.finish()
    }

    // MARK: - Helpers

    private func characteristicKey(_ characteristic: CBCharacteristic) -> String {
        let serviceUuid = characteristic.service?.uuid.uuidString ?? ""
        return "\(serviceUuid)|\(characteristic.uuid.uuidString)"
    }
}
