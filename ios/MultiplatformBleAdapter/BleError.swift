//
//  BleError.swift
//
//  Created by Przemysław Lenart on 25/07/16.
//

import Foundation
import CoreBluetooth

enum BleErrorCode : Int {
    case UnknownError = 0
    case BluetoothManagerDestroyed = 1
    case OperationCancelled = 2
    case OperationTimedOut = 3
    case OperationStartFailed = 4
    case InvalidIdentifiers = 5

    case BluetoothUnsupported = 100
    case BluetoothUnauthorized = 101
    case BluetoothPoweredOff = 102
    case BluetoothInUnknownState = 103
    case BluetoothResetting = 104
    case BluetoothStateChangeFailed = 105

    case DeviceConnectionFailed = 200
    case DeviceDisconnected = 201
    case DeviceRSSIReadFailed = 202
    case DeviceAlreadyConnected = 203
    case DeviceNotFound = 204
    case DeviceNotConnected = 205
    case DeviceMTUChangeFailed = 206

    case ServicesDiscoveryFailed = 300
    case IncludedServicesDiscoveryFailed = 301
    case ServiceNotFound = 302
    case ServicesNotDiscovered = 303

    case CharacteristicsDiscoveryFailed = 400
    case CharacteristicWriteFailed = 401
    case CharacteristicReadFailed = 402
    case CharacteristicNotifyChangeFailed = 403
    case CharacteristicNotFound = 404
    case CharacteristicsNotDiscovered = 405
    case CharacteristicInvalidDataFormat = 406

    case DescriptorsDiscoveryFailed = 500
    case DescriptorWriteFailed = 501
    case DescriptorReadFailed = 502
    case DescriptorNotFound = 503
    case DescriptorsNotDiscovered = 504
    case DescriptorInvalidDataFormat = 505
    case DescriptorWriteNotAllowed = 506

    case ScanStartFailed = 600
    case LocationServicesDisabled = 601
}

struct BleError: Error {
    let errorCode: BleErrorCode
    let attErrorCode: Int?
    let iosErrorCode: Int?
    let reason: String?

    let deviceID: String?
    let serviceUUID: String?
    let characteristicUUID: String?
    let descriptorUUID: String?
    let internalMessage: String?

    init(errorCode: BleErrorCode,
         reason: String? = nil,
         attErrorCode: Int? = nil,
         iosErrorCode: Int? = nil,
         deviceID: String? = nil,
         serviceUUID: String? = nil,
         characteristicUUID: String? = nil,
         descriptorUUID: String? = nil,
         internalMessage: String? = nil) {
        self.errorCode = errorCode
        self.attErrorCode = attErrorCode
        self.iosErrorCode = iosErrorCode
        self.reason = reason
        self.deviceID = deviceID
        self.serviceUUID = serviceUUID
        self.characteristicUUID = characteristicUUID
        self.descriptorUUID = descriptorUUID
        self.internalMessage = internalMessage
    }
}

extension BleError {
    var toJSResult: Any {
        return [self.toJS, NSNull()]
    }
    var toJS: String {
        return """
        {
            "errorCode": \(self.errorCode.rawValue),
            "attErrorCode": \(self.attErrorCode.map {$0.description} ?? "null"),
            "iosErrorCode": \(self.iosErrorCode.map {$0.description} ?? "null"),
            "androidErrorCode": null,
            "reason": \(self.reason.map {"\"" + $0 + "\""} ?? "null"),
            "deviceID": \(self.deviceID.map {"\"" + $0 + "\""} ?? "null"),
            "serviceUUID": \(self.serviceUUID.map {"\"" + $0 + "\""} ?? "null"),
            "characteristicUUID": \(self.characteristicUUID.map {"\"" + $0 + "\""} ?? "null"),
            "descriptorUUID": \(self.descriptorUUID.map {"\"" + $0 + "\""} ?? "null"),
            "internalMessage": \(self.internalMessage.map {"\"" + $0 + "\""} ?? "null")
        }
        """
    }
    func callReject(_ reject: Reject) {
        reject(nil, self.toJS, nil)
    }
    func callReject(_ promise: SafePromise) {
        promise.reject(code: nil, message: self.toJS)
    }
}

