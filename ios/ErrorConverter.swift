import Foundation
@preconcurrency import CoreBluetooth

// MARK: - BleErrorCode

/// Unified error codes matching the JS-side BleErrorInfo type
enum BleErrorCode: Int, Sendable {
    // General
    case unknown = 0
    case bluetoothManagerDestroyed = 1
    case operationCancelled = 2
    case operationTimedOut = 3
    case operationStartFailed = 4
    case invalidIdentifiers = 5

    // Bluetooth state
    case bluetoothUnsupported = 100
    case bluetoothUnauthorized = 101
    case bluetoothPoweredOff = 102
    case bluetoothInUnknownState = 103
    case bluetoothResetting = 104

    // Device
    case deviceConnectionFailed = 200
    case deviceDisconnected = 201
    case deviceRSSIReadFailed = 202
    case deviceAlreadyConnected = 203
    case deviceNotFound = 204
    case deviceNotConnected = 205
    case deviceMTUChangeFailed = 206
    case deviceBondLost = 207

    // Service/Characteristic
    case servicesDiscoveryFailed = 300
    case includedServicesDiscoveryFailed = 301
    case characteristicsDiscoveryFailed = 302
    case descriptorsDiscoveryFailed = 303
    case servicesNotDiscovered = 304
    case characteristicsNotDiscovered = 305
    case descriptorsNotDiscovered = 306

    // Characteristic operations
    case characteristicReadFailed = 400
    case characteristicWriteFailed = 401
    case characteristicNotifyChangeFailed = 402
    case descriptorReadFailed = 403
    case descriptorWriteFailed = 404

    // L2CAP
    case l2capOpenFailed = 500
    case l2capWriteFailed = 501
    case l2capCloseFailed = 502
    case l2capNotConnected = 503
}

// MARK: - BleError

struct BleError: Error, Sendable {
    let code: BleErrorCode
    let message: String
    let isRetryable: Bool
    let deviceId: String?
    let serviceUuid: String?
    let characteristicUuid: String?
    let operation: String?
    let nativeDomain: String?
    let nativeCode: Int?
    let attErrorCode: Int?

    init(
        code: BleErrorCode,
        message: String,
        isRetryable: Bool = false,
        deviceId: String? = nil,
        serviceUuid: String? = nil,
        characteristicUuid: String? = nil,
        operation: String? = nil,
        nativeDomain: String? = nil,
        nativeCode: Int? = nil,
        attErrorCode: Int? = nil
    ) {
        self.code = code
        self.message = message
        self.isRetryable = isRetryable
        self.deviceId = deviceId
        self.serviceUuid = serviceUuid
        self.characteristicUuid = characteristicUuid
        self.operation = operation
        self.nativeDomain = nativeDomain
        self.nativeCode = nativeCode
        self.attErrorCode = attErrorCode
    }

    /// Convert to dictionary matching JS BleErrorInfo type
    func toDictionary() -> [String: Any] {
        var dict: [String: Any] = [
            "code": code.rawValue,
            "message": message,
            "isRetryable": isRetryable,
            "platform": "ios"
        ]
        dict["deviceId"] = deviceId
        dict["serviceUuid"] = serviceUuid
        dict["characteristicUuid"] = characteristicUuid
        dict["operation"] = operation
        dict["nativeDomain"] = nativeDomain
        dict["nativeCode"] = nativeCode
        dict["gattStatus"] = nil as Int?
        dict["attErrorCode"] = attErrorCode
        return dict
    }
}

// MARK: - ErrorConverter

enum ErrorConverter {

    /// Convert a CBError to a BleError
    static func from(
        cbError: Error,
        deviceId: String? = nil,
        serviceUuid: String? = nil,
        characteristicUuid: String? = nil,
        operation: String? = nil
    ) -> BleError {
        let nsError = cbError as NSError

        // Check for CBATTError first
        if nsError.domain == CBATTErrorDomain {
            return fromATTError(
                nsError: nsError,
                deviceId: deviceId,
                serviceUuid: serviceUuid,
                characteristicUuid: characteristicUuid,
                operation: operation
            )
        }

        // CBError domain
        if nsError.domain == CBErrorDomain {
            return fromCBError(
                nsError: nsError,
                deviceId: deviceId,
                serviceUuid: serviceUuid,
                characteristicUuid: characteristicUuid,
                operation: operation
            )
        }

        // Generic error
        return BleError(
            code: .unknown,
            message: cbError.localizedDescription,
            isRetryable: false,
            deviceId: deviceId,
            serviceUuid: serviceUuid,
            characteristicUuid: characteristicUuid,
            operation: operation,
            nativeDomain: nsError.domain,
            nativeCode: nsError.code
        )
    }

