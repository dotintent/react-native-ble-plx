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
        var serviceData: [String:String]?
        if let advServiceData = advertisementData.serviceData {
            var data = [String:String]()
            for (key, value) in advServiceData {
                data[key.fullUUIDString] = value.base64EncodedStringWithOptions(.EncodingEndLineWithCarriageReturn)
            }
            serviceData = data
        }

        let manufacturerData = advertisementData
            .manufacturerData?
            .base64EncodedStringWithOptions(.EncodingEndLineWithCarriageReturn) ?? NSNull()

        let serviceUUIDs: AnyObject = advertisementData
            .serviceUUIDs?
            .map { (uuid: CBUUID) in uuid.fullUUIDString } ?? NSNull()

        let overflowServiceUUIDs: AnyObject = advertisementData
            .overflowServiceUUIDs?
            .map { (uuid: CBUUID) in uuid.fullUUIDString } ?? NSNull()

        let solicitedServiceUUIDs: AnyObject = advertisementData
            .solicitedServiceUUIDs?
            .map { (uuid: CBUUID) in uuid.fullUUIDString } ?? NSNull()

        return [
            "uuid": peripheral.identifier.UUIDString,
            "name": peripheral.name ?? NSNull(),
            "rssi": RSSI,

            "manufacturerData": manufacturerData,
            "serviceData": serviceData ?? NSNull(),
            "serviceUUIDs": serviceUUIDs,
            "txPowerLevel": advertisementData.txPowerLevel ?? NSNull(),
            "solicitedServiceUUIDs": solicitedServiceUUIDs,
            "isConnectable": advertisementData.isConnectable ?? NSNull(),
            "overflowServiceUUIDs": overflowServiceUUIDs
        ]
    }
}

extension Peripheral {
    var asJSObject: [String:AnyObject] {
        return [
            "uuid": identifier.UUIDString,
            "name": name ?? NSNull(),
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
    var asJSObject: [String:AnyObject] {
        return [
            "uuid": UUID.fullUUIDString,
            "deviceUUID": peripheral.identifier.UUIDString,
            "isPrimary": isPrimary
        ]
    }
}

extension Characteristic {
    var asJSObject: [String:AnyObject] {
        return [
            "uuid": UUID.fullUUIDString,
            "serviceUUID": service.UUID.fullUUIDString,
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

extension BluetoothState {
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
