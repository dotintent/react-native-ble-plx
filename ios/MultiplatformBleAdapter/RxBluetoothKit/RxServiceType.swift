import Foundation
import CoreBluetooth

protocol RxServiceType {
    var objectId: UInt { get }
    var uuid: CBUUID { get }
    var characteristics: [RxCharacteristicType]? { get }
    var includedServices: [RxServiceType]? { get }
    var isPrimary: Bool { get }
    func isEqualTo(service: RxServiceType) -> Bool
}

extension Equatable where Self: RxServiceType {}

func == (lhs: RxServiceType, rhs: RxServiceType) -> Bool {
    return lhs.isEqualTo(service: rhs)
}

func == (lhs: [RxServiceType], rhs: [RxServiceType]) -> Bool {
    return lhs.count == rhs.count && lhs.starts(with: rhs, by: ==)
}
