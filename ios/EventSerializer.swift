import Foundation
@preconcurrency import CoreBluetooth

// MARK: - Sendable value types extracted from CB objects

/// Sendable snapshot of a peripheral's state
struct PeripheralSnapshot: Sendable {
    let id: String
    let name: String?
    let rssi: Int
    let mtu: Int
    let isConnectable: Bool?
    let serviceUuids: [String]
    let manufacturerData: String? // Base64

    func toDictionary() -> [String: Any] {
        var dict: [String: Any] = [
            "id": id,
            "name": name as Any,
            "rssi": rssi,
            "mtu": mtu,
            "isConnectable": isConnectable as Any,
            "serviceUuids": serviceUuids,
            "manufacturerData": manufacturerData as Any
        ]
        return dict
    }
}

/// Sendable snapshot of a characteristic
struct CharacteristicSnapshot: Sendable {
    let deviceId: String
    let serviceUuid: String
    let uuid: String
    let value: String? // Base64
    let isNotifying: Bool
    let isIndicatable: Bool
    let isReadable: Bool
    let isWritableWithResponse: Bool
    let isWritableWithoutResponse: Bool

    func toDictionary() -> [String: Any] {
        return [
            "deviceId": deviceId,
            "serviceUuid": serviceUuid,
            "uuid": uuid,
            "value": value as Any,
            "isNotifying": isNotifying,
            "isIndicatable": isIndicatable,
            "isReadable": isReadable,
            "isWritableWithResponse": isWritableWithResponse,
            "isWritableWithoutResponse": isWritableWithoutResponse
        ]
    }
}

/// Sendable scan result
struct ScanResultSnapshot: Sendable {
    let id: String
    let name: String?
    let rssi: Int
    let serviceUuids: [String]
    let manufacturerData: String? // Base64

    func toDictionary() -> [String: Any] {
        return [
            "id": id,
            "name": name as Any,
            "rssi": rssi,
            "serviceUuids": serviceUuids,
            "manufacturerData": manufacturerData as Any
        ]
    }
}

// MARK: - EventSerializer

/// Extracts Sendable values from CoreBluetooth objects.
/// NEVER pass CBPeripheral or CBCharacteristic across actor boundaries.
enum EventSerializer {

    /// Create a PeripheralSnapshot from a CBPeripheral.
    /// Must be called on the CB queue (same actor context as the peripheral).
    static func snapshot(
        from peripheral: CBPeripheral,
        rssi: Int = 0,
        advertisementData: [String: Any]? = nil
    ) -> PeripheralSnapshot {
        let name = peripheral.name
        let id = peripheral.identifier.uuidString

        var serviceUuids: [String] = []
        if let adServices = advertisementData?[CBAdvertisementDataServiceUUIDsKey] as? [CBUUID] {
            serviceUuids = adServices.map { $0.uuidString }
        } else if let services = peripheral.services {
            serviceUuids = services.map { $0.uuid.uuidString }
        }

        var manufacturerData: String? = nil
        if let data = advertisementData?[CBAdvertisementDataManufacturerDataKey] as? Data {
            manufacturerData = data.base64EncodedString()
        }

        let isConnectable = advertisementData?[CBAdvertisementDataIsConnectable] as? Bool

        let mtu = peripheral.maximumWriteValueLength(for: .withoutResponse) + 3

        return PeripheralSnapshot(
            id: id,
            name: name,
            rssi: rssi,
            mtu: mtu,
            isConnectable: isConnectable,
            serviceUuids: serviceUuids,
            manufacturerData: manufacturerData
        )
    }

    /// Create a CharacteristicSnapshot from a CBCharacteristic
    /// Must be called on the CB queue.
    static func snapshot(
        from characteristic: CBCharacteristic,
        deviceId: String
    ) -> CharacteristicSnapshot {
        let value = characteristic.value?.base64EncodedString()
        let props = characteristic.properties

        return CharacteristicSnapshot(
            deviceId: deviceId,
            serviceUuid: characteristic.service?.uuid.uuidString ?? "",
            uuid: characteristic.uuid.uuidString,
            value: value,
            isNotifying: characteristic.isNotifying,
            isIndicatable: props.contains(.indicate),
            isReadable: props.contains(.read),
            isWritableWithResponse: props.contains(.write),
            isWritableWithoutResponse: props.contains(.writeWithoutResponse)
        )
    }

    /// Create a ScanResultSnapshot from peripheral + advertisement data
    static func scanResult(
        from peripheral: CBPeripheral,
        advertisementData: [String: Any],
        rssi: NSNumber
    ) -> ScanResultSnapshot {
        let id = peripheral.identifier.uuidString
        let name = peripheral.name
            ?? advertisementData[CBAdvertisementDataLocalNameKey] as? String

        var serviceUuids: [String] = []
        if let uuids = advertisementData[CBAdvertisementDataServiceUUIDsKey] as? [CBUUID] {
            serviceUuids = uuids.map { $0.uuidString }
        }

        var manufacturerData: String? = nil
        if let data = advertisementData[CBAdvertisementDataManufacturerDataKey] as? Data {
            manufacturerData = data.base64EncodedString()
        }

        return ScanResultSnapshot(
            id: id,
            name: name,
            rssi: rssi.intValue,
            serviceUuids: serviceUuids,
            manufacturerData: manufacturerData
        )
    }

    /// Convert a CBManagerState to the JS state string
    static func stateString(from state: CBManagerState) -> String {
        switch state {
        case .unknown: return "Unknown"
        case .resetting: return "Resetting"
        case .unsupported: return "Unsupported"
        case .unauthorized: return "Unauthorized"
        case .poweredOff: return "PoweredOff"
        case .poweredOn: return "PoweredOn"
        @unknown default: return "Unknown"
        }
    }
}
