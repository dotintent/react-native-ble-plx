//
//  BleModule.swift
//
//  Created by Konrad Rodzik on 7/4/16.
//

import Foundation
import CoreBluetooth
import RxBluetoothKit
import RxSwift

@objc
public protocol BleClientManagerDelegate {
    func dispatchEvent(_ name: String, value: Any)
}

@objc
public class BleClientManager : NSObject {

    // Delegate is used to send events to
    public var delegate: BleClientManagerDelegate?

    // RxBlutoothKit's manager
    private let manager : BluetoothManager

    // MARK: Caches ----------------------------------------------------------------------------------------------------

    // Map of discovered services in any of connected devices.
    private var discoveredServices = [Double: Service]()

    // Map of discovered characteristics in any of connected devices.
    private var discoveredCharacteristics = [Double: Characteristic]()

    // Map of currently connected peripherals.
    private var connectedPeripherals = Dictionary<UUID, Peripheral>()

    // Map of monitored characteristics observables. For monitoring sharing.
    private var monitoredCharacteristics = Dictionary<Double, Observable<Characteristic>>()

    // MARK: Disposables -----------------------------------------------------------------------------------------------

    // Disposable for detecting state changes of BleManager
    private let stateDisposable: Disposable

    // Scan disposable which is removed when new scan is created.
    private let scanDisposable = SerialDisposable()

    // Disposable map for connecting peripherals.
    private let connectingPeripherals = DisposableMap<UUID>()

    // Disposable map for every transaction.
    private let transactions = DisposableMap<String>()

    // MARK: Lifecycle -------------------------------------------------------------------------------------------------

    public init(queue: DispatchQueue) {
        manager = BluetoothManager(queue: queue)
        super.init()
        stateDisposable = manager.rx_state.subscribe(onNext: { [weak self] newState in
            self?.onStateChange(newState)
        })
    }

    public func invalidate() {
        // Disposables
        stateDisposable.dispose()
        scanDisposable.disposable = Disposables.create()
        transactions.dispose()
        connectingPeripherals.dispose()

        // Caches
        discoveredServices.removeAll()
        discoveredCharacteristics.removeAll()
        monitoredCharacteristics.removeAll()
        connectedPeripherals.forEach { (_, device) in
            _ = device.cancelConnection().subscribe()
        }
        connectedPeripherals.removeAll()
    }

    deinit {
        // We don't use deinit to deinitialize BleClientManager. User
        // should call invalidate() before destruction of this object.
        // In such case observables can call [weak self] closures properly.
    }

    // Mark: Common ----------------------------------------------------------------------------------------------------

    // User is able to cancel any "atomic" operation which is contained in transactions map.
    public func cancelTransaction(_ transactionId: String) {
        transactions.removeDisposable(transactionId)
    }

    // User is able to enable logging of RxBluetoothKit to show how real device responds.
    public func setLogLevel(_ logLevel: String) {
        RxBluetoothKitLog.setLogLevel(RxBluetoothKitLog.LogLevel(jsObject: logLevel))
    }

    // User can retrieve current log level.
    public func logLevel(_ resolve: Resolve, reject: Reject) {
        resolve(RxBluetoothKitLog.getLogLevel().asJSObject)
    }

    // Mark: Monitoring state ------------------------------------------------------------------------------------------

    // Retrieve current BleManager's state
    public func state(_ resolve: Resolve, reject: Reject) {
        resolve(manager.state.asJSObject)
    }

    // Dispatch events when state changes
    private func onStateChange(_ state: BluetoothState) {
        dispatchEvent(BleEvent.stateChangeEvent, value: state.asJSObject)
    }

    // Mark: Scanning --------------------------------------------------------------------------------------------------

    // Start BLE scanning.
    public func startDeviceScan(_ filteredUUIDs: [String]?, options:[String:AnyObject]?) {

        // iOS handles allowDuplicates option to receive more scan records.
        var rxOptions = [String:Any]()
        if let options = options {
            if ((options["allowDuplicates"]?.isEqual(to: NSNumber(value: true as Bool))) ?? false) {
                rxOptions[CBCentralManagerScanOptionAllowDuplicatesKey] = true
            }
        }

        // If passed iOS will show only devices with specified service UUIDs.
        var uuids: [CBUUID]? = nil
        if let filteredUUIDs = filteredUUIDs {
            guard let cbuuids = filteredUUIDs.toCBUUIDS() else {
                dispatchEvent(BleEvent.scanEvent, value: BleError.invalidUUIDs(filteredUUIDs).toJSResult)
                return
            }
            uuids = cbuuids
        }

        // Scanning will emit Scan peripherals as events.
        scanDisposable.disposable = manager.scanForPeripherals(withServices: uuids, options: rxOptions)
            .subscribe(onNext: { [weak self] scannedPeripheral in
                self?.dispatchEvent(BleEvent.scanEvent, value: [NSNull(), scannedPeripheral.asJSObject])
            }, onError: { [weak self] errorType in
                self?.dispatchEvent(BleEvent.scanEvent, value: errorType.bleError.toJSResult)
            })
    }

