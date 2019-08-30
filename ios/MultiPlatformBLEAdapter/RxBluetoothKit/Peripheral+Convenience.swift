// The MIT License (MIT)
//
// Copyright (c) 2016 Polidea
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import Foundation
import CoreBluetooth

// swiftlint:disable line_length

extension Peripheral {

    /// Function used to receive service with given identifier. It's taken from cache if it's available,
    /// or directly by `discoverServices` call
    /// - Parameter identifier: Unique identifier of Service
    /// - Returns: Observation which emits `Next` event, when specified service has been found.
    /// Immediately after that `.Complete` is emitted.
    public func service(with identifier: ServiceIdentifier) -> Observable<Service> {
        return .deferred { [weak self] in
            guard let strongSelf = self else { throw BluetoothError.destroyed }
            if let services = strongSelf.services,
                let service = services.first(where: { $0.uuid == identifier.uuid }) {
                return .just(service)
            } else {
                return strongSelf.discoverServices([identifier.uuid])
                    .flatMap { Observable.from($0) }
            }
        }
    }

    /// Function used to receive characteristic with given identifier. If it's available it's taken from cache.
    /// Otherwise - directly by `discoverCharacteristics` call
    /// - Parameter identifier: Unique identifier of Characteristic, that has information
    /// about service which characteristic belongs to.
    /// - Returns: Observation which emits `Next` event, when specified characteristic has been found.
    /// Immediately after that `.Complete` is emitted.
    public func characteristic(with identifier: CharacteristicIdentifier) -> Observable<Characteristic> {
        return .deferred { [weak self] in
            guard let strongSelf = self else { throw BluetoothError.destroyed }
            return strongSelf.service(with: identifier.service)
                .flatMap { service -> Observable<Characteristic> in
                    if let characteristics = service.characteristics, let characteristic = characteristics.first(where: {
                        $0.uuid == identifier.uuid
                    }) {
                        return .just(characteristic)
                    }
                    return service.discoverCharacteristics([identifier.uuid])
                        .flatMap { Observable.from($0) }
                }
        }
    }

    /// Function used to receive descriptor with given identifier. If it's available it's taken from cache.
    /// Otherwise - directly by `discoverDescriptor` call
    /// - Parameter identifier: Unique identifier of Descriptor, that has information
    /// about characteristic which descriptor belongs to.
    /// - Returns: Observation which emits `Next` event, when specified descriptor has been found.
    /// Immediately after that `.Complete` is emitted.
    public func descriptor(with identifier: DescriptorIdentifier) -> Observable<Descriptor> {
        return .deferred { [weak self] in
            guard let strongSelf = self else { throw BluetoothError.destroyed }
            return strongSelf.characteristic(with: identifier.characteristic)
                .flatMap { characteristic -> Observable<Descriptor> in
                    if let descriptors = characteristic.descriptors,
                        let descriptor = descriptors.first(where: { $0.uuid == identifier.uuid }) {
                        return .just(descriptor)
                    }
                    return characteristic.discoverDescriptors()
                        .flatMap { Observable.from($0) }
                        .filter { $0.uuid == identifier.uuid }
                        .take(1)
                }
        }
    }

    /// Function that allow to monitor writes that happened for characteristic.
    /// - Parameter identifier: Identifier of characteristic of which value writes should be monitored.
    /// - Returns: Observable that emits `Next` with `Characteristic` instance every time when write has happened.
    /// It's **infinite** stream, so `.Complete` is never called.
    public func monitorWrite(for identifier: CharacteristicIdentifier)
        -> Observable<Characteristic> {
        return characteristic(with: identifier)
            .flatMap { [weak self] in
                self?.monitorWrite(for: $0) ?? .error(BluetoothError.destroyed)
            }
    }

    /// Function that triggers write of data to characteristic. Write is called after subscribtion to `Observable` is made.
    /// Behavior of this function strongly depends on [CBCharacteristicWriteType](https://developer.apple.com/library/ios/documentation/CoreBluetooth/Reference/CBPeripheral_Class/#//apple_ref/swift/enum/c:@E@CBCharacteristicWriteType), so be sure to check this out before usage of the method.
    /// - parameter data: Data that'll be written  written to `Characteristic` instance
    /// - parameter forCharacteristicWithIdentifier: unique identifier of service, which also holds information about service characteristic belongs to.
    /// `Descriptor` instance to write value to.
    /// - parameter type: Type of write operation. Possible values: `.WithResponse`, `.WithoutResponse`
    /// - returns: Observable that emition depends on `CBCharacteristicWriteType` passed to the function call.
    /// Behavior is following:
    /// - `WithResponse` -  Observable emits `Next` with `Characteristic` instance write was confirmed without any errors.
    /// Immediately after that `Complete` is called. If any problem has happened, errors are emitted.
    /// - `WithoutResponse` - Observable emits `Next` with `Characteristic` instance once write was called.
    /// Immediately after that `.Complete` is called. Result of this call is not checked, so as a user you are not sure
    /// if everything completed successfully. Errors are not emitted
    public func writeValue(_ data: Data, for identifier: CharacteristicIdentifier,
                           type: CBCharacteristicWriteType) -> Observable<Characteristic> {
        return characteristic(with: identifier)
            .flatMap { [weak self] in
                self?.writeValue(data, for: $0, type: type) ?? .error(BluetoothError.destroyed)
            }
    }

    /// Function that allow to monitor value updates for `Characteristic` instance.
    /// - Parameter identifier: unique identifier of service, which also holds information about service that characteristic belongs to.
    /// - Returns: Observable that emits `Next` with `Characteristic` instance every time when value has changed.
    /// It's **infinite** stream, so `.Complete` is never called.
    public func monitorValueUpdate(for identifier: CharacteristicIdentifier) -> Observable<Characteristic> {
        return characteristic(with: identifier)
            .flatMap { [weak self] in
                self?.monitorValueUpdate(for: $0) ?? .error(BluetoothError.destroyed)
            }
    }