extension RxError {
    var bleError: BleError {
        switch self {
        case .timeout:
            return BleError(errorCode: .OperationTimedOut, reason: self.localizedDescription)
        case .unknown: fallthrough
        case .disposed: fallthrough
        case .overflow: fallthrough
        case .argumentOutOfRange: fallthrough
        case .noElements: fallthrough
        case .moreThanOneElement:
            return BleError(errorCode: .UnknownError, reason: self.localizedDescription)
        }
    }
}

extension Error {
    var bleError: BleError {
        switch self {
        case let error as BluetoothError:
            return error.bleError
        case let error as RxError:
            return error.bleError
        case let error as BleError:
            return error
        default:
            return BleError(errorCode: .UnknownError, reason: self.localizedDescription)
        }
    }

    func bleError(errorCode: BleErrorCode,
                  deviceID: String? = nil,
                  serviceUUID: String? = nil,
                  characteristicUUID: String? = nil,
                  descriptorUUID: String? = nil) -> BleError {
        switch self {
        case let error as CBATTError:
            return BleError(errorCode: errorCode,
                            reason: self.localizedDescription,
                            attErrorCode: error.errorCode,
                            iosErrorCode: nil,
                            deviceID: deviceID,
                            serviceUUID: serviceUUID,
                            characteristicUUID: characteristicUUID,
                            descriptorUUID: descriptorUUID)
        case let error as CBError:
            return BleError(errorCode: errorCode,
                            reason: self.localizedDescription,
                            attErrorCode: nil,
                            iosErrorCode: error.errorCode,
                            deviceID: deviceID,
                            serviceUUID: serviceUUID,
                            characteristicUUID: characteristicUUID,
                            descriptorUUID: descriptorUUID)
        default:
            return BleError(errorCode: errorCode,
                            reason: self.localizedDescription,
                            attErrorCode: nil,
                            iosErrorCode: nil,
                            deviceID: deviceID,
                            serviceUUID: serviceUUID,
                            characteristicUUID: characteristicUUID,
                            descriptorUUID: descriptorUUID)
        }
    }
}

extension Optional where Wrapped == Error {
    func bleError(errorCode: BleErrorCode,
                  deviceID: String? = nil,
                  serviceUUID: String? = nil,
                  characteristicUUID: String? = nil,
                  descriptorUUID: String? = nil) -> BleError {

        if let error = self {
            return error.bleError(
                errorCode: errorCode,
                deviceID: deviceID,
                serviceUUID: serviceUUID,
                characteristicUUID:
                characteristicUUID,
                descriptorUUID:
                descriptorUUID)
        }

        return BleError(
            errorCode: errorCode,
            reason: nil,
            attErrorCode: nil,
            iosErrorCode: nil,
            deviceID: deviceID,
            serviceUUID: serviceUUID,
            characteristicUUID: characteristicUUID,
            descriptorUUID: descriptorUUID)
    }
}