    // Stop BLE scanning.
    public func stopDeviceScan() {
        scanDisposable.disposable = Disposables.create()
    }

    // Mark: Connection management -------------------------------------------------------------------------------------

    // Connect to specified device.
    public func connectToDevice(_ deviceIdentifier: String,
                                         options:[String: AnyObject]?,
                                         resolve: @escaping Resolve,
                                          reject: @escaping Reject) {
        guard let deviceId = UUID(uuidString: deviceIdentifier) else {
            BleError.invalidUUID(deviceIdentifier).callReject(reject)
            return
        }

        safeConnectToDevice(deviceId, options: options, promise: SafePromise(resolve: resolve, reject: reject))
    }

    private func safeConnectToDevice(_ deviceId: UUID,
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
                    // When device is connected we save it in dectionary and clear all old cached values.
                    self?.connectedPeripherals[deviceId] = peripheral
                    self?.clearCacheForPeripheral(peripheral: peripheral)
                },
                onError: { error in
                    error.bleError.callReject(promise)
                },
                onCompleted: { [weak self] in
                    if let device = self?.connectedPeripherals[deviceId] {
                        _ = self?.manager.monitorDisconnection(for: device)
                            .take(1)
                            .subscribe(onNext: { peripheral in
                                // We are monitoring peripheral disconnections to clean up state.
                                self?.onPeripheralDisconnected(peripheral)
                            })
                        promise.resolve(device.asJSObject)
                    } else {
                        BleError.peripheralNotFound(deviceId.uuidString).callReject(promise)
                    }
                },
                onDisposed: { [weak self] in
                    self?.connectingPeripherals.removeDisposable(deviceId)
                    BleError.cancelled().callReject(promise)
                }
        );

        connectingPeripherals.replaceDisposable(deviceId, disposable: connectionDisposable)
    }

    private func onPeripheralDisconnected(_ peripheral: Peripheral) {
        self.connectedPeripherals[peripheral.identifier] = nil
        clearCacheForPeripheral(peripheral: peripheral)
        dispatchEvent(BleEvent.disconnectionEvent, value: [NSNull(), peripheral.asJSObject])
    }

    // User is able to cancel device connection.
    public func cancelDeviceConnection(_ deviceIdentifier: String,
                                                  resolve: @escaping Resolve,
                                                   reject: @escaping Reject) {
        guard let deviceId = UUID(uuidString: deviceIdentifier) else {
            BleError.invalidUUID(deviceIdentifier).callReject(reject)
            return
        }

        if let peripheral = connectedPeripherals[deviceId] {
            _ = peripheral
                .cancelConnection()
                .subscribe(
                    onNext: nil,
                    onError: { error in
                        error.bleError.callReject(reject)
                    },
                    onCompleted: { [weak self] in
                        self?.clearCacheForPeripheral(peripheral: peripheral)
                        self?.connectedPeripherals[deviceId] = nil
                        resolve(peripheral.asJSObject)
                    }
            );
        } else {
            connectingPeripherals.removeDisposable(deviceId)
            BleError.cancelled().callReject(reject)
        }
    }

    // Retrieve if device is connected.
    public func isDeviceConnected(_ deviceIdentifier: String, resolve: Resolve, reject: Reject) {
        guard let deviceId = UUID(uuidString: deviceIdentifier) else {
            BleError.invalidUUID(deviceIdentifier).callReject(reject)
            return
        }

        if let device = connectedPeripherals[deviceId] {
            resolve(device.isConnected)
        } else {
            resolve(false)
        }
    }

    // Mark: Discovery -------------------------------------------------------------------------------------------------

    // After connection for peripheral to be usable, 
    // user should discover all services and characteristics for peripheral.
    public func discoverAllServicesAndCharacteristicsForDevice(_ deviceIdentifier: String,
                                                                          resolve: @escaping Resolve,
                                                                           reject: @escaping Reject) {

        guard let deviceId = UUID(uuidString: deviceIdentifier) else {
            BleError.invalidUUID(deviceIdentifier).callReject(reject)
            return
        }

        guard let peripheral = connectedPeripherals[deviceId] else {
            BleError.peripheralNotConnected(deviceIdentifier).callReject(reject)
            return
        }

        _ = peripheral
            .discoverServices(nil)
            .flatMap { [weak self] services -> Observable<Service> in
                for service in services {
                    self?.discoveredServices[service.jsIdentifier] = service
                }
                return Observable.from(services)
            }
            .flatMap { $0.discoverCharacteristics(nil) }
            .subscribe(
                onNext: { [weak self] characteristics in
                    for characteristic in characteristics {
                        self?.discoveredCharacteristics[characteristic.jsIdentifier] = characteristic
                    }
                },
                onError: { error in error.bleError.callReject(reject) },
                onCompleted: { resolve(peripheral.asJSObject) }
            )
    }

    // Mark: Service and characteristic getters ------------------------------------------------------------------------

    // When fetching services for peripherals we update our cache.
    public func servicesForDevice(_ deviceIdentifier: String, resolve: Resolve, reject: Reject) {

        guard let deviceId = UUID(uuidString: deviceIdentifier) else {
            BleError.invalidUUID(deviceIdentifier).callReject(reject)
            return
        }

        guard let peripheral = connectedPeripherals[deviceId] else {
            BleError.peripheralNotConnected(deviceIdentifier).callReject(reject)
            return
        }

        let services = peripheral
            .services?.map { [weak self] service in
                self?.discoveredServices[service.jsIdentifier] = service
                return service.asJSObject
            } ?? []

        resolve(services)
    }

    // When fetching characteristics for peripherals we update our cache.
    public func characteristicsForDevice(_ deviceIdentifier: String,
                                                serviceUUID: String,
                                                    resolve: Resolve,
                                                     reject: Reject) {

        guard let deviceId = UUID(uuidString: deviceIdentifier),
                  let serviceId = serviceUUID.toCBUUID() else {
            BleError.invalidUUIDs([deviceIdentifier, serviceUUID]).callReject(reject)
            return
        }

        guard let peripheral = connectedPeripherals[deviceId] else {
            BleError.peripheralNotConnected(deviceIdentifier).callReject(reject)
            return
        }

        guard let service = (peripheral.services?.first { serviceId == $0.uuid }) else {
            BleError.serviceNotFound(serviceUUID).callReject(reject)
            return
        }

        characteristicForService(service,
                                 resolve: resolve,
                                 reject: reject)
    }

    public func characteristicsForService(_ serviceIdentifier: Double,
                                                      resolve: Resolve,
                                                       reject: Reject) {
        guard let service = discoveredServices[serviceIdentifier]  else {
            BleError.invalidID(serviceIdentifier).callReject(reject)
            return
        }

        characteristicForService(service, resolve: resolve, reject: reject)
    }

    private func characteristicForService(_ service: Service, resolve: Resolve, reject: Reject) {
        let characteristics = service.characteristics?
            .map { [weak self] characteristic in
                self?.discoveredCharacteristics[characteristic.jsIdentifier] = characteristic
                return characteristic.asJSObject
            } ?? []

        resolve(characteristics)
    }

    // Mark: Reading ---------------------------------------------------------------------------------------------------

    public func readCharacteristicForDevice(_ deviceIdentifier: String,
                                                   serviceUUID: String,
                                            characteristicUUID: String,
                                                 transactionId: String,
                                                       resolve: @escaping Resolve,
                                                        reject: @escaping Reject) {
        let observable = getCharacteristicForDevice(deviceIdentifier,
                                                    serviceUUID: serviceUUID,
                                                    characteristicUUID: characteristicUUID)
        safeReadCharacteristicForDevice(observable,
                                        transactionId: transactionId,
                                        promise: SafePromise(resolve: resolve, reject: reject))
    }

    public func readCharacteristicForService(_ serviceIdentifier: Double,
                                              characteristicUUID: String,
                                                   transactionId: String,
                                                         resolve: @escaping Resolve,
                                                          reject: @escaping Reject) {
        let observable = getCharacteristicForService(serviceIdentifier,
                                                     characteristicUUID: characteristicUUID)
        safeReadCharacteristicForDevice(observable,
                                        transactionId: transactionId,
                                        promise: SafePromise(resolve: resolve, reject: reject))
    }

    public func readCharacteristic(_ characteristicIdentifier: Double,
                                                transactionId: String,
                                                      resolve: @escaping Resolve,
                                                       reject: @escaping Reject) {
        safeReadCharacteristicForDevice(getCharacteristic(characteristicIdentifier),
                                        transactionId: transactionId,
                                        promise: SafePromise(resolve: resolve, reject: reject))
    }

    private func safeReadCharacteristicForDevice(_ characteristicObservable: Observable<Characteristic>,
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

    public func writeCharacteristicForDevice(  _ deviceIdentifier: String,
                                                      serviceUUID: String,
                                               characteristicUUID: String,
                                                      valueBase64: String,
                                                         response: Bool,
                                                    transactionId: String,
                                                          resolve: @escaping Resolve,
                                                           reject: @escaping Reject) {
        guard let value = Data(base64Encoded: valueBase64, options: .ignoreUnknownCharacters) else {
            return BleError.invalidWriteDataForCharacteristic(characteristicUUID, data: valueBase64).callReject(reject)
        }

        let observable = getCharacteristicForDevice(deviceIdentifier,
                                                    serviceUUID: serviceUUID,
                                                    characteristicUUID: characteristicUUID)
        safeWriteCharacteristicForDevice(observable,
                                         value: value,
                                         response: response,
                                         transactionId: transactionId,
                                         promise: SafePromise(resolve: resolve, reject: reject))
    }

    public func writeCharacteristicForService(  _ serviceIdentifier: Double,
                                                 characteristicUUID: String,
                                                        valueBase64: String,
                                                           response: Bool,
                                                      transactionId: String,
                                                            resolve: @escaping Resolve,
                                                             reject: @escaping Reject) {
        guard let value = Data(base64Encoded: valueBase64, options: .ignoreUnknownCharacters) else {
            return BleError.invalidWriteDataForCharacteristic(characteristicUUID, data: valueBase64).callReject(reject)
        }

        let observable = getCharacteristicForService(serviceIdentifier,
                                                     characteristicUUID: characteristicUUID)

        safeWriteCharacteristicForDevice(observable,
                                         value: value,
                                         response: response,
                                         transactionId: transactionId,
                                         promise: SafePromise(resolve: resolve, reject: reject))
    }

    public func writeCharacteristic(  _ characteristicIdentifier: Double,
                                                     valueBase64: String,
                                                        response: Bool,
                                                   transactionId: String,
                                                         resolve: @escaping Resolve,
                                                          reject: @escaping Reject) {
        guard let value = Data(base64Encoded: valueBase64, options: .ignoreUnknownCharacters) else {
            return BleError.invalidWriteDataForCharacteristic(characteristicIdentifier, data: valueBase64)
                .callReject(reject)
        }

        safeWriteCharacteristicForDevice(getCharacteristic(characteristicIdentifier),
                                         value: value,
                                         response: response,
                                         transactionId: transactionId,
                                         promise: SafePromise(resolve: resolve, reject: reject))
    }

    private func safeWriteCharacteristicForDevice(_ characteristicObservable: Observable<Characteristic>,
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

    public func monitorCharacteristicForDevice(  _ deviceIdentifier: String,
                                                        serviceUUID: String,
                                                 characteristicUUID: String,
                                                      transactionId: String,
                                                            resolve: @escaping Resolve,
                                                             reject: @escaping Reject) {
        let observable = getCharacteristicForDevice(deviceIdentifier,
                                                    serviceUUID: serviceUUID,
                                                    characteristicUUID: characteristicUUID)

        safeMonitorCharacteristicForDevice(observable,
                                           transactionId: transactionId,
                                           promise: SafePromise(resolve: resolve, reject: reject))
    }

    public func monitorCharacteristicForService(  _ serviceIdentifier: Double,
                                                   characteristicUUID: String,
                                                        transactionId: String,
                                                              resolve: @escaping Resolve,
                                                               reject: @escaping Reject) {
        let observable = getCharacteristicForService(serviceIdentifier, characteristicUUID: characteristicUUID)

        safeMonitorCharacteristicForDevice(observable,
                                           transactionId: transactionId,
                                           promise: SafePromise(resolve: resolve, reject: reject))
    }

    public func monitorCharacteristic(  _ characteristicIdentifier: Double,
                                                     transactionId: String,
                                                           resolve: @escaping Resolve,
                                                            reject: @escaping Reject) {
        safeMonitorCharacteristicForDevice(getCharacteristic(characteristicIdentifier),
                                           transactionId: transactionId,
                                           promise: SafePromise(resolve: resolve, reject: reject))
    }

    private func safeMonitorCharacteristicForDevice(_ characteristicObservable: Observable<Characteristic>,
                                                                 transactionId: String,
                                                                       promise: SafePromise) {

        let observable: Observable<Characteristic> = characteristicObservable
            .flatMap { [weak self] (characteristic: Characteristic) -> Observable<Characteristic> in
                let characteristicIdentifier = characteristic.jsIdentifier
                if let monitoringObservable = self?.monitoredCharacteristics[characteristicIdentifier] {
                    return monitoringObservable
                } else {
                    let newObservable: Observable<Characteristic> = characteristic
                        .setNotificationAndMonitorUpdates()
                        .do(onNext: nil, onError: nil, onCompleted: nil, onSubscribe: nil, onDispose: {
                            _ = characteristic.setNotifyValue(false).subscribe()
                            self?.monitoredCharacteristics[characteristicIdentifier] = nil
                        })
                        .share()
                    self?.monitoredCharacteristics[characteristicIdentifier] = newObservable
                    return newObservable
                }
            }

        let disposable = observable.subscribe(
            onNext: { [weak self] characteristic in
                self?.dispatchEvent(BleEvent.readEvent, value: [NSNull(), characteristic.asJSObject, transactionId])
            }, onError: { [weak self] error in
                self?.dispatchEvent(BleEvent.readEvent, value: [error.bleError.toJS, NSNull(), transactionId])
            }, onCompleted: {

            }, onDisposed: { [weak self] in
                self?.transactions.removeDisposable(transactionId)
                promise.resolve(nil)
            })

        transactions.replaceDisposable(transactionId, disposable: disposable)
    }

    // MARK: Getting characteristics -----------------------------------------------------------------------------------

    private func getCharacteristicForDevice(_ deviceId: String,
                                           serviceUUID: String,
                                    characteristicUUID: String) -> Observable<Characteristic> {
        return Observable.create { [weak self] observer in
            guard let peripheralId = UUID(uuidString: deviceId) else {
                observer.onError(BleError.peripheralNotFound(deviceId))
                return Disposables.create()
            }

            guard let serviceCBUUID = serviceUUID.toCBUUID() else {
                observer.onError(BleError.invalidUUID(serviceUUID))
                return Disposables.create()
            }

            guard let characteristicCBUUID = characteristicUUID.toCBUUID() else {
                observer.onError(BleError.invalidUUID(characteristicUUID))
                return Disposables.create()
            }

            guard let peripheral = self?.connectedPeripherals[peripheralId] else {
                observer.onError(BleError.peripheralNotConnected(deviceId))
                return Disposables.create()
            }

            guard let characteristic = (peripheral.services?
                .first { $0.uuid == serviceCBUUID }?
                .characteristics?
                .first { $0.uuid == characteristicCBUUID }) else {
                observer.onError(BleError.characteristicNotFound(characteristicUUID))
                return Disposables.create()
            }

            observer.onNext(characteristic)
            observer.onCompleted()
            return Disposables.create()
        }
    }

    private func getCharacteristicForService(_ serviceId: Double,
                                      characteristicUUID: String) -> Observable<Characteristic> {
        return Observable.create { [weak self] observer in
            guard let characteristicCBUUID = characteristicUUID.toCBUUID() else {
                observer.onError(BleError.invalidUUID(characteristicUUID))
                return Disposables.create()
            }

            guard let service = self?.discoveredServices[serviceId] else {
                observer.onError(BleError.serviceNotFound(serviceId))
                return Disposables.create()
            }

            guard let characteristic = (service
                .characteristics?
                .first { $0.uuid == characteristicCBUUID }) else {
                    observer.onError(BleError.characteristicNotFound(characteristicUUID))
                    return Disposables.create()
            }

            observer.onNext(characteristic)
            observer.onCompleted()
            return Disposables.create()
        }
    }

    private func getCharacteristic(_ characteristicId: Double) -> Observable<Characteristic> {
        return Observable.create { [weak self] observer in
            guard let characteristic = self?.discoveredCharacteristics[characteristicId] else {
                observer.onError(BleError.characteristicNotFound(characteristicId))
                return Disposables.create()
            }

            observer.onNext(characteristic)
            observer.onCompleted()
            return Disposables.create()
        }
    }

    // MARK: Private interface -----------------------------------------------------------------------------------------

    private func clearCacheForPeripheral(peripheral: Peripheral) {
        for (key, value) in discoveredCharacteristics {
            if value.service.peripheral == peripheral {
                discoveredCharacteristics[key] = nil
            }
        }
        for (key, value) in discoveredServices {
            if value.peripheral == peripheral {
                discoveredServices[key] = nil
            }
        }
    }

    private func dispatchEvent(_ event: String, value: Any) {
        delegate?.dispatchEvent(event, value: value)
    }
}