    /// Function that triggers read of current value of the `Characteristic` instance.
    /// Read is called after subscription to `Observable` is made.
    /// - Parameter identifier: unique identifier of service, which also holds information about service that characteristic belongs to.
    /// - Returns: Observable which emits `Next` with given characteristic when value is ready to read. Immediately after that
    /// `.Complete` is emitted.
    public func readValue(for identifier: CharacteristicIdentifier) -> Observable<Characteristic> {
        return characteristic(with: identifier)
            .flatMap { [weak self] in
                self?.readValue(for: $0) ?? .error(BluetoothError.destroyed)
            }
    }

    /// Function that triggers set of notification state of the `Characteristic`.
    /// This change is called after subscribtion to `Observable` is made.
    /// - warning: This method is not responsible for emitting values every time that `Characteristic` value is changed.
    /// For this, refer to other method: `monitorValueUpdateForCharacteristic(_)`. These two are often called together.
    /// - parameter enabled: New value of notifications state. Specify `true` if you're interested in getting values
    /// - parameter identifier: unique identifier of service, which also holds information about service that characteristic belongs to.
    /// - returns: Observable which emits `Next` with Characteristic that state was changed. Immediately after `.Complete` is emitted
    public func setNotifyValue(_ enabled: Bool, for identifier: CharacteristicIdentifier)
        -> Observable<Characteristic> {
        return characteristic(with: identifier)
            .flatMap { [weak self] in
                self?.setNotifyValue(enabled, for: $0) ?? .error(BluetoothError.destroyed)
            }
    }

    /// Function that triggers set of notification state of the `Characteristic`, and monitor for any incoming updates.
    /// Notification is set after subscribtion to `Observable` is made.
    /// - parameter identifier: unique identifier of service, which also holds information about service that characteristic belongs to.
    /// - returns: Observable which emits `Next`, when characteristic value is updated.
    /// This is **infinite** stream of values.
    public func setNotificationAndMonitorUpdates(for identifier: CharacteristicIdentifier)
        -> Observable<Characteristic> {
        return characteristic(with: identifier)
            .flatMap { [weak self] in
                self?.setNotificationAndMonitorUpdates(for: $0) ?? .error(BluetoothError.destroyed)
            }
    }

    /// Function that triggers descriptors discovery for characteristic
    /// - Parameter characteristic: `Characteristic` instance for which descriptors should be discovered.
    /// - parameter identifier: unique identifier of descriptor, which also holds information about characteristic that descriptor belongs to.
    /// - Returns: Observable that emits `Next` with array of `Descriptor` instances, once they're discovered.
    /// Immediately after that `.Complete` is emitted.
    public func discoverDescriptors(for identifier: CharacteristicIdentifier) ->
        Observable<[Descriptor]> {
        return characteristic(with: identifier)
            .flatMap { [weak self] in
                self?.discoverDescriptors(for: $0) ?? .error(BluetoothError.destroyed)
            }
    }

    /// Function that allow to monitor writes that happened for descriptor.
    /// - parameter identifier: unique identifier of descriptor, which also holds information about characteristic that descriptor belongs to.
    /// - Returns: Observable that emits `Next` with `Descriptor` instance every time when write has happened.
    /// It's **infinite** stream, so `.Complete` is never called.
    public func monitorWrite(for identifier: DescriptorIdentifier) -> Observable<Descriptor> {
        return descriptor(with: identifier)
            .flatMap { [weak self] in
                self?.monitorWrite(for: $0) ?? .error(BluetoothError.destroyed)
            }
    }

    /// Function that triggers write of data to descriptor. Write is called after subscribtion to `Observable` is made.
    /// - Parameter data: `Data` that'll be written to `Descriptor` instance
    /// - parameter identifier: unique identifier of descriptor, which also holds information about characteristic that descriptor belongs to.
    /// - Returns: Observable that emits `Next` with `Descriptor` instance, once value is written successfully.
    /// Immediately after that `.Complete` is emitted.
    public func writeValue(_ data: Data, for identifier: DescriptorIdentifier)
        -> Observable<Descriptor> {
        return descriptor(with: identifier)
            .flatMap { [weak self] in
                self?.writeValue(data, for: $0) ?? .error(BluetoothError.destroyed)
            }
    }

    /// Function that allow to monitor value updates for `Descriptor` instance.
    /// - parameter identifier: unique identifier of descriptor, which also holds information about characteristic that descriptor belongs to.
    /// - Returns: Observable that emits `Next` with `Descriptor` instance every time when value has changed.
    /// It's **infinite** stream, so `.Complete` is never called.
    public func monitorValueUpdate(for identifier: DescriptorIdentifier) -> Observable<Descriptor> {
        return descriptor(with: identifier)
            .flatMap { [weak self] in
                self?.monitorValueUpdate(for: $0) ?? .error(BluetoothError.destroyed)
            }
    }

    /// Function that triggers read of current value of the `Descriptor` instance.
    /// Read is called after subscription to `Observable` is made.
    /// - Parameter descriptor: `Descriptor` to read value from
    /// - Returns: Observable which emits `Next` with given descriptor when value is ready to read. Immediately after that `.Complete` is emitted.
    public func readValue(for identifier: DescriptorIdentifier) -> Observable<Descriptor> {
        return descriptor(with: identifier)
            .flatMap { [weak self] in
                self?.readValue(for: $0) ?? .error(BluetoothError.destroyed)
            }
    }
}
