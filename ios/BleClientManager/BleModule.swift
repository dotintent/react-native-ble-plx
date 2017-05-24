//
//  BleModule.swift
//  EmptyProject
//
//  Created by Konrad Rodzik on 7/4/16.
//

import Foundation
import CoreBluetooth
import RxBluetoothKit
import RxSwift

@objc
public protocol BleClientManagerDelegate {
    func dispatchEvent(_ name: String, value: AnyObject)
}

@objc
public class BleClientManager : NSObject {

    public var delegate: BleClientManagerDelegate?

    fileprivate let manager : BluetoothManager

    // Caches
    fileprivate var services = [Double: Service]()
    fileprivate var characteristics = [Double: Characteristic]()
    fileprivate var connectedDevices = Dictionary<UUID, Peripheral>()
    fileprivate var monitoredCharacteristics = Dictionary<Double, Observable<Characteristic>>()

    // Disposables
    fileprivate let disposeBag = DisposeBag()
    fileprivate let scanSubscription = SerialDisposable()
    fileprivate let connectingDevices = DisposableMap<UUID>()
    fileprivate let transactions = DisposableMap<String>()

    // MARK: Public interface

    // Lifecycle -------------------------------------------------------------------------------------------------------

    public init(queue: DispatchQueue) {
        manager = BluetoothManager(queue: queue)
        super.init()

        disposeBag.insert(manager.rx_state.subscribe(onNext: { [weak self] newState in
            self?.onStateChange(newState)
        }))
    }

    open func invalidate() {
        // Disposables
        scanSubscription.disposable = Disposables.create()
        connectingDevices.dispose()
        transactions.dispose()

        // Caches
        services.removeAll()
        characteristics.removeAll()
        connectedDevices.forEach { (_, device) in
            _ = device.cancelConnection().subscribe()
        }
        connectedDevices.removeAll()
        monitoredCharacteristics.removeAll()
    }

    deinit {
        invalidate()
    }

    // Mark: Common ----------------------------------------------------------------------------------------------------

    open func cancelTransaction(_ transactionId: String) {
        transactions.removeDisposable(transactionId)
    }

    // Mark: Monitoring state ------------------------------------------------------------------------------------------

    open func state(_ resolve: Resolve, reject: Reject) {
        resolve(manager.state.asJSObject as AnyObject?)
    }

    fileprivate func onStateChange(_ state: BluetoothState) {
        dispatchEvent(BleEvent.stateChangeEvent, value: state.asJSObject as AnyObject)
    }

    // Mark: Scanning --------------------------------------------------------------------------------------------------

    open func startDeviceScan(_ filteredUUIDs: [String]?, options:[String:AnyObject]?) {

        var rxOptions = [String:AnyObject]()
        if let options = options {
            if ((options["allowDuplicates"]?.isEqual(to: NSNumber(value: true as Bool))) ?? false) {
                rxOptions[CBCentralManagerScanOptionAllowDuplicatesKey] = true as AnyObject?
            }
        }

        var uuids: [CBUUID]? = nil
        if let filteredUUIDs = filteredUUIDs {
            guard let cbuuids = filteredUUIDs.toCBUUIDS() else {
                dispatchEvent(BleEvent.scanEvent, value: BleError.invalidUUIDs(filteredUUIDs).toJSResult)
                return
            }
            uuids = cbuuids
        }

        scanSubscription.disposable = manager.scanForPeripherals(withServices: uuids, options: rxOptions)
            .subscribe(onNext: { [weak self] scannedPeripheral in
                self?.dispatchEvent(BleEvent.scanEvent, value: [NSNull(), scannedPeripheral.asJSObject] as AnyObject)
            }, onError: { [weak self] errorType in
                self?.dispatchEvent(BleEvent.scanEvent, value: errorType.bleError.toJSResult)
            })
    }

    open func stopDeviceScan() {
        scanSubscription.disposable = Disposables.create()
    }

