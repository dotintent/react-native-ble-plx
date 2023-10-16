import Foundation
import CoreBluetooth

class RxCBPeripheral: RxPeripheralType {

    let peripheral: CBPeripheral
    private let internalDelegate: InternalPeripheralDelegate

    init(peripheral: CBPeripheral) {
        self.peripheral = peripheral
        internalDelegate = RxCBPeripheral.getInternalPeripheralDelegateRef(cbPeripheral: peripheral)
    }

    deinit {
        RxCBPeripheral.putInternalPeripheralDelegateRef(cbPeripheral: peripheral)
    }

    var identifier: UUID {
        return peripheral.value(forKey: "identifier") as! NSUUID as UUID
    }

    var objectId: UInt {
        return UInt(bitPattern: ObjectIdentifier(peripheral))
    }

    var name: String? {
        return peripheral.name
    }

    var state: CBPeripheralState {
        return peripheral.state
    }

    var services: [RxServiceType]? {
        return peripheral.services?.compactMap(RxCBService.init)
    }

    var canSendWriteWithoutResponse: Bool {
        // Although available since iOS 11.0, on versions < iOS 11.2 canSendWriteWithoutResponse will always
        // return false (on first try). We work around this issue by always returning true for < iOS 11.2.
        // See: https://github.com/Polidea/react-native-ble-plx/issues/365
        if #available(iOS 11.2, *) {
            return peripheral.canSendWriteWithoutResponse
        } else {
            return true
        }
    }

    var rx_didUpdateName: Observable<String?> {
        return internalDelegate.peripheralDidUpdateNameSubject
    }

    var rx_didModifyServices: Observable<([RxServiceType])> {
        return internalDelegate.peripheralDidModifyServicesSubject
    }

    var rx_didReadRSSI: Observable<(Int, Error?)> {
        return internalDelegate.peripheralDidReadRSSISubject
    }

    var rx_didDiscoverServices: Observable<([RxServiceType]?, Error?)> {
        return internalDelegate.peripheralDidDiscoverServicesSubject
    }

    var rx_didDiscoverIncludedServicesForService: Observable<(RxServiceType, Error?)> {
        return internalDelegate.peripheralDidDiscoverIncludedServicesForServiceSubject
    }

    var rx_didDiscoverCharacteristicsForService: Observable<(RxServiceType, Error?)> {
        return internalDelegate.peripheralDidDiscoverCharacteristicsForServiceSubject
    }

    var rx_didUpdateValueForCharacteristic: Observable<(RxCharacteristicType, Error?)> {
        return internalDelegate.peripheralDidUpdateValueForCharacteristicSubject
    }

    var rx_didWriteValueForCharacteristic: Observable<(RxCharacteristicType, Error?)> {
        return internalDelegate.peripheralDidWriteValueForCharacteristicSubject
    }

    var rx_didUpdateNotificationStateForCharacteristic: Observable<(RxCharacteristicType, Error?)> {
        return internalDelegate.peripheralDidUpdateNotificationStateForCharacteristicSubject
    }

    var rx_didDiscoverDescriptorsForCharacteristic: Observable<(RxCharacteristicType, Error?)> {
        return internalDelegate.peripheralDidDiscoverDescriptorsForCharacteristicSubject
    }

    var rx_didUpdateValueForDescriptor: Observable<(RxDescriptorType, Error?)> {
        return internalDelegate.peripheralDidUpdateValueForDescriptorSubject
    }

    var rx_didWriteValueForDescriptor: Observable<(RxDescriptorType, Error?)> {
        return internalDelegate.peripheralDidWriteValueForDescriptorSubject
    }

    var rx_isReadyToSendWriteWithoutResponse: Observable<Bool> {
        return internalDelegate.peripheralIsReadyToSendWriteWithoutResponseSubject
    }

    func discoverServices(_ serviceUUIDs: [CBUUID]?) {
        RxBluetoothKitLog.d("""
                            \(peripheral.logDescription) discoverServices(
                            serviceUUIDs: \(String(describing: serviceUUIDs?.logDescription)))
                            """)
        peripheral.discoverServices(serviceUUIDs)
    }

    func discoverCharacteristics(_ characteristicUUIDs: [CBUUID]?, for service: RxServiceType) {
        let cbService = (service as! RxCBService).service
        RxBluetoothKitLog.d("""
                            \(peripheral.logDescription) discoverCharacteristics(
                            characteristicUUIDs: \(String(describing: characteristicUUIDs?.logDescription)),
                            for: \(cbService.logDescription))
                            """)
        peripheral.discoverCharacteristics(characteristicUUIDs, for: cbService)
    }

    func discoverIncludedServices(_ includedServiceUUIDs: [CBUUID]?, for service: RxServiceType) {
        let cbService = (service as! RxCBService).service
        RxBluetoothKitLog.d("""
                            \(peripheral.logDescription) discoverIncludedServices(
                            includedServiceUUIDs: \(String(describing: includedServiceUUIDs?.logDescription)),
                            for: \(cbService.logDescription))
                            """)
        peripheral.discoverIncludedServices(includedServiceUUIDs, for: cbService)
    }

    func readValue(for characteristic: RxCharacteristicType) {
        let cbcharacteristic = (characteristic as! RxCBCharacteristic).characteristic
        RxBluetoothKitLog.d("""
                            \(peripheral.logDescription) readValue(
                            for: \(cbcharacteristic.logDescription))
                            """)
        peripheral.readValue(for: cbcharacteristic)
    }

    func writeValue(_ data: Data,
                    for characteristic: RxCharacteristicType,
                    type: CBCharacteristicWriteType) {
        let cbcharacteristic = (characteristic as! RxCBCharacteristic).characteristic
        RxBluetoothKitLog.d("""
                            \(peripheral.logDescription) writeValue(
                            data: \(data.logDescription),
                            for: \(cbcharacteristic.logDescription),
                            type: \(type.logDescription))
                            """)
        peripheral.writeValue(data, for: cbcharacteristic, type: type)
    }

    func setNotifyValue(_ enabled: Bool, for characteristic: RxCharacteristicType) {
        let cbcharacteristic = (characteristic as! RxCBCharacteristic).characteristic
        RxBluetoothKitLog.d("""
                            \(peripheral.logDescription) setNotifyValue(
                            enabled: \(enabled),
                            for: \(cbcharacteristic.logDescription))
                            """)
        peripheral.setNotifyValue(enabled, for: cbcharacteristic)
    }

    func discoverDescriptors(for characteristic: RxCharacteristicType) {
        let cbcharacteristic = (characteristic as! RxCBCharacteristic).characteristic
        RxBluetoothKitLog.d("""
                            \(peripheral.logDescription) discoverDescriptors(
                            for: \(cbcharacteristic.logDescription))
                            """)
        peripheral.discoverDescriptors(for: cbcharacteristic)
    }

    func readValue(for descriptor: RxDescriptorType) {
        let cbdescriptor = (descriptor as! RxCBDescriptor).descriptor
        RxBluetoothKitLog.d("""
                            \(peripheral.logDescription) readValue(
                            for: \(cbdescriptor.logDescription))
                            """)
        peripheral.readValue(for: cbdescriptor)
    }

    @available(OSX 10.12, iOS 9.0, *)
    func maximumWriteValueLength(for type: CBCharacteristicWriteType) -> Int {
        return peripheral.maximumWriteValueLength(for: type)
    }

    func writeValue(_ data: Data, for descriptor: RxDescriptorType) {
        let cbdescriptor = (descriptor as! RxCBDescriptor).descriptor
        RxBluetoothKitLog.d("""
                            \(peripheral.logDescription) writeValue(
                            data: \(data.logDescription),
                            for: \(cbdescriptor.logDescription))
                            """)
        peripheral.writeValue(data, for: cbdescriptor)
    }

    func readRSSI() {
        RxBluetoothKitLog.d("\(peripheral.logDescription) readRSSI()")
        peripheral.readRSSI()
    }

    @objc fileprivate class InternalPeripheralDelegate: NSObject, CBPeripheralDelegate {
        let peripheralDidUpdateNameSubject = PublishSubject<String?>()
        let peripheralDidModifyServicesSubject = PublishSubject<([RxServiceType])>()
        let peripheralDidReadRSSISubject = PublishSubject<(Int, Error?)>()
        let peripheralDidDiscoverServicesSubject = PublishSubject<([RxServiceType]?, Error?)>()
        let peripheralDidDiscoverIncludedServicesForServiceSubject = PublishSubject<(RxServiceType, Error?)>()
        let peripheralDidDiscoverCharacteristicsForServiceSubject = PublishSubject<(RxServiceType, Error?)>()
        let peripheralDidUpdateValueForCharacteristicSubject = PublishSubject<(RxCharacteristicType, Error?)>()
        let peripheralDidWriteValueForCharacteristicSubject = PublishSubject<(RxCharacteristicType, Error?)>()
        let peripheralDidUpdateNotificationStateForCharacteristicSubject =
            PublishSubject<(RxCharacteristicType, Error?)>()
        let peripheralDidDiscoverDescriptorsForCharacteristicSubject =
            PublishSubject<(RxCharacteristicType, Error?)>()
        let peripheralDidUpdateValueForDescriptorSubject = PublishSubject<(RxDescriptorType, Error?)>()
        let peripheralDidWriteValueForDescriptorSubject = PublishSubject<(RxDescriptorType, Error?)>()
        let peripheralIsReadyToSendWriteWithoutResponseSubject = PublishSubject<Bool>()

        @objc func peripheralDidUpdateName(_ peripheral: CBPeripheral) {
            RxBluetoothKitLog.d("""
                                \(peripheral.logDescription) didUpdateName(name: \(String(describing: peripheral.name)))
                                """)
            peripheralDidUpdateNameSubject.onNext(peripheral.name)
        }

        @objc func peripheral(_ peripheral: CBPeripheral, didModifyServices invalidatedServices: [CBService]) {
            RxBluetoothKitLog.d("""
                                \(peripheral.logDescription) didModifyServices(services:
                                [\(invalidatedServices.logDescription))]
                                """)
            peripheralDidModifyServicesSubject.onNext(invalidatedServices.compactMap(RxCBService.init))
        }

        @objc func peripheral(_ peripheral: CBPeripheral, didReadRSSI rssi: NSNumber, error: Error?) {
            RxBluetoothKitLog.d("""
                                \(peripheral.logDescription) didReadRSSI(rssi: \(rssi),
                                error: \(String(describing: error)))
                                """)
            peripheralDidReadRSSISubject.onNext((rssi.intValue, error))
        }

        @objc func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
            RxBluetoothKitLog.d("""
                                \(peripheral.logDescription) didDiscoverServices(services
                                : \(String(describing: peripheral.services?.logDescription)),
                                error: \(String(describing: error)))
                                """)
            peripheralDidDiscoverServicesSubject.onNext((peripheral.services?.compactMap(RxCBService.init), error))
        }

        @objc func peripheral(_ peripheral: CBPeripheral,
                              didDiscoverIncludedServicesFor service: CBService,
                              error: Error?) {
            RxBluetoothKitLog.d("""
                                \(peripheral.logDescription) didDiscoverIncludedServices(for:
                                \(service.logDescription), includedServices:
                                \(String(describing: service.includedServices?.logDescription)),
                                error: \(String(describing: error)))
                                """)
            peripheralDidDiscoverIncludedServicesForServiceSubject.onNext((RxCBService(service: service), error))
        }

        @objc func peripheral(_ peripheral: CBPeripheral,
                              didDiscoverCharacteristicsFor service: CBService,
                              error: Error?) {
            RxBluetoothKitLog.d("""
                                \(peripheral.logDescription) didDiscoverCharacteristicsFor(for:
                                \(service.logDescription), characteristics:
                                \(String(describing: service.characteristics?.logDescription)),
                                error: \(String(describing: error)))
                                """)
            peripheralDidDiscoverCharacteristicsForServiceSubject.onNext((RxCBService(service: service), error))
        }

        @objc func peripheral(_ peripheral: CBPeripheral,
                              didUpdateValueFor characteristic: CBCharacteristic,
                              error: Error?) {
            RxBluetoothKitLog.d("""
                                \(peripheral.logDescription) didUpdateValueFor(for:\(characteristic.logDescription),
                                value: \(String(describing: characteristic.value?.logDescription)),
                                error: \(String(describing: error)))
                                """)
            peripheralDidUpdateValueForCharacteristicSubject
                .onNext((RxCBCharacteristic(characteristic: characteristic), error))
        }

        @objc func peripheral(_ peripheral: CBPeripheral,
                              didWriteValueFor characteristic: CBCharacteristic,
                              error: Error?) {
            RxBluetoothKitLog.d("""
                                \(peripheral.logDescription) didWriteValueFor(for:\(characteristic.logDescription),
                                value: \(String(describing: characteristic.value?.logDescription)),
                                error: \(String(describing: error)))
                                """)
            peripheralDidWriteValueForCharacteristicSubject
                .onNext((RxCBCharacteristic(characteristic: characteristic), error))
        }

        @objc func peripheral(_ peripheral: CBPeripheral,
                              didUpdateNotificationStateFor characteristic: CBCharacteristic,
                              error: Error?) {
            RxBluetoothKitLog.d("""
                                \(peripheral.logDescription) didUpdateNotificationStateFor(
                                for:\(characteristic.logDescription), isNotifying: \(characteristic.isNotifying),
                                error: \(String(describing: error)))
                                """)
            peripheralDidUpdateNotificationStateForCharacteristicSubject
                .onNext((RxCBCharacteristic(characteristic: characteristic), error))
        }

        @objc func peripheral(_ peripheral: CBPeripheral,
                              didDiscoverDescriptorsFor characteristic: CBCharacteristic,
                              error: Error?) {
            RxBluetoothKitLog.d("""
                                \(peripheral.logDescription) didDiscoverDescriptorsFor
                                (for:\(characteristic.logDescription), descriptors:
                                \(String(describing: characteristic.descriptors?.logDescription)),
                                error: \(String(describing: error)))
                                """)
            peripheralDidDiscoverDescriptorsForCharacteristicSubject
                .onNext((RxCBCharacteristic(characteristic: characteristic), error))
        }

        @objc func peripheral(_ peripheral: CBPeripheral,
                              didUpdateValueFor descriptor: CBDescriptor,
                              error: Error?) {
            RxBluetoothKitLog.d("""
                                \(peripheral.logDescription) didUpdateValueFor(for:\(descriptor.logDescription),
                                value: \(String(describing: descriptor.value)), error: \(String(describing: error)))
                                """)
            peripheralDidUpdateValueForDescriptorSubject.onNext((RxCBDescriptor(descriptor: descriptor), error))
        }

        @objc func peripheral(_ peripheral: CBPeripheral,
                              didWriteValueFor descriptor: CBDescriptor,
                              error: Error?) {
            RxBluetoothKitLog.d("""
                                \(peripheral.logDescription) didWriteValueFor(for:\(descriptor.logDescription),
                                error: \(String(describing: error)))
                                """)
            peripheralDidWriteValueForDescriptorSubject.onNext((RxCBDescriptor(descriptor: descriptor), error))
        }

        @objc func peripheralIsReady(toSendWriteWithoutResponse peripheral: CBPeripheral) {
            //resolve build errors with XCode 11 / iOS 13
            let canSendWriteWithoutResponse: Bool
            if #available(iOS 11.2, *) {
                canSendWriteWithoutResponse = peripheral.canSendWriteWithoutResponse
            } else {
                canSendWriteWithoutResponse = true
            }
            RxBluetoothKitLog.d("\(peripheral.logDescription) peripheralIsReady(toSendWriteWithoutResponse:\(canSendWriteWithoutResponse)")
            peripheralIsReadyToSendWriteWithoutResponseSubject.onNext(canSendWriteWithoutResponse)
        }
    }

    fileprivate class InternalPeripheralDelegateWrapper {
        fileprivate let delegate: InternalPeripheralDelegate
        fileprivate var refCount: Int

        fileprivate init(delegate: InternalPeripheralDelegate) {
            self.delegate = delegate
            refCount = 1
        }
    }

    private static let internalPeripheralDelegateWrappersLock = NSLock()
    private static var internalPeripheralDelegateWrappers = [CBPeripheral: InternalPeripheralDelegateWrapper]()

    private static func getInternalPeripheralDelegateRef(cbPeripheral: CBPeripheral) -> InternalPeripheralDelegate {
        internalPeripheralDelegateWrappersLock.lock(); defer { internalPeripheralDelegateWrappersLock.unlock() }

        if let wrapper = internalPeripheralDelegateWrappers[cbPeripheral] {
            wrapper.refCount += 1
            return wrapper.delegate
        } else {
            let delegate = InternalPeripheralDelegate()
            cbPeripheral.delegate = delegate
            internalPeripheralDelegateWrappers[cbPeripheral] = InternalPeripheralDelegateWrapper(delegate: delegate)
            return delegate
        }
    }

    fileprivate static func putInternalPeripheralDelegateRef(cbPeripheral: CBPeripheral) {
        internalPeripheralDelegateWrappersLock.lock(); defer { internalPeripheralDelegateWrappersLock.unlock() }

        if let wrapper = internalPeripheralDelegateWrappers[cbPeripheral] {
            wrapper.refCount -= 1
            if wrapper.refCount == 0 {
                cbPeripheral.delegate = nil
                internalPeripheralDelegateWrappers[cbPeripheral] = nil
            }
        } else {
            fatalError("Implementation error: internal delegate for CBPeripheral is cached in memory")
        }
    }
}
