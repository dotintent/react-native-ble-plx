import Foundation
import CoreBluetooth

extension CentralManager {
    func retrieveCharacteristicForPeripheral(withUuidString uuidString: String,
                                             serviceUUIDString: String,
                                             characteristicUUIDString: String,
                                             callback: Callback,
                                             promiseId: String? = nil) -> CBCharacteristic? {
        guard let peripheral = retrieveConnectedPeripheral(withUuidString: uuidString, callback: callback, promiseId: promiseId) else {
            return nil
        }
        
        guard let serviceCBUUID = serviceUUIDString.toCBUUID() else {
            callback(BleError.invalidIdentifier(serviceUUIDString).asErrorResult())
            return nil
        }
        
        guard let characteristicCBUUID = characteristicUUIDString.toCBUUID() else {
            callback(BleError.invalidIdentifier(characteristicUUIDString).asErrorResult())
            return nil
        }
        
        guard let characteristic = (peripheral.services?
            .first { $0.uuid == serviceCBUUID }?
            .characteristics?
            .first { $0.uuid == characteristicCBUUID }) else {
                callback(BleError.characteristicNotFound(characteristicUUIDString).asErrorResult())
                return nil
        }
        return characteristic
    }
    
    func retrieveCharacteristicForService(withIdentifier serviceIdentifier: Int32,
                                          characteristicUUIDString: String,
                                          callback: Callback,
                                          promiseId: String? = nil) -> CBCharacteristic? {
        guard let characteristicCBUUID = characteristicUUIDString.toCBUUID() else {
            callback(BleError.invalidIdentifier(characteristicUUIDString).asErrorResult())
            return nil
        }
        
        guard let service = cacheHandler.service(forId: serviceIdentifier) else {
            callback(BleError.serviceNotFound(serviceIdentifier.description).asErrorResult())
            return nil
        }
        
        guard let characteristic = (service
            .characteristics?
            .first { $0.uuid == characteristicCBUUID }) else {
                callback(BleError.characteristicNotFound(characteristicUUIDString).asErrorResult())
                return nil
        }
        
        return characteristic
    }
    
    func retrieveCharacteristic(withId characteristicId: Int32, callback: Callback, promiseId: String? = nil) -> CBCharacteristic? {
        guard let characteristic = cacheHandler.characteristic(forId: characteristicId) else {
            callback(BleError.characteristicNotFound(characteristicId.description).asErrorResult())
            return nil
        }
        return characteristic
    }
    
    func retrievePeripheral(withUuidString uuidString: String, callback: Callback, promiseId: String? = nil) -> CBPeripheral? {
        guard let peripheralUuid = UUID(uuidString: uuidString) else {
            callback(BleError.invalidIdentifier(uuidString).asErrorResult())
            return nil
        }
        
        return retrievePeripheral(withUuid: peripheralUuid, callback: callback, promiseId: promiseId)
    }
    
    func retrievePeripheral(withUuid uuid: UUID, callback: Callback, promiseId: String? = nil) -> CBPeripheral? {
        guard let peripheral = manager.retrievePeripherals(withIdentifiers: [uuid]).first else {
            callback(BleError.invalidIdentifier(uuid.uuidString).asErrorResult())
            return nil
        }
        
        return peripheral
    }
    
    func retrieveConnectedPeripheral(withUuidString uuidString: String, callback: Callback, promiseId: String? = nil) -> CBPeripheral? {
        guard let peripheral = retrievePeripheral(withUuidString: uuidString, callback: callback, promiseId: promiseId) else {
            return nil
        }
        
        guard peripheral.state == .connected else {
            callback(BleError.peripheralNotConnected(uuidString).asErrorResult())
            return nil
        }
        
        return peripheral
    }
    
    func ensureState(callback: Callback, promiseId: String? = nil) -> Bool {
        if manager.state != .poweredOn {
            let state = BleState(rawValue: manager.state.rawValue) ?? .unsupported
            callback(BleError.invalidManagerState(state).asErrorResult())
            return false
        }
        return true
    }
    
    func handleOnBufferRemoved(_ buffer: Buffer) {
        switch buffer.type {
        case .scan:
            stopScanningBuffer()
        case .valueChange:
            stopMonitoringBuffer(buffer)
        case .state, .disconnect, .stateRestore, .name: 
            break
        }
    }
    
    func timeout(fromCancelOptions cancelOptions: [String: Any]) -> RequestTimeout? {
        guard let timeout = cancelOptions.timeout else { return nil }
        let ignoreCancelled = cancelOptions.ignoreCancelled ?? false
        return RequestTimeout(timeout: timeout) { [weak self] in
            guard let strongSelf = self else { return }
            if ignoreCancelled, $0.type.isBufferRequest, let buffer = strongSelf.bufferHandler.buffer(forId: $0.relatedIdentifier), let options = $0.options {
                let items = strongSelf.bufferHandler.actionOnBuffer(buffer, options: options, fulfillRequest: false) ?? []
                $0.callback(createSuccessResult(data: items))
            } else {
                $0.callback(BleError.cancelled().asErrorResult())
            }
        }
    }
}