    // Mark: Connection management -------------------------------------------------------------------------------------

    open func connectToDevice(_ deviceIdentifier: String,
                                         options:[String: AnyObject]?,
                                         resolve: @escaping Resolve,
                                          reject: @escaping Reject) {

        guard let deviceId = UUID(uuidString: deviceIdentifier) else {
            BleError.invalidUUID(deviceIdentifier).callReject(reject)
            return
        }

        safeConnectToDevice(deviceId, options: options, promise: SafePromise(resolve: resolve, reject: reject))
    }

    fileprivate func safeConnectToDevice(_ deviceId: UUID,
                                            options: [String:AnyObject]?,
                                           promise: SafePromise) {

        let connectionDisposable = manager.retrievePeripherals(withIdentifiers: [deviceId])
            .flatMap { devices -> Observable<Peripheral> in
                guard let device = devices.first else {
                    return Observable.error(BleError.peripheralNotFound(deviceId.uuidString))
                }
                return Observable.just(device)
            }
            .flatMap { $0.connect() }
            .subscribe(
                onNext: { [weak self] peripheral in
                    self?.connectedDevices[deviceId] = peripheral
                    self?.clearCacheForPeripheral(peripheral: peripheral)
                },
                onError: { error in
                    error.bleError.callReject(promise)
                },
                onCompleted: { [weak self] in
                    if let device = self?.connectedDevices[deviceId] {
                        _ = self?.manager.monitorDisconnection(for: device)
                            .take(1)
                            .subscribe(onNext: { peripheral in
                                self?.onDeviceDisconnected(peripheral)
                            })
                        promise.resolve(device.asJSObject)
                    } else {
                        BleError.peripheralNotFound(deviceId.uuidString).callReject(promise)
                    }
                },
                onDisposed: { [weak self] in
                    self?.connectingDevices.removeDisposable(deviceId)
                    BleError.cancelled().callReject(promise)
                }
        );

        connectingDevices.replaceDisposable(deviceId, disposable: connectionDisposable)
    }

    fileprivate func onDeviceDisconnected(_ device: Peripheral) {
        self.connectedDevices[device.identifier] = nil
        clearCacheForPeripheral(peripheral: device)
        dispatchEvent(BleEvent.disconnectionEvent, value: [NSNull(), device.asJSObject] as AnyObject)
    }

    open func cancelDeviceConnection(_ deviceIdentifier: String, resolve: @escaping Resolve, reject: @escaping Reject) {
        guard let deviceId = UUID(uuidString: deviceIdentifier) else {
            BleError.invalidUUID(deviceIdentifier).callReject(reject)
            return
        }

        if let device = connectedDevices[deviceId] {
            _ = device.cancelConnection()
                .subscribe(
                    onNext: nil,
                    onError: { error in
                        error.bleError.callReject(reject)
                    },
                    onCompleted: { [weak self] in
                        resolve(device.asJSObject)
                        self?.connectedDevices[deviceId] = nil
                    }
            );
        } else {
            connectingDevices.removeDisposable(deviceId)
            BleError.cancelled().callReject(reject)
        }
    }

    open func isDeviceConnected(_ deviceIdentifier: String, resolve: Resolve, reject: Reject) {
        guard let deviceId = UUID(uuidString: deviceIdentifier) else {
            BleError.invalidUUID(deviceIdentifier).callReject(reject)
            return
        }

        if let device = connectedDevices[deviceId] {
            resolve(device.isConnected as AnyObject?)
        } else {
            resolve(false as AnyObject?)
        }
    }

    // Mark: Discovery -------------------------------------------------------------------------------------------------

