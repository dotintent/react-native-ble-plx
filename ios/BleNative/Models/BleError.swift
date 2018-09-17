import Foundation
import CoreBluetooth

enum BleErrorCode: Int {
    case unknownError = 0
    case bluetoothManagerDestroyed = 1
    case operationCancelled = 2
    case operationTimedOut = 3
    case operationStartFailed = 4
    case invalidIdentifiers = 5
    case bufferNotExist = 6
    case restoreBufferNotExist = 7
    
    case bluetoothUnsupported = 100
    case bluetoothUnauthorized = 101
    case bluetoothPoweredOff = 102
    case bluetoothInUnknownState = 103
    case bluetoothResetting = 104
    
    case deviceConnectionFailed = 200
    case deviceDisconnected = 201
    case deviceRSSIReadFailed = 202
    case deviceAlreadyConnected = 203
    case deviceNotFound = 204
    case deviceNotConnected = 205
    case deviceMTUChangeFailed = 206
    
    case servicesDiscoveryFailed = 300
    case includedServicesDiscoveryFailed = 301
    case serviceNotFound = 302
    case servicesNotDiscovered = 303
    
    case characteristicsDiscoveryFailed = 400
    case characteristicWriteFailed = 401
    case characteristicReadFailed = 402
    case characteristicNotifyChangeFailed = 403
    case characteristicNotFound = 404
    case characteristicsNotDiscovered = 405
    case characteristicInvalidDataFormat = 406
    
    case descriptorsDiscoveryFailed = 500
    case descriptorWriteFailed = 501
    case descriptorReadFailed = 502
    case descriptorNotFound = 503
    case descriptorsNotDiscovered = 504
    case descriptorInvalidDataFormat = 505
    
    case scanStartFailed = 600
    case locationServicesDisabled = 601
    
    case managerNotFound = 700
    case methodNotSupported = 701
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

extension Error {
    var bleError: BleError {
        switch self {
        case let error as BleError:
            return error
        default:
            return BleError(errorCode: .unknownError, reason: self.localizedDescription)
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

extension BleError {
    static func managerNotFound() -> BleError { return BleError(errorCode: .managerNotFound) }
    static func invalidManagerState(_ state: BleState) -> BleError { return BleError(errorCode: state.errorCode, reason: state.errorReason) }
    static func cancelled() -> BleError { return BleError(errorCode: .operationCancelled) }
    static func invalidIdentifier(_ id: String) -> BleError { return invalidIdentifiers([id]) }
    static func invalidIdentifiers(_ ids: [String]) -> BleError { return BleError(errorCode: .invalidIdentifiers, internalMessage: ids.joined(separator: ", ")) }
    static func scanStartFailed(_ reason: String) -> BleError { return BleError(errorCode: .scanStartFailed, reason: reason)}
    static func peripheralNotFound(_ uuid: String) -> BleError { return BleError(errorCode: .deviceNotFound, deviceID: uuid) }
    static func peripheralAlreadyConnected(_ uuid: String) -> BleError { return BleError(errorCode: .deviceAlreadyConnected, deviceID: uuid) }
    static func peripheralNotConnected(_ uuid: String) -> BleError { return BleError(errorCode: .deviceNotConnected, deviceID: uuid) }
    static func peripheralConnectionFailed(_ uuid: UUID) -> BleError { return BleError(errorCode: .deviceConnectionFailed, deviceID: uuid.uuidString) }
    static func serviceNotFound(_ uuid: String) -> BleError { return BleError(errorCode: .serviceNotFound, serviceUUID: uuid) }
    static func servicesDiscoveryFailed(_ uuid: UUID) -> BleError { return BleError(errorCode: .servicesDiscoveryFailed, deviceID: uuid.uuidString) }
    static func characteristicsDiscoveryFailed(_ uuid: CBUUID) -> BleError { return BleError(errorCode: .characteristicsDiscoveryFailed, serviceUUID: uuid.uuidString)}
    static func characteristicNotFound(_ uuid: String) -> BleError { return BleError(errorCode: .characteristicNotFound, characteristicUUID: uuid) }
    static func characteristicReadFailed(_ characteristic: CBCharacteristic) -> BleError { 
        return BleError(
            errorCode: .characteristicReadFailed, 
            deviceID: characteristic.service.peripheral.identifier.uuidString,
            serviceUUID: characteristic.service.uuid.fullUUIDString,
            characteristicUUID: characteristic.uuid.fullUUIDString
        )
    }
    static func characteristicWriteFailed(_ characteristic: CBCharacteristic) -> BleError {
        return BleError(
            errorCode: .characteristicWriteFailed, 
            deviceID: characteristic.service.peripheral.identifier.uuidString,
            serviceUUID: characteristic.service.uuid.fullUUIDString,
            characteristicUUID: characteristic.uuid.fullUUIDString
        )
    }
    static func characteristicNotifyChangeFailed(_ characteristic: CBCharacteristic) -> BleError {
        return BleError(
            errorCode: .characteristicNotifyChangeFailed,
            deviceID: characteristic.service.peripheral.identifier.uuidString,
            serviceUUID: characteristic.service.uuid.fullUUIDString,
            characteristicUUID: characteristic.uuid.fullUUIDString
        )
    }
    static func invalidWriteDataForCharacteristic(_ uuid: String, data: String) -> BleError {
        return BleError(errorCode: .characteristicInvalidDataFormat, characteristicUUID: uuid, internalMessage: data)
    }
    static func invalidWriteDataForDescriptor(_ uuid: String, data: String) -> BleError {
        return BleError(errorCode: .descriptorInvalidDataFormat, characteristicUUID: uuid, internalMessage: data)
    }
    static func bufferNotExist(_ id: Int32) -> BleError { return BleError(errorCode: .bufferNotExist) }
    static func restoreBufferNotExist() -> BleError { return BleError(errorCode: .restoreBufferNotExist) }
    static func methodNotSupported(reason: String) -> BleError { return BleError(errorCode: .methodNotSupported, reason: reason)}
}

extension BleState {
    var errorCode: BleErrorCode {
        switch self {
        case .poweredOff: return BleErrorCode.bluetoothPoweredOff
        case .resetting: return BleErrorCode.bluetoothResetting
        case .unauthorized: return BleErrorCode.bluetoothUnauthorized
        case .unknown: return BleErrorCode.bluetoothInUnknownState
        case .unsupported: return BleErrorCode.bluetoothUnsupported
        default: fatalError("Cannot create error code for bluetooth state \(self)")
        }
    }
    
    var errorReason: String {
        switch self {
        case .unsupported: return "Bluetooth is unsupported"
        case .unauthorized: return "Bluetooth is unauthorized"
        case .poweredOff: return "Bluetooth is powered off"
        case .unknown: return "Bluetooth is in unknown state"
        case .resetting: return "Bluetooth is resetting"
        default: fatalError("Cannot create error reason for bluetooth state \(self)")
        }
    }
}
