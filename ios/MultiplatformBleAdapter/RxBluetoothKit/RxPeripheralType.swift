import Foundation
import CoreBluetooth

protocol RxPeripheralType {

    var name: String? { get }

    var identifier: UUID { get }

    var objectId: UInt { get }

    var peripheral: CBPeripheral { get }

    var state: CBPeripheralState { get }

    var services: [RxServiceType]? { get }

    var canSendWriteWithoutResponse: Bool { get }

    var rx_didUpdateName: Observable<String?> { get }

    var rx_didModifyServices: Observable<([RxServiceType])> { get }

    var rx_didReadRSSI: Observable<(Int, Error?)> { get }

    var rx_didDiscoverServices: Observable<([RxServiceType]?, Error?)> { get }

    var rx_didDiscoverIncludedServicesForService: Observable<(RxServiceType, Error?)> { get }

    var rx_didDiscoverCharacteristicsForService: Observable<(RxServiceType, Error?)> { get }

    var rx_didUpdateValueForCharacteristic: Observable<(RxCharacteristicType, Error?)> { get }

    var rx_didWriteValueForCharacteristic: Observable<(RxCharacteristicType, Error?)> { get }

    var rx_didUpdateNotificationStateForCharacteristic: Observable<(RxCharacteristicType, Error?)> { get }

    var rx_didDiscoverDescriptorsForCharacteristic: Observable<(RxCharacteristicType, Error?)> { get }

    var rx_didUpdateValueForDescriptor: Observable<(RxDescriptorType, Error?)> { get }

    var rx_didWriteValueForDescriptor: Observable<(RxDescriptorType, Error?)> { get }

    var rx_isReadyToSendWriteWithoutResponse: Observable<Bool> { get }

    func discoverServices(_ serviceUUIDs: [CBUUID]?)

    func discoverCharacteristics(_ characteristicUUIDs: [CBUUID]?, for service: RxServiceType)

    func discoverIncludedServices(_ includedServiceUUIDs: [CBUUID]?, for service: RxServiceType)

    func readValue(for characteristic: RxCharacteristicType)

    @available(OSX 10.12, iOS 9.0, *)
    func maximumWriteValueLength(for type: CBCharacteristicWriteType) -> Int

    func writeValue(_ data: Data,
                    for characteristic: RxCharacteristicType,
                    type: CBCharacteristicWriteType)

    func setNotifyValue(_ enabled: Bool, for characteristic: RxCharacteristicType)

    func discoverDescriptors(for characteristic: RxCharacteristicType)

    func readValue(for descriptor: RxDescriptorType)

    func writeValue(_ data: Data, for descriptor: RxDescriptorType)

    func readRSSI()
}

extension Equatable where Self: RxPeripheralType {}

func == (lhs: RxPeripheralType, rhs: RxPeripheralType) -> Bool {
    return lhs.identifier == rhs.identifier
}