    open func discoverAllServicesAndCharacteristicsForDevice(_ deviceIdentifier: String,
                                                                        resolve: @escaping Resolve,
                                                                         reject: @escaping Reject) {

        guard let deviceId = UUID(uuidString: deviceIdentifier) else {
            BleError.invalidUUID(deviceIdentifier).callReject(reject)
            return
        }

        guard let device = connectedDevices[deviceId] else {
            BleError.peripheralNotConnected(deviceIdentifier).callReject(reject)
            return
        }

        _ = device.discoverServices(nil)
            .flatMap { [weak self] newServices -> Observable<Service> in
                for service in newServices {
                    self?.services[service.jsIdentifier] = service
                }
                return Observable.from(newServices)
            }
            .flatMap { $0.discoverCharacteristics(nil) }
            .subscribe(
                onNext: { [weak self] newCharacteristics in
                    for characteristic in newCharacteristics {
                        self?.characteristics[characteristic.jsIdentifier] = characteristic
                    }
                },
                onError: { error in error.bleError.callReject(reject) },
                onCompleted: { resolve(device.asJSObject) }
            )
    }

    // Mark: Service and characteristic getters ------------------------------------------------------------------------

    open func servicesForDevice(_ deviceIdentifier: String, resolve: Resolve, reject: Reject) {

        guard let deviceId = UUID(uuidString: deviceIdentifier) else {
            BleError.invalidUUID(deviceIdentifier).callReject(reject)
            return
        }

        guard let device = connectedDevices[deviceId] else {
            BleError.peripheralNotConnected(deviceIdentifier).callReject(reject)
            return
        }

        let services = device.services?.map { [weak self] service in
            self?.services[service.jsIdentifier] = service
            return service.asJSObject
        } ?? []
        resolve(services as AnyObject?)
    }

    open func characteristicsForDevice(_ deviceIdentifier: String,
                                              serviceUUID: String,
                                                  resolve: Resolve,
                                                   reject: Reject) {

        guard let deviceId = UUID(uuidString: deviceIdentifier),
                  let serviceId = serviceUUID.toCBUUID() else {
            BleError.invalidUUIDs([deviceIdentifier, serviceUUID]).callReject(reject)
            return
        }

        guard let device = connectedDevices[deviceId] else {
            BleError.peripheralNotConnected(deviceIdentifier).callReject(reject)
            return
        }

        guard let service = (device.services?.first { serviceId == $0.uuid }) else {
            BleError.serviceNotFound(serviceUUID).callReject(reject)
            return
        }

        characteristicForService(service,
                                 resolve: resolve,
                                 reject: reject)
    }

    open func characteristicsForService(_ serviceIdentifier: Double,
                                                    resolve: Resolve,
                                                     reject: Reject) {
        guard let service = services[serviceIdentifier]  else {
            BleError.invalidID(serviceIdentifier).callReject(reject)
            return
        }

        characteristicForService(service, resolve: resolve, reject: reject)
    }

    fileprivate func characteristicForService(_ service: Service, resolve: Resolve, reject: Reject) {
        let characteristics = service.characteristics?
            .map { [weak self] characteristic in
                self?.characteristics[characteristic.jsIdentifier] = characteristic
                return characteristic.asJSObject
            } ?? []

        resolve(characteristics as AnyObject)
    }

    // Mark: Reading ---------------------------------------------------------------------------------------------------

    open func readCharacteristicForDevice(_ deviceIdentifier: String,
                                                 serviceUUID: String,
                                          characteristicUUID: String,
                                               transactionId: String,
                                                     resolve: @escaping Resolve,
                                                      reject: @escaping Reject) {
        guard let deviceId = UUID(uuidString: deviceIdentifier),
            let serviceId = serviceUUID.toCBUUID(),
            let characteristicId = characteristicUUID.toCBUUID() else {
                BleError.invalidUUIDs([deviceIdentifier, serviceUUID, characteristicUUID]).callReject(reject)
                return
        }

        let observable = characteristicObservable(deviceId,
                                                  serviceUUID: serviceId,
                                                  characteristicUUID: characteristicId)

        safeReadCharacteristicForDevice(observable,
                                        transactionId: transactionId,
                                        promise: SafePromise(resolve: resolve, reject: reject))
    }