    private static func fromCBError(
        nsError: NSError,
        deviceId: String?,
        serviceUuid: String?,
        characteristicUuid: String?,
        operation: String?
    ) -> BleError {
        let cbCode = CBError.Code(rawValue: nsError.code)
        let isRetryable = isRetryableCBError(cbCode)

        let bleCode: BleErrorCode
        let message: String

        switch cbCode {
        case .unknown:
            bleCode = .unknown
            message = "Unknown CoreBluetooth error"
        case .peerRemovedPairingInformation:
            bleCode = .deviceBondLost
            message = "Peer removed pairing information"
        case .connectionFailed:
            bleCode = .deviceConnectionFailed
            message = "Connection failed"
        case .notConnected:
            bleCode = .deviceNotConnected
            message = "Device is not connected"
        case .connectionLimitReached:
            bleCode = .deviceConnectionFailed
            message = "Connection limit reached"
            return BleError(code: bleCode, message: message, isRetryable: true,
                            deviceId: deviceId, serviceUuid: serviceUuid,
                            characteristicUuid: characteristicUuid, operation: operation,
                            nativeDomain: nsError.domain, nativeCode: nsError.code)
        case .operationNotSupported:
            bleCode = .operationStartFailed
            message = "Operation not supported"
        default:
            bleCode = .unknown
            message = nsError.localizedDescription
        }

        return BleError(
            code: bleCode,
            message: message,
            isRetryable: isRetryable,
            deviceId: deviceId,
            serviceUuid: serviceUuid,
            characteristicUuid: characteristicUuid,
            operation: operation,
            nativeDomain: nsError.domain,
            nativeCode: nsError.code
        )
    }

    private static func fromATTError(
        nsError: NSError,
        deviceId: String?,
        serviceUuid: String?,
        characteristicUuid: String?,
        operation: String?
    ) -> BleError {
        let attCode = nsError.code

        let bleCode: BleErrorCode
        switch operation {
        case "read":
            bleCode = .characteristicReadFailed
        case "write":
            bleCode = .characteristicWriteFailed
        case "notify":
            bleCode = .characteristicNotifyChangeFailed
        case "readDescriptor":
            bleCode = .descriptorReadFailed
        case "writeDescriptor":
            bleCode = .descriptorWriteFailed
        default:
            bleCode = .unknown
        }

        return BleError(
            code: bleCode,
            message: "ATT error: \(nsError.localizedDescription)",
            isRetryable: isRetryableATTError(attCode),
            deviceId: deviceId,
            serviceUuid: serviceUuid,
            characteristicUuid: characteristicUuid,
            operation: operation,
            nativeDomain: nsError.domain,
            nativeCode: nsError.code,
            attErrorCode: attCode
        )
    }

    private static func isRetryableCBError(_ code: CBError.Code?) -> Bool {
        guard let code = code else { return false }
        switch code {
        case .connectionFailed, .connectionLimitReached:
            return true
        default:
            return false
        }
    }

    private static func isRetryableATTError(_ code: Int) -> Bool {
        // ATT errors that may succeed on retry
        switch CBATTError.Code(rawValue: code) {
        case .insufficientResources, .unlikelyError:
            return true
        default:
            return false
        }
    }

    /// Check if the current Bluetooth state allows operations
    static func bleStateError(for state: CBManagerState) -> BleError? {
        switch state {
        case .poweredOn:
            return nil
        case .poweredOff:
            return BleError(code: .bluetoothPoweredOff, message: "Bluetooth is powered off")
        case .unauthorized:
            return BleError(code: .bluetoothUnauthorized, message: "Bluetooth is unauthorized")
        case .unsupported:
            return BleError(code: .bluetoothUnsupported, message: "Bluetooth is unsupported on this device")
        case .resetting:
            return BleError(code: .bluetoothResetting, message: "Bluetooth is resetting", isRetryable: true)
        case .unknown:
            return BleError(code: .bluetoothInUnknownState, message: "Bluetooth state is unknown")
        @unknown default:
            return BleError(code: .bluetoothInUnknownState, message: "Bluetooth state is unknown")
        }
    }
}