extension BluetoothError {
    var bleError: BleError {
        switch self {
        case .bluetoothUnsupported:
            return BleError(errorCode: .BluetoothUnsupported)
        case .bluetoothUnauthorized:
            return BleError(errorCode: .BluetoothUnauthorized)
        case .bluetoothPoweredOff:
            return BleError(errorCode: .BluetoothPoweredOff)
        case .bluetoothInUnknownState:
            return BleError(errorCode: .BluetoothInUnknownState)
        case .bluetoothResetting:
            return BleError(errorCode: .BluetoothResetting)

        case let .peripheralConnectionFailed(peripheral, error):
            return error.bleError(errorCode: .DeviceConnectionFailed, deviceID: peripheral.identifier.uuidString)
        case let .peripheralDisconnected(peripheral, error):
            return error.bleError(errorCode: .DeviceDisconnected, deviceID: peripheral.identifier.uuidString)
        case let .peripheralRSSIReadFailed(peripheral, error):
            return error.bleError(errorCode: .DeviceRSSIReadFailed, deviceID: peripheral.identifier.uuidString)

        case let .servicesDiscoveryFailed(peripheral, error):
            return error.bleError(errorCode: .ServicesDiscoveryFailed, deviceID: peripheral.identifier.uuidString)

        case let .includedServicesDiscoveryFailed(service, error):
            return error.bleError(errorCode: .IncludedServicesDiscoveryFailed,
                                  deviceID: service.peripheral.identifier.uuidString,
                                  serviceUUID: service.identifier.uuidString)

        case let .characteristicsDiscoveryFailed(service, error):
            return error.bleError(errorCode: .CharacteristicsDiscoveryFailed,
                                  deviceID: service.peripheral.identifier.uuidString,
                                  serviceUUID: service.uuid.fullUUIDString)
        case let .characteristicWriteFailed(characteristic, error):
            return error.bleError(errorCode: .CharacteristicWriteFailed,
                                  deviceID: characteristic.service.peripheral.identifier.uuidString,
                                  serviceUUID: characteristic.service.uuid.fullUUIDString,
                                  characteristicUUID: characteristic.uuid.fullUUIDString)
        case let .characteristicReadFailed(characteristic, error):
            return error.bleError(errorCode: .CharacteristicReadFailed,
                                  deviceID: characteristic.service.peripheral.identifier.uuidString,
                                  serviceUUID: characteristic.service.uuid.fullUUIDString,
                                  characteristicUUID: characteristic.uuid.fullUUIDString)
        case let .characteristicNotifyChangeFailed(characteristic, error):
            return error.bleError(errorCode: .CharacteristicNotifyChangeFailed,
                                  deviceID: characteristic.service.peripheral.identifier.uuidString,
                                  serviceUUID: characteristic.service.uuid.fullUUIDString,
                                  characteristicUUID: characteristic.uuid.fullUUIDString)

        case let .descriptorsDiscoveryFailed(characteristic, error):
            return error.bleError(errorCode: .DescriptorsDiscoveryFailed,
                                  deviceID: characteristic.service.peripheral.identifier.uuidString,
                                  serviceUUID: characteristic.service.uuid.fullUUIDString,
                                  characteristicUUID: characteristic.uuid.fullUUIDString)
        case let .descriptorWriteFailed(descriptor, error):
            return error.bleError(errorCode: .DescriptorWriteFailed,
                                  deviceID: descriptor.characteristic.service.peripheral.identifier.uuidString,
                                  serviceUUID: descriptor.characteristic.service.uuid.fullUUIDString,
                                  characteristicUUID: descriptor.characteristic.uuid.fullUUIDString,
                                  descriptorUUID: descriptor.uuid.fullUUIDString)
        case let .descriptorReadFailed(descriptor, error):
            return error.bleError(errorCode: .DescriptorReadFailed,
                                  deviceID: descriptor.characteristic.service.peripheral.identifier.uuidString,
                                  serviceUUID: descriptor.characteristic.service.uuid.fullUUIDString,
                                  characteristicUUID: descriptor.characteristic.uuid.fullUUIDString,
                                  descriptorUUID: descriptor.uuid.fullUUIDString)
        case .destroyed:
            return BleError(errorCode: .BluetoothManagerDestroyed)
        default:
            return BleError(errorCode: .UnknownError)
        }
    }
}

extension BleError {
    static func cancelled() -> BleError { return BleError(errorCode: .OperationCancelled) }
    static func invalidIdentifiers(_ id: String) -> BleError { return invalidIdentifiers([id]) }
    static func invalidIdentifiers(_ ids: [String]) -> BleError { return BleError(errorCode: .InvalidIdentifiers, internalMessage: ids.joined(separator: ", ")) }
    static func peripheralNotFound(_ uuid: String) -> BleError { return BleError(errorCode: .DeviceNotFound, deviceID: uuid) }
    static func peripheralNotConnected(_ uuid: String) -> BleError { return BleError(errorCode: .DeviceNotConnected, deviceID: uuid) }
    static func characteristicNotFound(_ uuid: String) -> BleError { return BleError(errorCode: .CharacteristicNotFound, characteristicUUID: uuid) }
    static func descriptorNotFound(_ uuid: String) -> BleError { return BleError(errorCode: .DescriptorNotFound, descriptorUUID: uuid) }

    static func invalidWriteDataForCharacteristic(_ uuid: String, data: String) -> BleError {
        return BleError(errorCode: .CharacteristicInvalidDataFormat, characteristicUUID: uuid, internalMessage: data)
    }
    static func invalidWriteDataForDescriptor(_ uuid: String, data: String) -> BleError {
        return BleError(errorCode: .DescriptorInvalidDataFormat, characteristicUUID: uuid, internalMessage: data)
    }
    static func descriptorWriteNotAllowed(_ uuid: String) -> BleError {
        return BleError(errorCode: .DescriptorWriteNotAllowed, descriptorUUID: uuid)
    }
    static func serviceNotFound(_ uuid: String) -> BleError { return BleError(errorCode: .ServiceNotFound, serviceUUID: uuid) }
}
