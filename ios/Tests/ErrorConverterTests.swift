import XCTest
import CoreBluetooth
@testable import BlePlx

/// Tests for CBError / CBATTError → BleError mapping in ErrorConverter.
final class ErrorConverterTests: XCTestCase {

    // MARK: - CBError → BleErrorCode

    func testConnectionFailedMapsToBleCodeDeviceConnectionFailed() {
        let error = nsError(domain: CBErrorDomain, code: CBError.connectionFailed.rawValue)
        let ble = ErrorConverter.from(cbError: error)
        XCTAssertEqual(ble.code, .deviceConnectionFailed)
    }

    func testConnectionFailedIsRetryable() {
        let error = nsError(domain: CBErrorDomain, code: CBError.connectionFailed.rawValue)
        let ble = ErrorConverter.from(cbError: error)
        XCTAssertTrue(ble.isRetryable)
    }

    func testNotConnectedMapsToDeviceNotConnected() {
        let error = nsError(domain: CBErrorDomain, code: CBError.notConnected.rawValue)
        let ble = ErrorConverter.from(cbError: error)
        XCTAssertEqual(ble.code, .deviceNotConnected)
    }

    func testNotConnectedIsNotRetryable() {
        let error = nsError(domain: CBErrorDomain, code: CBError.notConnected.rawValue)
        let ble = ErrorConverter.from(cbError: error)
        XCTAssertFalse(ble.isRetryable)
    }

    func testPeerRemovedPairingInformationMapsToDeviceBondLost() {
        let error = nsError(domain: CBErrorDomain, code: CBError.peerRemovedPairingInformation.rawValue)
        let ble = ErrorConverter.from(cbError: error)
        XCTAssertEqual(ble.code, .deviceBondLost)
    }

    func testPeerRemovedPairingInformationIsNotRetryable() {
        let error = nsError(domain: CBErrorDomain, code: CBError.peerRemovedPairingInformation.rawValue)
        let ble = ErrorConverter.from(cbError: error)
        XCTAssertFalse(ble.isRetryable)
    }

    func testConnectionLimitReachedMapsToDeviceConnectionFailed() {
        let error = nsError(domain: CBErrorDomain, code: CBError.connectionLimitReached.rawValue)
        let ble = ErrorConverter.from(cbError: error)
        XCTAssertEqual(ble.code, .deviceConnectionFailed)
    }

    func testConnectionLimitReachedIsRetryable() {
        let error = nsError(domain: CBErrorDomain, code: CBError.connectionLimitReached.rawValue)
        let ble = ErrorConverter.from(cbError: error)
        XCTAssertTrue(ble.isRetryable)
    }

    func testOperationNotSupportedMapsToOperationStartFailed() {
        let error = nsError(domain: CBErrorDomain, code: CBError.operationNotSupported.rawValue)
        let ble = ErrorConverter.from(cbError: error)
        XCTAssertEqual(ble.code, .operationStartFailed)
    }

    func testUnknownCBErrorMapsToUnknown() {
        let error = nsError(domain: CBErrorDomain, code: CBError.unknown.rawValue)
        let ble = ErrorConverter.from(cbError: error)
        XCTAssertEqual(ble.code, .unknown)
    }

    // MARK: - CBError context forwarding

    func testCBErrorForwardsDeviceId() {
        let error = nsError(domain: CBErrorDomain, code: CBError.connectionFailed.rawValue)
        let ble = ErrorConverter.from(cbError: error, deviceId: "device-123")
        XCTAssertEqual(ble.deviceId, "device-123")
    }

    func testCBErrorForwardsOperation() {
        let error = nsError(domain: CBErrorDomain, code: CBError.connectionFailed.rawValue)
        let ble = ErrorConverter.from(cbError: error, operation: "connect")
        XCTAssertEqual(ble.operation, "connect")
    }

    func testCBErrorSetsDomain() {
        let error = nsError(domain: CBErrorDomain, code: CBError.notConnected.rawValue)
        let ble = ErrorConverter.from(cbError: error)
        XCTAssertEqual(ble.nativeDomain, CBErrorDomain)
    }

    func testCBErrorSetsNativeCode() {
        let error = nsError(domain: CBErrorDomain, code: CBError.connectionFailed.rawValue)
        let ble = ErrorConverter.from(cbError: error)
        XCTAssertEqual(ble.nativeCode, CBError.connectionFailed.rawValue)
    }

    // MARK: - CBATTError → BleErrorCode

    func testATTErrorWithReadOperationMapsToCharacteristicReadFailed() {
        let error = nsError(domain: CBATTErrorDomain, code: CBATTError.readNotPermitted.rawValue)
        let ble = ErrorConverter.from(cbError: error, operation: "read")
        XCTAssertEqual(ble.code, .characteristicReadFailed)
    }

    func testATTErrorWithWriteOperationMapsToCharacteristicWriteFailed() {
        let error = nsError(domain: CBATTErrorDomain, code: CBATTError.writeNotPermitted.rawValue)
        let ble = ErrorConverter.from(cbError: error, operation: "write")
        XCTAssertEqual(ble.code, .characteristicWriteFailed)
    }

    func testATTErrorWithNotifyOperationMapsToCharacteristicNotifyChangeFailed() {
        let error = nsError(domain: CBATTErrorDomain, code: CBATTError.attributeNotFound.rawValue)
        let ble = ErrorConverter.from(cbError: error, operation: "notify")
        XCTAssertEqual(ble.code, .characteristicNotifyChangeFailed)
    }

