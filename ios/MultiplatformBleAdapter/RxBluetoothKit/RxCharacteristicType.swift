import Foundation
import CoreBluetooth

protocol RxCharacteristicType {
    var objectId: UInt { get }
    var uuid: CBUUID { get }
    var value: Data? { get }
    var isNotifying: Bool { get }
    var properties: CBCharacteristicProperties { get }
    var descriptors: [RxDescriptorType]? { get }
    var service: RxServiceType? { get }

    func isEqualTo(characteristic: RxCharacteristicType) -> Bool
}

extension Equatable where Self: RxCharacteristicType {}

func == (lhs: RxCharacteristicType, rhs: RxCharacteristicType) -> Bool {
    return lhs.isEqualTo(characteristic: rhs)
}

func == (lhs: [RxCharacteristicType], rhs: [RxCharacteristicType]) -> Bool {
    return lhs.count == rhs.count && lhs.starts(with: rhs, by: ==)
}
