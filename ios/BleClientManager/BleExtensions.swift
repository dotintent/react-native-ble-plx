//
//  BleExtensions.swift
//  BleClientManager
//
//  Created by Przemysław Lenart on 05/08/16.
//  Copyright © 2016 Polidea. All rights reserved.
//

import Foundation
import RxBluetoothKit
import CoreBluetooth

extension ScannedPeripheral {
    var asJSObject: [String: AnyObject] {

        var serviceData: [String:String]?

        if let advServiceData = advertisementData.serviceData {
            var data = [String:String]()
            for (key, value) in advServiceData {
                data[key.fullUUIDString] = value.base64
            }
            serviceData = data
        }

        let manufacturerData = advertisementData.manufacturerData?.base64
        let serviceUUIDs = advertisementData.serviceUUIDs?.map { (uuid: CBUUID) in uuid.fullUUIDString }
        let overflowServiceUUIDs = advertisementData
            .overflowServiceUUIDs?
            .map { (uuid: CBUUID) in uuid.fullUUIDString }
        let solicitedServiceUUIDs = advertisementData
            .solicitedServiceUUIDs?
            .map { (uuid: CBUUID) in uuid.fullUUIDString }

        return [
            "id": peripheral.identifier.uuidString as AnyObject,
            "name": peripheral.name as AnyObject,
            "rssi": rssi,

            "manufacturerData": manufacturerData as AnyObject,
            "serviceData": serviceData as AnyObject,
            "serviceUUIDs": serviceUUIDs as AnyObject,
            "txPowerLevel": advertisementData.txPowerLevel as AnyObject,
            "solicitedServiceUUIDs": solicitedServiceUUIDs as AnyObject,
            "isConnectable": advertisementData.isConnectable as AnyObject,
            "overflowServiceUUIDs": overflowServiceUUIDs as AnyObject
        ]
    }
}

extension Peripheral {
    var asJSObject: [String: AnyObject] {
        return [
            "id": identifier.uuidString as AnyObject,
            "name": name as AnyObject,
            "rssi": NSNull(),

            "manufacturerData": NSNull(),
            "serviceData": NSNull(),
            "serviceUUIDs": NSNull(),
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
    var asJSObject: [String: AnyObject] {
        return [
            "id": jsIdentifier as AnyObject,
            "uuid": uuid.fullUUIDString as AnyObject,
            "deviceID": peripheral.identifier.uuidString as AnyObject,
            "isPrimary": isPrimary as AnyObject
        ]
    }
}

extension Characteristic {
    var jsIdentifier: Double {
        return Double(UInt64(objectId) & ((1 << 53) - 1))
    }
    var asJSObject: [String: AnyObject] {
        return [
            "id": jsIdentifier as AnyObject,
            "uuid": uuid.fullUUIDString as AnyObject,
            "serviceUUID": service.uuid.fullUUIDString as AnyObject,
            "deviceID": service.peripheral.identifier.uuidString as AnyObject,
            "isReadable": properties.contains(.read) as AnyObject,
            "isWritableWithResponse": properties.contains(.write) as AnyObject,
            "isWritableWithoutResponse": properties.contains(.writeWithoutResponse) as AnyObject,
            "isNotifiable": properties.contains(.notify) as AnyObject,
            "isNotifying": isNotifying as AnyObject,
            "isIndictable": properties.contains(.indicate) as AnyObject,
            "value": valueBase64 as AnyObject
        ]
    }
}

extension RxBluetoothKitLog.LogLevel {
    var asJSObject: String {
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
    var asJSObject: String {
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
