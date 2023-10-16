import Foundation
import CoreBluetooth

// swiftlint:disable line_length
/// Service is a class implementing ReactiveX which wraps CoreBluetooth functions related to interaction with [CBService](https://developer.apple.com/library/ios/documentation/CoreBluetooth/Reference/CBService_Class/)
public class Service {
    let service: RxServiceType

    /// Peripheral to which this service belongs
    public let peripheral: Peripheral

    /// True if service is primary service
    public var isPrimary: Bool {
        return service.isPrimary
    }

    /// Unique identifier of an object.
    public var objectId: UInt {
        return service.objectId
    }

    /// Service's UUID
    public var uuid: CBUUID {
        return service.uuid
    }

    /// Service's included services
    public var includedServices: [Service]? {
        return service.includedServices?.map {
            Service(peripheral: peripheral, service: $0)
        }
    }

    /// Service's characteristics
    public var characteristics: [Characteristic]? {
        return service.characteristics?.map {
            Characteristic(characteristic: $0, service: self)
        }
    }

    init(peripheral: Peripheral, service: RxServiceType) {
        self.service = service
        self.peripheral = peripheral
    }

    /// Function that triggers characteristics discovery for specified Services and identifiers. Discovery is called after
    /// subscribtion to `Observable` is made.
    /// - Parameter identifiers: Identifiers of characteristics that should be discovered. If `nil` - all of the
    /// characteristics will be discovered. If you'll pass empty array - none of them will be discovered.
    /// - Returns: Observable that emits `Next` with array of `Characteristic` instances, once they're discovered.
    /// Immediately after that `.Complete` is emitted.
    public func discoverCharacteristics(_ characteristicUUIDs: [CBUUID]?) -> Observable<[Characteristic]> {
        return peripheral.discoverCharacteristics(characteristicUUIDs, for: self)
    }

    /// Function that triggers included services discovery for specified services. Discovery is called after
    /// subscribtion to `Observable` is made.
    /// - Parameter includedServiceUUIDs: Identifiers of included services that should be discovered. If `nil` - all of the
    /// included services will be discovered. If you'll pass empty array - none of them will be discovered.
    /// - Returns: Observable that emits `Next` with array of `Service` instances, once they're discovered.
    /// Immediately after that `.Complete` is emitted.
    public func discoverIncludedServices(_ includedServiceUUIDs: [CBUUID]?) -> Observable<[Service]> {
        return peripheral.discoverIncludedServices(includedServiceUUIDs, for: self)
    }
}

extension Service: Equatable {}

/// Compare if services are equal. They are if theirs uuids are the same.
/// - parameter lhs: First service
/// - parameter rhs: Second service
/// - returns: True if services are the same.
public func == (lhs: Service, rhs: Service) -> Bool {
    return lhs.service == rhs.service
}
