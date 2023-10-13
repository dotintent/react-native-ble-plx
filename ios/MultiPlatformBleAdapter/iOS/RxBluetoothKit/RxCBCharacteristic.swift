import Foundation
import CoreBluetooth

class RxCBCharacteristic: RxCharacteristicType {

    let characteristic: CBCharacteristic

    init(characteristic: CBCharacteristic) {
        self.characteristic = characteristic
    }

    init?(characteristic: CBCharacteristic?) {
        guard let characteristic = characteristic else {
            return nil
        }
        self.characteristic = characteristic
    }

    var objectId: UInt {
        return UInt(bitPattern: ObjectIdentifier(characteristic))
    }

    var uuid: CBUUID {
        return characteristic.uuid
    }

    var value: Data? {
        return characteristic.value
    }

    var isNotifying: Bool {
        return characteristic.isNotifying
    }

    var properties: CBCharacteristicProperties {
        return characteristic.properties
    }

    var descriptors: [RxDescriptorType]? {
        return characteristic.descriptors?.map(RxCBDescriptor.init)
    }

    var service: RxServiceType? {
        return RxCBService(service: characteristic.service)
    }

    func isEqualTo(characteristic: RxCharacteristicType) -> Bool {
        guard let rhs = characteristic as? RxCBCharacteristic else { return false }
        return self.characteristic === rhs.characteristic
    }
}
