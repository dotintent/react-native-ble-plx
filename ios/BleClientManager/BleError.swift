//
//  BleError.swift
//
//  Created by Przemysław Lenart on 25/07/16.
//

import Foundation
import RxBluetoothKit

struct BleError: Error {
    let code: Int
    let message: String
    let isCancelled: Bool

    init(code: Int, message: String, isCancelled: Bool = false) {
        self.code = code
        self.message = message
        self.isCancelled = isCancelled
    }
}

extension BleError {
    var toJSResult: Any {
        return [self.toJS, NSNull()]
    }
    var toJS: Any {
        if isCancelled {
            return ["name": "BleClientModule", "code": code, "message": message, "isCancelled": true]
        }
        return ["name": "BleClientModule", "code": code, "message": message] as AnyObject
    }
    func callReject(_ reject: Reject) {
        reject("\(self.code)", self.message, nil)
    }
    func callReject(_ promise: SafePromise) {
        promise.reject(code: "\(self.code)", message: self.message)
    }
}

extension Error {
    var bleError: BleError {
        switch self {
        case let error as BluetoothError:
            return error.bleError
        case let error as BleError:
            return error
        default:
            return BleError(code: 0, message: "Unknown error")
        }
    }
}

extension BluetoothError {
    var bleError: BleError {
        switch self {
        case .bluetoothUnsupported:
            return BleError(code: 100, message: "Bluetooth is not supported")
        case .bluetoothUnauthorized:
            return BleError(code: 101, message: "Bluetooth is unauthorized")
        case .bluetoothPoweredOff:
            return BleError(code: 102, message: "Bluetooth is powered off")
        case .bluetoothInUnknownState:
            return BleError(code: 103, message: "Bluetooth is in unknown state")
        case .bluetoothResetting:
            return BleError(code: 103, message: "Bluetooth is resetting")

        case let .peripheralConnectionFailed(peripheral, error):
            return BleError(code: 200, message: "Connection to \(peripheral.identifier.uuidString) failed: \(error?.localizedDescription ?? "Unknown reason")")
        case let .peripheralDisconnected(peripheral, error):
            return BleError(code: 201, message: "Disconnection from \(peripheral.identifier.uuidString) failed: \(error?.localizedDescription ?? "Unknown reason")")
        case let .peripheralRSSIReadFailed(peripheral, error):
            return BleError(code: 202, message: "Failed to read RSSI for \(peripheral.identifier.uuidString): \(error?.localizedDescription ?? "Unknown reason")")

        case let .servicesDiscoveryFailed(peripheral, error):
            return BleError(code: 300, message: "Failed to discover services for \(peripheral.identifier.uuidString): \(error?.localizedDescription ?? "Unknown reason")")
        case let .includedServicesDiscoveryFailed(peripheral, error):
            return BleError(code: 301, message: "Failed to discover included services for \(peripheral.identifier.uuidString): \(error?.localizedDescription ?? "Unknown reason")")

        case let .characteristicsDiscoveryFailed(service, error):
            return BleError(code: 400, message: "Failed to discover characteristics for service \(service.uuid.fullUUIDString): \(error?.localizedDescription ?? "Unknown reason")")
        case let .characteristicWriteFailed(characteristic, error):
            return BleError(code: 401, message: "Characteristic \(characteristic.uuid.fullUUIDString) write failed: \(error?.localizedDescription ?? "Unknown reason")")
        case let .characteristicReadFailed(characteristic, error):
            return BleError(code: 402, message: "Characteristic \(characteristic.uuid.fullUUIDString) read failed: \(error?.localizedDescription ?? "Unknown reason")")
        case let .characteristicNotifyChangeFailed(characteristic, error):
            return BleError(code: 403, message: "Characteristic \(characteristic.uuid.fullUUIDString) notification change failed: \(error?.localizedDescription ?? "Unknown reason")")

        case let .descriptorsDiscoveryFailed(characteristic, error):
            return BleError(code: 403, message: "Descriptors discovery for characteristic \(characteristic.uuid.fullUUIDString) failed: \(error?.localizedDescription ?? "Unknown reason")")
        case let .descriptorWriteFailed(descriptor, error):
            return BleError(code: 403, message: "Descriptor \(descriptor.uuid.fullUUIDString) write failed: \(error?.localizedDescription ?? "Unknown reason")")
        case let .descriptorReadFailed(descriptor, error):
            return BleError(code: 403, message: "Descriptor \(descriptor.uuid.fullUUIDString) read failed: \(error?.localizedDescription ?? "Unknown reason")")
        }
    }
}

extension BleError {
    static func cancelled() -> BleError { return BleError(code: 1, message: "Cancelled", isCancelled: true) }
    static func invalidUUID(_ uuid: String) -> BleError { return invalidUUIDs([uuid]) }
    static func invalidUUIDs(_ uuids: [String]) -> BleError { return BleError(code: 500, message: "Invalid UUIDs were passed: \(uuids)") }
    static func peripheralNotFound(_ uuid: String) -> BleError { return BleError(code: 501, message: "Device \(uuid) not found") }
    static func peripheralNotConnected(_ uuid: String) -> BleError { return BleError(code: 502, message: "Device \(uuid) is not connected") }
    static func characteristicNotFound(_ uuid: String) -> BleError { return BleError(code: 503, message: "Characteristic \(uuid) not found") }
    static func characteristicNotFound(_ id: Double) -> BleError { return BleError(code: 503, message: "Characteristic \(id) not found") }
    static func invalidWriteDataForCharacteristic(_ uuid: String, data: String) -> BleError { return BleError(code: 504, message: "Invalid value data: \(data) for characteristic \(uuid)")}
    static func invalidWriteDataForCharacteristic(_ id: Double, data: String) -> BleError { return BleError(code: 504, message: "Invalid value data: \(data) for characteristic \(id)")}
    static func invalidID(_ id: Double) -> BleError { return BleError(code: 505, message: "Invalid ID was passed: \(id)")}
    static func serviceNotFound(_ uuid: String) -> BleError { return BleError(code: 506, message: "Service \(uuid) not found") }
    static func serviceNotFound(_ id: Double) -> BleError { return BleError(code: 506, message: "Service \(id) not found") }
}
