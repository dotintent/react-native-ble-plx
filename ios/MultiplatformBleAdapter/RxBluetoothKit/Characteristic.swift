import Foundation
import CoreBluetooth

// swiftlint:disable line_length

/// Characteristic is a class implementing ReactiveX which wraps CoreBluetooth functions related to interaction with [CBCharacteristic](https://developer.apple.com/library/ios/documentation/CoreBluetooth/Reference/CBCharacteristic_Class/)
public class Characteristic {
    let characteristic: RxCharacteristicType
    /// Service which contains this characteristic
    public let service: Service

    /// Current value of characteristic. If value is not present - it's `nil`.
    public var value: Data? {
        return characteristic.value
    }

    /// Unique identifier of an object.
    public var objectId: UInt {
        return characteristic.objectId
    }

    /// The Bluetooth UUID of the `Characteristic` instance.
    public var uuid: CBUUID {
        return characteristic.uuid
    }

    /// Flag which is set to true if characteristic is currently notifying
    public var isNotifying: Bool {
        return characteristic.isNotifying
    }

    /// Properties of characteristic. For more info about this refer to [CBCharacteristicProperties](https://developer.apple.com/library/ios/documentation/CoreBluetooth/Reference/CBCharacteristic_Class/#//apple_ref/c/tdef/CBCharacteristicProperties)
    public var properties: CBCharacteristicProperties {
        return characteristic.properties
    }

    /// Value of this property is an array of `Descriptor` objects. They provide more detailed information about characteristics value.
    public var descriptors: [Descriptor]? {
        return characteristic.descriptors?.map { Descriptor(descriptor: $0, characteristic: self) }
    }

    init(characteristic: RxCharacteristicType, service: Service) {
        self.characteristic = characteristic
        self.service = service
    }

    /// Function that triggers descriptors discovery for characteristic.
    /// - returns: Observable that emits `Next` with array of `Descriptor` instances, once they're discovered.
    /// Immediately after that `.Complete` is emitted.
    public func discoverDescriptors() -> Observable<[Descriptor]> {
        return service.peripheral.discoverDescriptors(for: self)
    }

    /// Function that allow to monitor writes that happened for characteristic.
    /// - Returns: Observable that emits `Next` with `Characteristic` instance every time when write has happened.
    /// It's **infinite** stream, so `.Complete` is never called.
    public func monitorWrite() -> Observable<Characteristic> {
        return service.peripheral.monitorWrite(for: self)
    }

    /// Function that triggers write of data to characteristic. Write is called after subscribtion to `Observable` is made.
    /// Behavior of this function strongly depends on [CBCharacteristicWriteType](https://developer.apple.com/library/ios/documentation/CoreBluetooth/Reference/CBPeripheral_Class/#//apple_ref/swift/enum/c:@E@CBCharacteristicWriteType), so be sure to check this out before usage of the method.
    /// - parameter forCharacteristic: `Descriptor` instance to write value to.
    /// - parameter type: Type of write operation. Possible values: `.WithResponse`, `.WithoutResponse`
    /// - returns: Observable that emition depends on `CBCharacteristicWriteType` passed to the function call.
    /// Behavior is following:
    ///
    /// - `WithResponse` -  Observable emits `Next` with `Characteristic` instance write was confirmed without any errors.
    /// Immediately after that `Complete` is called. If any problem has happened, errors are emitted.
    /// - `WithoutResponse` - Observable emits `Next` with `Characteristic` instance once write was called.
    /// Immediately after that `.Complete` is called. Result of this call is not checked, so as a user you are not sure
    /// if everything completed successfully. Errors are not emitted
    public func writeValue(_ data: Data, type: CBCharacteristicWriteType) -> Observable<Characteristic> {
        return service.peripheral.writeValue(data, for: self, type: type)
    }

    /// Function that allow to monitor value updates for `Characteristic` instance.
    /// - Returns: Observable that emits `Next` with `Characteristic` instance every time when value has changed.
    /// It's **infinite** stream, so `.Complete` is never called.
    public func monitorValueUpdate() -> Observable<Characteristic> {
        return service.peripheral.monitorValueUpdate(for: self)
    }

    /// Function that triggers read of current value of the `Characteristic` instance.
    /// Read is called after subscription to `Observable` is made.
    /// - Returns: Observable which emits `Next` with given characteristic when value is ready to read. Immediately after that
    /// `.Complete` is emitted.
    public func readValue() -> Observable<Characteristic> {
        return service.peripheral.readValue(for: self)
    }

    /// Function that triggers set of notification state of the `Characteristic`.
    /// This change is called after subscribtion to `Observable` is made.
    /// - warning: This method is not responsible for emitting values every time that `Characteristic` value is changed.
    /// For this, refer to other method: `monitorValueUpdateForCharacteristic(_)`. These two are often called together.
    /// - parameter enabled: New value of notifications state. Specify `true` if you're interested in getting values
    /// - returns: Observable which emits `Next` with Characteristic that state was changed. Immediately after `.Complete` is emitted
    public func setNotifyValue(_ enabled: Bool) -> Observable<Characteristic> {
        return service.peripheral.setNotifyValue(enabled, for: self)
    }

    /// Function that triggers set of notification state of the `Characteristic`, and monitor for any incoming updates.
    /// Notification is set after subscribtion to `Observable` is made.
    /// - returns: Observable which emits `Next`, when characteristic value is updated.
    /// This is **infinite** stream of values.

    public func setNotificationAndMonitorUpdates() -> Observable<Characteristic> {
        return service.peripheral.setNotificationAndMonitorUpdates(for: self)
    }
}

extension Characteristic: Equatable {}

/// Compare two characteristics. Characteristics are the same when their UUIDs are the same.
///
/// - parameter lhs: First characteristic to compare
/// - parameter rhs: Second characteristic to compare
/// - returns: True if both characteristics are the same.
public func == (lhs: Characteristic, rhs: Characteristic) -> Bool {
    return lhs.characteristic == rhs.characteristic
}
