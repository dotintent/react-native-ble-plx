//
//  BleUtils.swift
//
//  Created by Przemysław Lenart on 20/07/16.
//

import Foundation
import CoreBluetooth

extension Sequence where Iterator.Element == String {
    func toCBUUIDS() -> [CBUUID]? {
        var newUUIDS: [CBUUID] = []
        for uuid in self {
            guard let nsuuid = uuid.toCBUUID() else {
                return nil;
            }
            newUUIDS.append(nsuuid)
        }
        return newUUIDS
    }
}

extension String {
    func toCBUUID() -> CBUUID? {
        let uuid: String
        switch self.count {
        case 4:
            uuid = "0000\(self)-0000-1000-8000-00805f9b34fb"
        case 8:
            uuid = "\(self)-0000-1000-8000-00805f9b34fb"
        default:
            uuid = self
        }
        guard let nsuuid = UUID(uuidString: uuid) else {
            return nil
        }
        return CBUUID(nsuuid: nsuuid)
    }

    var fromBase64: Data? {
        return Data(base64Encoded: self, options: .ignoreUnknownCharacters)
    }
}

extension CBUUID {
    var fullUUIDString: String {
        let native = self.uuidString.lowercased()
        if native.count == 4 {
            return "0000\(native)-0000-1000-8000-00805f9b34fb"
        }
        if native.count == 8 {
            return "\(native)-0000-1000-8000-00805f9b34fb"
        }
        return native
    }
}

extension Data {
    var base64: String {
        // We are using Base64 encoding without line endings.
        return self.base64EncodedString()
    }
}

extension Descriptor {
    struct Constants {
        static let gattDescriptors: [String: String] = [
            "2900": "Characteristic Extended Properties",
            "2901": "Characteristic User Description",
            "2902": "Client Characteristic Configuration",
            "2903": "Server Characteristic Configuration",
            "2904": "Characteristic Presentation Format",
            "2905": "Characteristic Aggregate Format",
            "2906": "Valid Range",
            "2907": "External Report Reference",
            "2908": "Report Reference",
            "2909": "Number of Digitals",
            "290A": "Value Trigger Setting",
            "290B": "Environmental Sensing Configuration",
            "290C": "Environmental Sensing Measurement",
            "290D": "Environmental Sensing Trigger Setting",
            "290E": "Time Trigger Setting",
            "290F": "Complete BR-EDR Transport Block Data",
            "2910": "Observation Schedule",
            "2911": "Valid Range and Accuracy"
        ]
    }

    func convertNSNumberToBase64(_ value: Any) -> String? {
        if let number = value as? NSNumber {
            var data = number.uint16Value.littleEndian
            return Data(bytes: &data, count: 2).base64EncodedString()
        }
        return nil
    }

    func convertStringToBase64(_ value: Any) -> String? {
        if let string = value as? String, let data = string.data(using: .utf8) {
            return data.base64EncodedString()
        }
        return nil
    }

    func convertDataToBase64(_ value: Any) -> String? {
        if let data = value as? Data {
            return data.base64EncodedString()
        }
        return nil
    }
}
