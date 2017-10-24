//
//  BleExtensions.swift
//
//  Created by Przemysław Lenart on 05/08/16.
//

import Foundation
import RxBluetoothKit
import CoreBluetooth

extension RestoredState {
    var asJSObject: [AnyHashable: Any] {
        return [
            "connectedPeripherals": peripherals.map { $0.asJSObject() }
        ]
    }
}

extension ScannedPeripheral {

    var mtu: Int {
        if #available(iOS 9.0, *) {
            return peripheral.maximumWriteValueLength(for: .withoutResponse) + 3
        } else {
            return 23
        }
    }

    var asJSObject: [AnyHashable: Any] {
        var serviceData: [String:String]?
        if let advServiceData = advertisementData.serviceData {
            var data = [String:String]()
            for (key, value) in advServiceData {
                data[key.fullUUIDString] = value.base64
            }
            serviceData = data
        }

        let manufacturerData = advertisementData
            .manufacturerData?
            .base64

        let serviceUUIDs = advertisementData
            .serviceUUIDs?
            .map { (uuid: CBUUID) in uuid.fullUUIDString }

        let overflowServiceUUIDs = advertisementData
            .overflowServiceUUIDs?
            .map { (uuid: CBUUID) in uuid.fullUUIDString }

        let solicitedServiceUUIDs = advertisementData
            .solicitedServiceUUIDs?
            .map { (uuid: CBUUID) in uuid.fullUUIDString }

        return [
            "id": peripheral.identifier.uuidString,
            "name": peripheral.name as Any,
            "rssi": rssi,
            "mtu": mtu,

            "manufacturerData": manufacturerData as Any,
            "serviceData": serviceData as Any,
            "serviceUUIDs": serviceUUIDs as Any,
            "localName": advertisementData.localName as Any,
            "txPowerLevel": advertisementData.txPowerLevel as Any,
            "solicitedServiceUUIDs": solicitedServiceUUIDs as Any,
            "isConnectable": advertisementData.isConnectable as Any,
            "overflowServiceUUIDs": overflowServiceUUIDs as Any
        ]
    }
}

extension Peripheral {
    var mtu: Int {
        if #available(iOS 9.0, *) {
            return maximumWriteValueLength(for: .withoutResponse) + 3
        } else {
            return 23
        }
    }

    func asJSObject(withRssi: Int? = nil) -> [AnyHashable: Any] {
        return [
            "id": identifier.uuidString,
            "name": name as Any,
            "rssi": withRssi as Any,
            "mtu": mtu,

            "manufacturerData": NSNull(),
            "serviceData": NSNull(),
            "serviceUUIDs": NSNull(),
            "localName": NSNull(),
            "txPowerLevel": NSNull(),
            "solicitedServiceUUIDs": NSNull(),
            "isConnectable": NSNull(),
            "overflowServiceUUIDs": NSNull()
        ]
    }
}

extension Service {
    var jsIdentifier: Double {
        return Double(UInt64(objectId) & ((1 << 53) - 1))
    }
    var asJSObject: [AnyHashable: Any] {
        return [
            "id": jsIdentifier,
            "uuid": uuid.fullUUIDString,
            "deviceID": peripheral.identifier.uuidString,
            "isPrimary": isPrimary
        ]
    }
}

extension Characteristic {
    var jsIdentifier: Double {
        return Double(UInt64(objectId) & ((1 << 53) - 1))
    }
    var asJSObject: [AnyHashable: Any] {
        return [
            "id": jsIdentifier,
            "uuid": uuid.fullUUIDString,
            "serviceID": service.jsIdentifier,
            "serviceUUID": service.uuid.fullUUIDString,
            "deviceID": service.peripheral.identifier.uuidString,
            "isReadable": properties.contains(.read),
            "isWritableWithResponse": properties.contains(.write),
            "isWritableWithoutResponse": properties.contains(.writeWithoutResponse),
            "isNotifiable": properties.contains(.notify),
            "isNotifying": isNotifying,
            "isIndictable": properties.contains(.indicate),
            "value": valueBase64 as Any
        ]
    }
}

extension RxBluetoothKitLog.LogLevel {
    var asJSObject: Any {
        switch self {
        case .none: return "None"
        case .verbose: return "Verbose"
        case .debug: return "Debug"
        case .info: return "Info"
        case .warning: return "Warning"
        case .error: return "Error"
        }
    }

    init(jsObject: String) {
        switch jsObject {
        case "Verbose": self = .verbose
        case "Debug": self = .debug
        case "Info": self = .info
        case "Warning": self = .warning
        case "Error": self = .error
        default:
            self = .none
        }
    }
}

extension BluetoothState {
    var asJSObject: Any {
        switch self {
        case .unknown: return "Unknown"
        case .resetting: return "Resetting"
        case .unsupported: return "Unsupported"
        case .unauthorized: return "Unauthorized"
        case .poweredOff: return "PoweredOff"
        case .poweredOn: return "PoweredOn"
        }
    }
}

extension Characteristic {
    var valueBase64: String? {
        return value?.base64
    }
}
