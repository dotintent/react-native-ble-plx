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
    var asJSObject: [String:AnyObject] {
        return [
            "uuid": peripheral.identifier.UUIDString,
            "name": peripheral.name ?? NSNull(),
            "rssi": RSSI,
            "isConnectable": advertisementData.isConnectable ?? NSNull()
        ]
    }
}

extension Peripheral {
    var asJSObject: [String:AnyObject] {
        return [
            "uuid": identifier.UUIDString,
            "name": name ?? NSNull(),
            "rssi": NSNull(),
            "isConnectable": NSNull()
        ]
    }
}

extension Service {
    var asJSObject: [String:AnyObject] {
        return [
            "uuid": UUID.UUIDString,
            "deviceUUID": peripheral.identifier.UUIDString,
            "isPrimary": isPrimary
        ]
    }
}

extension Characteristic {
    var asJSObject: [String:AnyObject] {
        return [
            "uuid": UUID.UUIDString,
            "serviceUUID": service.UUID.UUIDString,
            "deviceUUID": service.peripheral.identifier.UUIDString,
            "isReadable": properties.contains(.Read),
            "isWritableWithResponse": properties.contains(.Write),
            "isWritableWithoutResponse": properties.contains(.WriteWithoutResponse),
            "isNotifiable": properties.contains(.Notify),
            "isNotifying": isNotifying,
            "isIndictable": properties.contains(.Indicate),
            "value": valueBase64 ?? NSNull()
        ]
    }
}

extension CBCentralManagerState {
    var asJSObject: String {
        switch self {
        case .Unknown: return "Unknown"
        case .Resetting: return "Resetting"
        case .Unsupported: return "Unsupported"
        case .Unauthorized: return "Unauthorized"
        case .PoweredOff: return "PoweredOff"
        case .PoweredOn: return "PoweredOn"
        }
    }
}

extension Characteristic {
    var valueBase64: String? {
        return value?.base64EncodedStringWithOptions(.EncodingEndLineWithCarriageReturn)
    }
}