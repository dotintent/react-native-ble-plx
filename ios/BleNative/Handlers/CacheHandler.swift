import Foundation
import CoreBluetooth

class CacheHandler {
    private var discoveredServices = [Int32: CBService]()
    
    private var discoveredCharacteristics = [Int32: CBCharacteristic]()
    
    func addService(_ service: CBService) {
        discoveredServices[ObjectIdGenerators.services.id(for: service)] = service
    }
    
    func addCharacteristic(_ characteristic: CBCharacteristic) {
        discoveredCharacteristics[ObjectIdGenerators.characteristics.id(for: characteristic)] = characteristic
    }
    
    func service(forId id: Int32) -> CBService? {
        return discoveredServices[id]
    }
    
    func characteristic(forId id: Int32) -> CBCharacteristic? {
        return discoveredCharacteristics[id]
    }
    
    func clearForPeripheral(_ peripheral: CBPeripheral) {
        for (key, value) in discoveredCharacteristics where value.service.peripheral == peripheral {
            discoveredCharacteristics[key] = nil
        }
        for (key, value) in discoveredServices where value.peripheral == peripheral {
            discoveredServices[key] = nil
        }
    }
}