    func testATTErrorWithReadDescriptorOperationMapsToDescriptorReadFailed() {
        let error = nsError(domain: CBATTErrorDomain, code: CBATTError.readNotPermitted.rawValue)
        let ble = ErrorConverter.from(cbError: error, operation: "readDescriptor")
        XCTAssertEqual(ble.code, .descriptorReadFailed)
    }

    func testATTErrorWithWriteDescriptorOperationMapsToDescriptorWriteFailed() {
        let error = nsError(domain: CBATTErrorDomain, code: CBATTError.writeNotPermitted.rawValue)
        let ble = ErrorConverter.from(cbError: error, operation: "writeDescriptor")
        XCTAssertEqual(ble.code, .descriptorWriteFailed)
    }

    func testATTErrorWithNoOperationMapsToUnknown() {
        let error = nsError(domain: CBATTErrorDomain, code: CBATTError.readNotPermitted.rawValue)
        let ble = ErrorConverter.from(cbError: error)
        XCTAssertEqual(ble.code, .unknown)
    }

    func testATTErrorSetsAttErrorCode() {
        let error = nsError(domain: CBATTErrorDomain, code: CBATTError.insufficientAuthentication.rawValue)
        let ble = ErrorConverter.from(cbError: error, operation: "read")
        XCTAssertEqual(ble.attErrorCode, CBATTError.insufficientAuthentication.rawValue)
    }

    func testATTErrorSetsDomain() {
        let error = nsError(domain: CBATTErrorDomain, code: CBATTError.readNotPermitted.rawValue)
        let ble = ErrorConverter.from(cbError: error, operation: "read")
        XCTAssertEqual(ble.nativeDomain, CBATTErrorDomain)
    }

    // MARK: - isRetryable for ATT errors

    func testATTInsufficientResourcesIsRetryable() {
        let error = nsError(domain: CBATTErrorDomain, code: CBATTError.insufficientResources.rawValue)
        let ble = ErrorConverter.from(cbError: error, operation: "read")
        XCTAssertTrue(ble.isRetryable)
    }

    func testATTUnlikelyErrorIsRetryable() {
        let error = nsError(domain: CBATTErrorDomain, code: CBATTError.unlikelyError.rawValue)
        let ble = ErrorConverter.from(cbError: error, operation: "read")
        XCTAssertTrue(ble.isRetryable)
    }

    func testATTReadNotPermittedIsNotRetryable() {
        let error = nsError(domain: CBATTErrorDomain, code: CBATTError.readNotPermitted.rawValue)
        let ble = ErrorConverter.from(cbError: error, operation: "read")
        XCTAssertFalse(ble.isRetryable)
    }

    // MARK: - Generic (non-CB, non-ATT) errors

    func testGenericErrorMapsToUnknown() {
        let error = nsError(domain: "com.example.custom", code: 42)
        let ble = ErrorConverter.from(cbError: error)
        XCTAssertEqual(ble.code, .unknown)
        XCTAssertFalse(ble.isRetryable)
        XCTAssertEqual(ble.nativeDomain, "com.example.custom")
        XCTAssertEqual(ble.nativeCode, 42)
    }

    // MARK: - bleStateError

    func testPoweredOnReturnsNil() {
        XCTAssertNil(ErrorConverter.bleStateError(for: .poweredOn))
    }

    func testPoweredOffReturnsBleError() {
        let error = ErrorConverter.bleStateError(for: .poweredOff)
        XCTAssertEqual(error?.code, .bluetoothPoweredOff)
        XCTAssertFalse(error?.isRetryable ?? true)
    }

    func testUnauthorizedReturnsBluetoothUnauthorized() {
        let error = ErrorConverter.bleStateError(for: .unauthorized)
        XCTAssertEqual(error?.code, .bluetoothUnauthorized)
    }

    func testUnsupportedReturnsBluetoothUnsupported() {
        let error = ErrorConverter.bleStateError(for: .unsupported)
        XCTAssertEqual(error?.code, .bluetoothUnsupported)
    }

    func testResettingReturnsBluetoothResettingAndIsRetryable() {
        let error = ErrorConverter.bleStateError(for: .resetting)
        XCTAssertEqual(error?.code, .bluetoothResetting)
        XCTAssertTrue(error?.isRetryable ?? false)
    }

    func testUnknownStateReturnsBluetoothInUnknownState() {
        let error = ErrorConverter.bleStateError(for: .unknown)
        XCTAssertEqual(error?.code, .bluetoothInUnknownState)
    }

    // MARK: - BleError.toDictionary

    func testBleErrorToDictionaryContainsPlatformKey() {
        let err = BleError(code: .deviceConnectionFailed, message: "test")
        let dict = err.toDictionary()
        XCTAssertEqual(dict["platform"] as? String, "ios")
    }

    func testBleErrorToDictionaryContainsCode() {
        let err = BleError(code: .deviceConnectionFailed, message: "test")
        let dict = err.toDictionary()
        XCTAssertEqual(dict["code"] as? Int, BleErrorCode.deviceConnectionFailed.rawValue)
    }

    func testBleErrorToDictionaryContainsIsRetryable() {
        let err = BleError(code: .deviceConnectionFailed, message: "test", isRetryable: true)
        let dict = err.toDictionary()
        XCTAssertEqual(dict["isRetryable"] as? Bool, true)
    }

    // MARK: - Helpers

    private func nsError(domain: String, code: Int) -> NSError {
        return NSError(domain: domain, code: code, userInfo: nil)
    }
}
