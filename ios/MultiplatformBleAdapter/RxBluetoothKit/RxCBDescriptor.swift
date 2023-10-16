import Foundation
import CoreBluetooth

class RxCBDescriptor: RxDescriptorType {

    let descriptor: CBDescriptor

    init(descriptor: CBDescriptor) {
        self.descriptor = descriptor
    }

    var objectId: UInt {
        return UInt(bitPattern: ObjectIdentifier(descriptor))
    }

    var uuid: CBUUID {
        return descriptor.uuid
    }

    var characteristic: RxCharacteristicType? {
        return RxCBCharacteristic(characteristic: descriptor.characteristic)
    }

    var value: Any? {
        return descriptor.value
    }

    func isEqualTo(descriptor: RxDescriptorType) -> Bool {
        guard let rhs = descriptor as? RxCBDescriptor else { return false }
        return self.descriptor === rhs.descriptor
    }
}
