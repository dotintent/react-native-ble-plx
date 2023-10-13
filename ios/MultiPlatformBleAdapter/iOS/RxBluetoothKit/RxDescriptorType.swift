import Foundation
import CoreBluetooth

protocol RxDescriptorType {

    var objectId: UInt { get }

    var uuid: CBUUID { get }

    var characteristic: RxCharacteristicType? { get }

    var value: Any? { get }

    func isEqualTo(descriptor: RxDescriptorType) -> Bool
}

extension Equatable where Self: RxDescriptorType {}

func == (lhs: RxDescriptorType, rhs: RxDescriptorType) -> Bool {
    return lhs.isEqualTo(descriptor: rhs)
}