    open func readCharacteristicForService(_ serviceIdentifier: Double,
                                            characteristicUUID: String,
                                                 transactionId: String,
                                                       resolve: @escaping Resolve,
                                                        reject: @escaping Reject) {
        guard let characteristicId = characteristicUUID.toCBUUID() else {
                BleError.invalidUUID(characteristicUUID).callReject(reject)
                return
        }

        let observable = characteristicObservable(serviceIdentifier, characteristicUUID: characteristicId)

        safeReadCharacteristicForDevice(observable,
                                        transactionId: transactionId,
                                        promise: SafePromise(resolve: resolve, reject: reject))
    }

    open func readCharacteristic(_ characteristicIdentifier: Double,
                                              transactionId: String,
                                                    resolve: @escaping Resolve,
                                                     reject: @escaping Reject) {
        safeReadCharacteristicForDevice(characteristicObservable(characteristicIdentifier),
                                        transactionId: transactionId,
                                        promise: SafePromise(resolve: resolve, reject: reject))
    }

    fileprivate func safeReadCharacteristicForDevice(_ characteristicObservable: Observable<Characteristic>,
                                                                  transactionId: String,
                                                                        promise: SafePromise) {
        let disposable = characteristicObservable
            .flatMap { $0.readValue() }
            .subscribe(
                onNext: { characteristic in
                    promise.resolve(characteristic.asJSObject)
                },
                onError: { error in
                    error.bleError.callReject(promise)
                },
                onCompleted: nil,
                onDisposed: { [weak self] in
                    self?.transactions.removeDisposable(transactionId)
                    BleError.cancelled().callReject(promise)
                }
            )

        transactions.replaceDisposable(transactionId, disposable: disposable)
    }

    // MARK: Writing ---------------------------------------------------------------------------------------------------

    open func writeCharacteristicForDevice(  _ deviceIdentifier: String,
                                                    serviceUUID: String,
                                             characteristicUUID: String,
                                                    valueBase64: String,
                                                       response: Bool,
                                                  transactionId: String,
                                                        resolve: @escaping Resolve,
                                                         reject: @escaping Reject) {
        guard let deviceId = UUID(uuidString: deviceIdentifier),
              let serviceId = serviceUUID.toCBUUID(),
              let characteristicId = characteristicUUID.toCBUUID() else {
                BleError.invalidUUIDs([deviceIdentifier, serviceUUID, characteristicUUID]).callReject(reject)
                return
        }

        guard let value = Data(base64Encoded: valueBase64, options: .ignoreUnknownCharacters) else {
            return BleError.invalidWriteDataForCharacteristic(characteristicUUID, data: valueBase64).callReject(reject)
        }

        let observable = characteristicObservable(deviceId, serviceUUID: serviceId, characteristicUUID: characteristicId)
        safeWriteCharacteristicForDevice(observable,
                                         value: value,
                                         response: response,
                                         transactionId: transactionId,
                                         promise: SafePromise(resolve: resolve, reject: reject))
    }

    open func writeCharacteristicForService(  _ serviceIdentifier: Double,
                                               characteristicUUID: String,
                                                      valueBase64: String,
                                                         response: Bool,
                                                    transactionId: String,
                                                          resolve: @escaping Resolve,
                                                           reject: @escaping Reject) {
        guard let characteristicId = characteristicUUID.toCBUUID() else {
                BleError.invalidUUID(characteristicUUID).callReject(reject)
                return
        }

        guard let value = Data(base64Encoded: valueBase64, options: .ignoreUnknownCharacters) else {
            return BleError.invalidWriteDataForCharacteristic(characteristicUUID, data: valueBase64).callReject(reject)
        }

        let observable = characteristicObservable(serviceIdentifier, characteristicUUID: characteristicId)
        safeWriteCharacteristicForDevice(observable,
                                         value: value,
                                         response: response,
                                         transactionId: transactionId,
                                         promise: SafePromise(resolve: resolve, reject: reject))

    }

