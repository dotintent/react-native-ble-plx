import Foundation
import CoreBluetooth

extension BleError {
    var asDataObject: Any {
        return [
            "errorCode": errorCode.rawValue,
            "attErrorCode": attErrorCode,
            "iosErrorCode": iosErrorCode,
            "androidErrorCode": nil,
            "reason": reason,
            "deviceID": deviceID,
            "serviceUUID": serviceUUID,
            "characteristicUUID": characteristicUUID,
            "descriptorUUID": descriptorUUID,
            "internalMessage": internalMessage
        ]
    }
    func asErrorResult() -> Result { 
        return createErrorResult(error: asDataObject)
    }
}

extension BleState {
    var asDataObject: Any {
        switch self {
        case .unknown: return "Unknown"
        case .resetting: return "Resetting"
        case .unsupported: return "Unsupported"
        case .unauthorized: return "Unauthorized"
        case .poweredOff: return "PoweredOff"
        case .poweredOn: return "PoweredOn"
        }
    }
    
    func asSuccessResult() -> Result { return createSuccessResult(data: asDataObject) } 
}

extension CBPeripheral {
    var mtu: Int {
        if #available(iOS 9.0, *) {
            return maximumWriteValueLength(for: .withoutResponse) + 3
        } else {
            return 23
        }
    }
    
    func asDataObject(centralId: Int32) -> Any {
        return [
            "id": identifier.uuidString,
            "centralId": centralId
        ]
    }
    
    func asSuccessResult(centralId: Int32) -> Result { 
        return createSuccessResult(data: asDataObject(centralId: centralId))
    }
}

extension CBService {
    func asDataObject(centralId: Int32) -> Any {
        return [
            "id": ObjectIdGenerators.services.id(for: self),
            "centralId": centralId,
            "uuid": uuid.fullUUIDString,
            "deviceID": peripheral.identifier.uuidString,
            "isPrimary": isPrimary
            ] as [String: Any]
    }
}

extension CBCharacteristic {
    var valueBase64: String? {
        return value?.base64
    }
    
    func asDataObject(centralId: Int32) -> Any {
        return [
            "id": ObjectIdGenerators.characteristics.id(for: self),
            "centralId": centralId,
            "uuid": uuid.fullUUIDString,
            "serviceID": ObjectIdGenerators.services.id(for: service),
            "serviceUUID": service.uuid.fullUUIDString,
            "deviceID": service.peripheral.identifier.uuidString,
            "isReadable": properties.contains(.read),
            "isWritableWithResponse": properties.contains(.write),
            "isWritableWithoutResponse": properties.contains(.writeWithoutResponse),
            "isNotifiable": properties.contains(.notify),
            "isIndicatable": properties.contains(.indicate),
            ] as [String: Any]
    }
    
    func asSuccessResult(centralId: Int32) -> Result {
        return createSuccessResult(
            data: asDataObject(centralId: centralId)
        )
    } 
}

extension ScannedPeripheral {
    var mtu: Int {
        return 23
    }
    
    func asDataObject(centralId: Int32) -> Any {
        var serviceData: [String: String]?
        if let advServiceData = advertisementData[CBAdvertisementDataServiceDataKey] as? [CBUUID: Data] {
            var data = [String: String]()
            for (key, value) in advServiceData {
                data[key.fullUUIDString] = value.base64
            }
            serviceData = data
        }
        
        let manufacturerData = (advertisementData[CBAdvertisementDataManufacturerDataKey] as? Data)?.base64
        
        let serviceUUIDs = (advertisementData[CBAdvertisementDataServiceUUIDsKey] as? [CBUUID])?
            .map { (uuid: CBUUID) in uuid.fullUUIDString }
        
        let overflowServiceUUIDs = (advertisementData[CBAdvertisementDataOverflowServiceUUIDsKey] as? [CBUUID])?
            .map { (uuid: CBUUID) in uuid.fullUUIDString }
        
        let solicitedServiceUUIDs = (advertisementData[CBAdvertisementDataSolicitedServiceUUIDsKey] as? [CBUUID])?
            .map { (uuid: CBUUID) in uuid.fullUUIDString }
        
        return [
            "id": peripheral.identifier.uuidString,
            "centralId": centralId,
            "name": peripheral.name as Any,
            "rssi": rssi,
            "mtu": mtu,
            
            "manufacturerData": manufacturerData as Any,
            "serviceData": serviceData as Any,
            "serviceUUIDs": serviceUUIDs as Any,
            "localName": (advertisementData[CBAdvertisementDataLocalNameKey] as Any?) ?? NSNull(),
            "txPowerLevel": (advertisementData[CBAdvertisementDataTxPowerLevelKey] as Any?) ?? NSNull(),
            "solicitedServiceUUIDs": solicitedServiceUUIDs as Any,
            "isConnectable": (advertisementData[CBAdvertisementDataIsConnectable] as Any?) ?? NSNull(),
            "overflowServiceUUIDs": overflowServiceUUIDs as Any
            ] as [String: Any]
    }
}

extension Buffer {
    func asDataObject(centralId: Int32) -> Any {
        return [
            "id": id,
            "centralId": centralId
            ] as [String: Any]
    }
    
    func asSuccessResult(centralId: Int32) -> Result {
        return createSuccessResult(data: asDataObject(centralId: centralId))
    }
}

extension Dictionary where Key == String {
    var promiseId: String? { return self[CancelOptionKeys.promiseId.rawValue] as? String }
    var timeout: Int? { return self[CancelOptionKeys.timeout.rawValue] as? Int }
    var ignoreCancelled: Bool? { return self[CancelOptionKeys.ignoreCancelled.rawValue] as? Bool }
    var bufferStrategy: BufferActionStrategy? {
        if let strategyString = self[BufferActionKeys.strategy.rawValue] as? String {
            return BufferActionStrategy(rawValue: strategyString)
        }
        return nil
    }
    var bufferPlacement: BufferActionPlacement? {
        if let placementString = self[BufferActionKeys.placement.rawValue] as? String {
            return BufferActionPlacement(rawValue: placementString)
        }
        return nil
    }
    var bufferChunkSize: Int? { return self[BufferActionKeys.chunkSize.rawValue] as? Int }
    var emitCurrentState: Bool? { return self[MonitorStateOptions.emitCurrentState.rawValue] as? Bool }
}
