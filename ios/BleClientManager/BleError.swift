//
//  BleError.swift
//  EmptyProject
//
//  Created by Przemysław Lenart on 25/07/16.
//

import Foundation
import RxBluetoothKit

struct BleError: ErrorType {
  let code: Int
  let message: String
}

extension BleError {
  var toJSResult: [AnyObject] {
    return [self.toJS, NSNull()]
  }
  var toJS: AnyObject {
    return ["name": "BleClientModule", "code": code, "message": message]
  }
  func callReject(reject: Reject) {
    reject("\(self.code)", self.message, nil)
  }
}

extension ErrorType {
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
    case BluetoothUnsupported:
      return BleError(code: 100, message: "Bluetooth is not supported")
    case BluetoothUnauthorized:
      return BleError(code: 101, message: "Bluetooth is unauthorized")
    case BluetoothPoweredOff:
      return BleError(code: 102, message: "Bluetooth is powered off")
    case BluetoothInUnknownState:
      return BleError(code: 103, message: "Bluetooth is in unknown state")
    case BluetoothResetting:
      return BleError(code: 103, message: "Bluetooth is resetting")

    case let PeripheralConnectionFailed(peripheral, error):
      return BleError(code: 200, message: "Connection to \(peripheral.identifier.UUIDString) failed: \(error?.localizedDescription ?? "Unknown reason")")
    case let PeripheralDisconnected(peripheral, error):
      return BleError(code: 201, message: "Disconnection from \(peripheral.identifier.UUIDString) failed: \(error?.localizedDescription ?? "Unknown reason")")
    case let PeripheralRSSIReadFailed(peripheral, error):
      return BleError(code: 202, message: "Failed to read RSSI for \(peripheral.identifier.UUIDString): \(error?.localizedDescription ?? "Unknown reason")")

    case let ServicesDiscoveryFailed(peripheral, error):
      return BleError(code: 300, message: "Failed to discover services for \(peripheral.identifier.UUIDString): \(error?.localizedDescription ?? "Unknown reason")")
    case let IncludedServicesDiscoveryFailed(peripheral, error):
      return BleError(code: 301, message: "Failed to discover included services for \(peripheral.identifier.UUIDString): \(error?.localizedDescription ?? "Unknown reason")")

    case let CharacteristicsDiscoveryFailed(service, error):
      return BleError(code: 400, message: "Failed to discover characteristics for service \(service.UUID.UUIDString): \(error?.localizedDescription ?? "Unknown reason")")
    case let CharacteristicWriteFailed(characteristic, error):
      return BleError(code: 401, message: "Characteristic \(characteristic.UUID.UUIDString) write failed: \(error?.localizedDescription ?? "Unknown reason")")
    case let CharacteristicReadFailed(characteristic, error):
      return BleError(code: 402, message: "Characteristic \(characteristic.UUID.UUIDString) read failed: \(error?.localizedDescription ?? "Unknown reason")")
    case let CharacteristicNotifyChangeFailed(characteristic, error):
      return BleError(code: 403, message: "Characteristic \(characteristic.UUID.UUIDString) notification change failed: \(error?.localizedDescription ?? "Unknown reason")")

    case let DescriptorsDiscoveryFailed(characteristic, error):
      return BleError(code: 403, message: "Descriptors discovery for characteristic \(characteristic.UUID.UUIDString) failed: \(error?.localizedDescription ?? "Unknown reason")")
    case let DescriptorWriteFailed(descriptor, error):
      return BleError(code: 403, message: "Descriptor \(descriptor.UUID.UUIDString) write failed: \(error?.localizedDescription ?? "Unknown reason")")
    case let DescriptorReadFailed(descriptor, error):
      return BleError(code: 403, message: "Descriptor \(descriptor.UUID.UUIDString) read failed: \(error?.localizedDescription ?? "Unknown reason")")
    }
  }
}

extension BleError {
  static func invalidUUID(uuid: String) -> BleError { return invalidUUIDs([uuid]) }
  static func invalidUUIDs(uuids: [String]) -> BleError { return BleError(code: 500, message: "Invalid UUIDs were passed: \(uuids)") }
  static func peripheralNotFound(uuid: String) -> BleError { return BleError(code: 501, message: "Device \(uuid) not found") }
  static func peripheralNotConnected(uuid: String) -> BleError { return BleError(code: 502, message: "Device \(uuid) is not connected") }
  static func characteristicNotFound(uuid: String) -> BleError { return BleError(code: 503, message: "Characteristic \(uuid) not found") }
  static func invalidWriteDataForCharacteristic(uuid: String, data: String) -> BleError { return BleError(code: 504, message: "Invalid value data: \(data) for characteristic \(uuid)")}
}