    open func writeCharacteristic(  _ characteristicIdentifier: Double,
                                                   valueBase64: String,
                                                      response: Bool,
                                                 transactionId: String,
                                                       resolve: @escaping Resolve,
                                                        reject: @escaping Reject) {
        guard let value = Data(base64Encoded: valueBase64, options: .ignoreUnknownCharacters) else {
            return BleError.invalidWriteDataForCharacteristic(characteristicIdentifier, data: valueBase64)
                .callReject(reject)
        }

        let observable = characteristicObservable(characteristicIdentifier)
        safeWriteCharacteristicForDevice(observable,
                                         value: value,
                                         response: response,
                                         transactionId: transactionId,
                                         promise: SafePromise(resolve: resolve, reject: reject))
    }

    fileprivate func safeWriteCharacteristicForDevice(_ characteristicObservable: Observable<Characteristic>,
                                                                           value: Data,
                                                                        response: Bool,
                                                                   transactionId: String,
                                                                         promise: SafePromise) {
        let disposable = characteristicObservable
            .flatMap {
                $0.writeValue(value, type: response ? .withResponse : .withoutResponse)
            }
            .subscribe(
                onNext: { characteristic in
                    promise.resolve(characteristic.asJSObject)
                },
                onError: { error in
                    error.bleError.callReject(promise)
                },
                onCompleted: nil,
                onDisposed: { [weak self] in
                    self?.transactions.removeDisposable(transactionId)
                    BleError.cancelled().callReject(promise)
                }
            )

        transactions.replaceDisposable(transactionId, disposable: disposable)
    }

    // MARK: Monitoring ------------------------------------------------------------------------------------------------

    open func monitorCharacteristicForDevice(  _ deviceIdentifier: String,
                                                      serviceUUID: String,
                                               characteristicUUID: String,
                                                    transactionId: String,
                                                          resolve: @escaping Resolve,
                                                           reject: @escaping Reject) {

        guard let deviceId = UUID(uuidString: deviceIdentifier),
              let serviceId = serviceUUID.toCBUUID(),
              let characteristicId = characteristicUUID.toCBUUID() else {
            BleError.invalidUUIDs([deviceIdentifier, serviceUUID, characteristicUUID]).callReject(reject)
            return
        }

        let maybeCharacteristic = self.connectedDevices[deviceId]?
            .services?
            .first { $0.uuid == serviceId }?
            .characteristics?
            .first { $0.uuid == characteristicId }

        guard let characteristic = maybeCharacteristic else {
            BleError.characteristicNotFound(characteristicUUID).callReject(reject)
            return
        }

        safeMonitorCharacteristicForDevice(characteristic.jsIdentifier,
                                           transactionId: transactionId,
                                           promise: SafePromise(resolve: resolve, reject: reject))
    }

    open func monitorCharacteristicForService(  _ serviceIdentifier: Double,
                                                 characteristicUUID: String,
                                                      transactionId: String,
                                                            resolve: @escaping Resolve,
                                                             reject: @escaping Reject) {

        guard let characteristicId = characteristicUUID.toCBUUID() else {
            BleError.invalidUUID(characteristicUUID).callReject(reject)
            return
        }

        let maybeCharacteristic = services[serviceIdentifier]?.characteristics?.first { $0.uuid == characteristicId }

        guard let characteristic = maybeCharacteristic else {
            BleError.characteristicNotFound(characteristicUUID).callReject(reject)
            return
        }

        safeMonitorCharacteristicForDevice(characteristic.jsIdentifier,
                                           transactionId: transactionId,
                                           promise: SafePromise(resolve: resolve, reject: reject))

    }

    open func monitorCharacteristic(  _ characteristicIdentifier: Double,
                                                   transactionId: String,
                                                         resolve: @escaping Resolve,
                                                          reject: @escaping Reject) {
        safeMonitorCharacteristicForDevice(characteristicIdentifier,
                                           transactionId: transactionId,
                                           promise: SafePromise(resolve: resolve, reject: reject))
    }

