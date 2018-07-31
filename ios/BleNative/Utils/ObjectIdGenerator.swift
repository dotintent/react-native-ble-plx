import Foundation
import CoreBluetooth

enum ObjectIdGenerators {
    static let peripherals = ObjectIdGenerator<CBPeripheral>()
    static let services = ObjectIdGenerator<CBService>()
    static let characteristics = ObjectIdGenerator<CBCharacteristic>()
}

class ObjectIdGenerator<Element: Hashable> {         
    private var objectToIdentifier: [Element: Int32] = [:]
    
    private var currentId: Int32 = 0
    
    fileprivate init() {}
    
    func id(for element: Element) -> Int32 {
        if let identifier = objectToIdentifier[element] {
            return identifier
        }
        currentId += 1
        objectToIdentifier[element] = currentId
        return currentId
    }
}