    fileprivate func safeMonitorCharacteristicForDevice(_ characteristicIdentifier: Double,
                                                                     transactionId: String,
                                                                           promise: SafePromise) {

        let observable: Observable<Characteristic>

        if let monitoringObservable = monitoredCharacteristics[characteristicIdentifier] {
            observable = monitoringObservable
        } else {
            observable = characteristicObservable(characteristicIdentifier)
                .flatMap { [weak self] characteristic -> Observable<Characteristic> in
                    return characteristic.setNotificationAndMonitorUpdates()
                        .do(onNext: nil, onError: nil, onCompleted: nil, onSubscribe: nil, onDispose: {
                            _ = characteristic.setNotifyValue(false).subscribe()
                            self?.monitoredCharacteristics[characteristicIdentifier] = nil
                        })
                }
                .share()

            monitoredCharacteristics[characteristicIdentifier] = observable
        }

        let disposable = observable.subscribe(
            onNext: { [weak self] characteristic in
                self?.dispatchEvent(BleEvent.readEvent, value: [NSNull(), characteristic.asJSObject, transactionId] as AnyObject)
            }, onError: { [weak self] error in
                self?.dispatchEvent(BleEvent.readEvent, value: [error.bleError.toJS, NSNull(), transactionId] as AnyObject)
            }, onCompleted: {

            }, onDisposed: { [weak self] in
                self?.transactions.removeDisposable(transactionId)
                promise.resolve(nil)
            })

        transactions.replaceDisposable(transactionId, disposable: disposable)
    }

    // MARK: Private interface -----------------------------------------------------------------------------------------

    fileprivate func clearCacheForPeripheral(peripheral: Peripheral) {
        for (key, value) in characteristics {
            if value.service.peripheral == peripheral {
                characteristics[key] = nil
            }
        }
        for (key, value) in services {
            if value.peripheral == peripheral {
                services[key] = nil
            }
        }
    }


    fileprivate func dispatchEvent(_ event: String, value: Any) {
        delegate?.dispatchEvent(event, value: value as AnyObject)
    }

    // MARK: Getting characteristic ------------------------------------------------------------------------------------

    fileprivate func characteristicObservable(_ deviceId: UUID,
                                             serviceUUID: CBUUID,
                                      characteristicUUID: CBUUID) -> Observable<Characteristic> {

        return Observable.deferred { [weak self] in
            guard let device = self?.connectedDevices[deviceId as UUID] else {
                return Observable.error(BleError.peripheralNotConnected(deviceId.uuidString))
            }

            let characteristics = device.services?
                .filter { serviceUUID == $0.uuid }
                .flatMap { $0.characteristics ?? [] }
                .filter { characteristicUUID == $0.uuid } ?? []
            
            guard let characteristic = characteristics.first else {
                return Observable.error(BleError.characteristicNotFound(characteristicUUID.uuidString))
            }
            
            return Observable.just(characteristic)
        }
    }

    fileprivate func characteristicObservable(_ serviceId: Double,
                                       characteristicUUID: CBUUID) -> Observable<Characteristic> {

        return Observable.deferred { [weak self] in
            guard let service = self?.services[serviceId] else {
                return Observable.error(BleError.serviceNotFound(serviceId))
            }

            let characteristics = service.characteristics?.filter { characteristicUUID == $0.uuid } ?? []

            guard let characteristic = characteristics.first else {
                return Observable.error(BleError.characteristicNotFound(characteristicUUID.uuidString))
            }

            return Observable.just(characteristic)
        }
    }

    fileprivate func characteristicObservable(_ characteristicId: Double) -> Observable<Characteristic> {

        return Observable.deferred { [weak self] in
            guard let characteristic = self?.characteristics[characteristicId] else {
                return Observable.error(BleError.characteristicNotFound(characteristicId))
            }

            return Observable.just(characteristic)
        }
    }
}
