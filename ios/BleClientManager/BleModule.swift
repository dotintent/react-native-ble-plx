//
//  BleModule.swift
//
//  Created by Konrad Rodzik on 7/4/16.
//

import Foundation
import CoreBluetooth

@objc
public protocol BleClientManagerDelegate {
    func dispatchEvent(_ name: String, value: Any)
}

@objc
public class BleClientManager : NSObject {

    // Delegate is used to send events to
    @objc
    public var delegate: BleClientManagerDelegate?

    // RxBlutoothKit's manager
    private let manager : BluetoothManager

    // Dispatch queue used for BLE
    private let queue : DispatchQueue

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
    private var stateDisposable = Disposables.create()

    // Disposable for detecing state restoration of BleManager.
    private var restorationDisposable = Disposables.create()

    // Scan disposable which is removed when new scan is created.
    private let scanDisposable = SerialDisposable()

    // Disposable map for connecting peripherals.
    private let connectingPeripherals = DisposableMap<UUID>()

    // Disposable map for every transaction.
    private let transactions = DisposableMap<String>()

    // Map of pending read operations.
    private var pendingReads = Dictionary<Double, Int>()

    // MARK: Lifecycle -------------------------------------------------------------------------------------------------

    @objc
    public init(queue: DispatchQueue, restoreIdentifierKey: String?) {
        self.queue = queue

        if let key = restoreIdentifierKey {
            manager = BluetoothManager(queue: queue,
                                       options: [CBCentralManagerOptionRestoreIdentifierKey: key as AnyObject])
        } else {
            manager = BluetoothManager(queue: queue)
        }

        super.init()
        stateDisposable = manager.rx_state.subscribe(onNext: { [weak self] newState in
            self?.onStateChange(newState)
        })

        if restoreIdentifierKey != nil {
            restorationDisposable = Observable<RestoredState?>.amb([
                    manager.rx_state.skip(1).map { _ in nil },
                    manager.listenOnRestoredState().map { $0 as RestoredState? }
                ])
                .take(1)
                .subscribe(onNext: {[weak self] newRestoredState in
                    self?.onRestoreState(newRestoredState)
                })
        }
    }

    @objc
    public func invalidate() {
        // Disposables
        stateDisposable.dispose()
        restorationDisposable.dispose()
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
        pendingReads.removeAll()
    }

    deinit {
        // We don't use deinit to deinitialize BleClientManager. User
        // should call invalidate() before destruction of this object.
        // In such case observables can call [weak self] closures properly.
    }

    // Mark: Common ----------------------------------------------------------------------------------------------------

    // User is able to cancel any "atomic" operation which is contained in transactions map.
    @objc
    public func cancelTransaction(_ transactionId: String) {
        transactions.removeDisposable(transactionId)
    }

    // User is able to enable logging of RxBluetoothKit to show how real device responds.
    @objc
    public func setLogLevel(_ logLevel: String) {
        RxBluetoothKitLog.setLogLevel(RxBluetoothKitLog.LogLevel(jsObject: logLevel))
    }

    // User can retrieve current log level.
    @objc
    public func logLevel(_ resolve: Resolve, reject: Reject) {
        resolve(RxBluetoothKitLog.getLogLevel().asJSObject)
    }

    // Mark: Monitoring state ------------------------------------------------------------------------------------------

    // Retrieve current BleManager's state.
    @objc
    public func state(_ resolve: Resolve, reject: Reject) {
        resolve(manager.state.asJSObject)
    }

    // Dispatch events when state changes.
    private func onStateChange(_ state: BluetoothState) {
        dispatchEvent(BleEvent.stateChangeEvent, value: state.asJSObject)
    }

    // Restore internal manager state.
    private func onRestoreState(_ restoredState: RestoredState?) {

        // When restored state is null then application is run for the first time.
        guard let restoredState = restoredState else {
            dispatchEvent(BleEvent.restoreStateEvent, value: NSNull())
            return
        }

        // When state is to be restored update all caches.
        restoredState.peripherals.forEach { peripheral in
            connectedPeripherals[peripheral.identifier] = peripheral

            _ = manager.monitorDisconnection(for: peripheral)
                .take(1)
                .subscribe(
                    onNext: { [weak self] peripheral in
                        self?.onPeripheralDisconnected(peripheral)
                    },
                    onError: { [weak self] error in
                        self?.onPeripheralDisconnected(peripheral)
                    })

            peripheral.services?.forEach { service in
                discoveredServices[service.jsIdentifier] = service
                service.characteristics?.forEach { characteristic in
                    discoveredCharacteristics[characteristic.jsIdentifier] = characteristic
                }
            }
        }

        dispatchEvent(BleEvent.restoreStateEvent, value: restoredState.asJSObject)
    }

    // Mark: Scanning --------------------------------------------------------------------------------------------------

    // Start BLE scanning.
    @objc
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
                dispatchEvent(BleEvent.scanEvent, value: BleError.invalidIdentifiers(filteredUUIDs).toJSResult)
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
    @objc
    public func stopDeviceScan() {
        scanDisposable.disposable = Disposables.create()
    }

    // Read peripheral's RSSI.
    @objc
    public func readRSSIForDevice(_ deviceIdentifier: String,
                                       transactionId: String,
                                             resolve: @escaping Resolve,
                                              reject: @escaping Reject) {
        guard let deviceId = UUID(uuidString: deviceIdentifier) else {
            BleError.invalidIdentifiers(deviceIdentifier).callReject(reject)
            return
        }

        guard let peripheral = connectedPeripherals[deviceId] else {
            BleError.peripheralNotConnected(deviceIdentifier).callReject(reject)
            return
        }

        let safePromise = SafePromise(resolve: resolve, reject: reject)
        let disposable = peripheral.readRSSI()
            .subscribe(
                onNext: { (peripheral, rssi) in
                    safePromise.resolve(peripheral.asJSObject(withRssi: rssi))
                },
                onError: {error in
                    error.bleError.callReject(safePromise)
                },
                onCompleted: nil,
                onDisposed: { [weak self] in
                    self?.transactions.removeDisposable(transactionId)
                    BleError.cancelled().callReject(safePromise)
                })

        transactions.replaceDisposable(transactionId, disposable: disposable)
    }

    @objc
    public func requestMTUForDevice(_ deviceIdentifier: String,
                                                   mtu: Int,
                                         transactionId: String,
                                               resolve: @escaping Resolve,
                                                reject: @escaping Reject) {

        guard let deviceId = UUID(uuidString: deviceIdentifier) else {
            BleError.invalidIdentifiers(deviceIdentifier).callReject(reject)
            return
        }

        guard let peripheral = connectedPeripherals[deviceId] else {
            BleError.peripheralNotConnected(deviceIdentifier).callReject(reject)
            return
        }

        resolve(peripheral.asJSObject())
    }

    // Mark: Device management -----------------------------------------------------------------------------------------

    @objc
    public func devices(_ deviceIdentifiers: [String],
                                    resolve: @escaping Resolve,
                                     reject: @escaping Reject) {
        let uuids = deviceIdentifiers.flatMap { UUID(uuidString: $0) }
        if (uuids.count != deviceIdentifiers.count) {
            BleError.invalidIdentifiers(deviceIdentifiers).callReject(reject)
            return
        }

        _  = manager.retrievePeripherals(withIdentifiers: uuids)
            .subscribe(
                onNext: { peripherals in
                    resolve(peripherals.map { $0.asJSObject() })
                },
                onError: { error in
                    error.bleError.callReject(reject)
                }
        );
    }

    @objc
    public func connectedDevices(_ serviceUUIDs: [String],
                                        resolve: @escaping Resolve,
                                         reject: @escaping Reject) {
        let uuids = serviceUUIDs.flatMap { $0.toCBUUID() }
        if (uuids.count != serviceUUIDs.count) {
            BleError.invalidIdentifiers(serviceUUIDs).callReject(reject)
            return
        }

        _  = manager.retrieveConnectedPeripherals(withServices: uuids)
            .subscribe(
                onNext: { peripherals in
                    resolve(peripherals.map { $0.asJSObject() })
            },
                onError: { error in
                    error.bleError.callReject(reject)
            }
        );
    }

    // Mark: Connection management -------------------------------------------------------------------------------------

    // Connect to specified device.
    @objc
    public func connectToDevice(_ deviceIdentifier: String,
                                         options:[String: AnyObject]?,
                                         resolve: @escaping Resolve,
                                          reject: @escaping Reject) {
        guard let deviceId = UUID(uuidString: deviceIdentifier) else {
            BleError.invalidIdentifiers(deviceIdentifier).callReject(reject)
            return
        }

        var timeout: Int? = nil

        if let options = options {
            timeout = options["timeout"] as? Int
        }

        safeConnectToDevice(deviceId, timeout: timeout, promise: SafePromise(resolve: resolve, reject: reject))
    }

    private func safeConnectToDevice(_ deviceId: UUID,
                                        timeout: Int?,
                                        promise: SafePromise) {

        var connectionObservable = manager.retrievePeripherals(withIdentifiers: [deviceId])
            .flatMap { devices -> Observable<Peripheral> in
                guard let device = devices.first else {
                    return Observable.error(BleError.peripheralNotFound(deviceId.uuidString))
                }
                return Observable.just(device)
            }
            .flatMap { $0.connect() }

        if let timeout = timeout {
            connectionObservable = connectionObservable.timeout(Double(timeout) / 1000.0, scheduler: ConcurrentDispatchQueueScheduler(queue: queue))
        }

        var peripheralToConnect : Peripheral? = nil
        let connectionDisposable = connectionObservable
            .subscribe(
                onNext: { [weak self] peripheral in
                    // When device is connected we save it in dectionary and clear all old cached values.
                    peripheralToConnect = peripheral
                    self?.connectedPeripherals[deviceId] = peripheral
                    self?.clearCacheForPeripheral(peripheral: peripheral)
                },
                onError: {  [weak self] error in
                    if let rxerror = error as? RxError,
                       let peripheralToConnect = peripheralToConnect,
                       let strongSelf = self,
                       case RxError.timeout = rxerror {
                        _ = strongSelf.manager.cancelPeripheralConnection(peripheralToConnect).subscribe()
                    }
                    error.bleError.callReject(promise)
                },
                onCompleted: { [weak self] in
                    if let device = self?.connectedPeripherals[deviceId] {
                        _ = self?.manager.monitorDisconnection(for: device)
                            .take(1)
                            .subscribe(onNext: { peripheral in
                                // We are monitoring peripheral disconnections to clean up state.
                                self?.onPeripheralDisconnected(peripheral)
                            }, onError: { error in
                                self?.onPeripheralDisconnected(device)
                            })
                        promise.resolve(device.asJSObject())
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
        dispatchEvent(BleEvent.disconnectionEvent, value: [NSNull(), peripheral.asJSObject()])
    }

    // User is able to cancel device connection.
    @objc
    public func cancelDeviceConnection(_ deviceIdentifier: String,
                                                  resolve: @escaping Resolve,
                                                   reject: @escaping Reject) {
        guard let deviceId = UUID(uuidString: deviceIdentifier) else {
            BleError.invalidIdentifiers(deviceIdentifier).callReject(reject)
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
                        resolve(peripheral.asJSObject())
                    }
            );
        } else {
            connectingPeripherals.removeDisposable(deviceId)
            BleError.cancelled().callReject(reject)
        }
    }

    // Retrieve if device is connected.
    @objc
    public func isDeviceConnected(_ deviceIdentifier: String, resolve: Resolve, reject: Reject) {
        guard let deviceId = UUID(uuidString: deviceIdentifier) else {
            BleError.invalidIdentifiers(deviceIdentifier).callReject(reject)
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
    @objc
    public func discoverAllServicesAndCharacteristicsForDevice(_ deviceIdentifier: String,
                                                                          resolve: @escaping Resolve,
                                                                           reject: @escaping Reject) {

        guard let deviceId = UUID(uuidString: deviceIdentifier) else {
            BleError.invalidIdentifiers(deviceIdentifier).callReject(reject)
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
                onCompleted: { resolve(peripheral.asJSObject()) }
            )
    }

    // Mark: Service and characteristic getters ------------------------------------------------------------------------

    // When fetching services for peripherals we update our cache.
    @objc
    public func servicesForDevice(_ deviceIdentifier: String, resolve: Resolve, reject: Reject) {

        guard let deviceId = UUID(uuidString: deviceIdentifier) else {
            BleError.invalidIdentifiers(deviceIdentifier).callReject(reject)
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
    @objc
    public func characteristicsForDevice(_ deviceIdentifier: String,
                                                serviceUUID: String,
                                                    resolve: Resolve,
                                                     reject: Reject) {

        guard let deviceId = UUID(uuidString: deviceIdentifier),
                  let serviceId = serviceUUID.toCBUUID() else {
            BleError.invalidIdentifiers([deviceIdentifier, serviceUUID]).callReject(reject)
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

    @objc
    public func characteristicsForService(_ serviceIdentifier: Double,
                                                      resolve: Resolve,
                                                       reject: Reject) {
        guard let service = discoveredServices[serviceIdentifier]  else {
            BleError.serviceNotFound(serviceIdentifier.description).callReject(reject)
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

    @objc
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

    @objc
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

    @objc
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
        var characteristicIdentifier: Double? = nil
        let disposable = characteristicObservable
            .flatMap { [weak self] characteristic -> Observable<Characteristic> in
                characteristicIdentifier = characteristic.jsIdentifier
                let reads = self?.pendingReads[characteristic.jsIdentifier] ?? 0
                self?.pendingReads[characteristic.jsIdentifier] = reads + 1
                return characteristic.readValue()
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
                    if let id = characteristicIdentifier {
                        let reads = self?.pendingReads[id] ?? 0
                        if reads > 0 {
                            self?.pendingReads[id] = reads - 1
                        }
                    }
                }
            )

        transactions.replaceDisposable(transactionId, disposable: disposable)
    }

    // MARK: Writing ---------------------------------------------------------------------------------------------------

    @objc
    public func writeCharacteristicForDevice(  _ deviceIdentifier: String,
                                                      serviceUUID: String,
                                               characteristicUUID: String,
                                                      valueBase64: String,
                                                         response: Bool,
                                                    transactionId: String,
                                                          resolve: @escaping Resolve,
                                                           reject: @escaping Reject) {
        // guard let value = valueBase64.fromBase64 else {
        //     return BleError.invalidWriteDataForCharacteristic(characteristicUUID, data: valueBase64).callReject(reject)
        // }
        // 字符串转Data
        let data = valueBase64.data(using: String.Encoding.utf8)
        //Data转byte
        let bytes = [UInt8](data!)
        let value = Data(bytes:bytes)   

        let observable = getCharacteristicForDevice(deviceIdentifier,
                                                    serviceUUID: serviceUUID,
                                                    characteristicUUID: characteristicUUID)
        safeWriteCharacteristicForDevice(observable,
                                         value: value,
                                         response: response,
                                         transactionId: transactionId,
                                         promise: SafePromise(resolve: resolve, reject: reject))
    }

    @objc
    public func writeCharacteristicForService(  _ serviceIdentifier: Double,
                                                 characteristicUUID: String,
                                                        valueBase64: String,
                                                           response: Bool,
                                                      transactionId: String,
                                                            resolve: @escaping Resolve,
                                                             reject: @escaping Reject) {
        // guard let value = valueBase64.fromBase64 else {
        //     return BleError.invalidWriteDataForCharacteristic(characteristicUUID, data: valueBase64).callReject(reject)
        // }
        // 字符串转Data
        let data = valueBase64.data(using: String.Encoding.utf8)
        //Data转byte
        let bytes = [UInt8](data!)
        let value = Data(bytes:bytes)   

        let observable = getCharacteristicForService(serviceIdentifier,
                                                     characteristicUUID: characteristicUUID)

        safeWriteCharacteristicForDevice(observable,
                                         value: value,
                                         response: response,
                                         transactionId: transactionId,
                                         promise: SafePromise(resolve: resolve, reject: reject))
    }

    @objc
    public func writeCharacteristic(  _ characteristicIdentifier: Double,
                                                     valueBase64: String,
                                                        response: Bool,
                                                   transactionId: String,
                                                         resolve: @escaping Resolve,
                                                          reject: @escaping Reject) {
        // guard let value = valueBase64.fromBase64 else {
        //     return BleError.invalidWriteDataForCharacteristic(characteristicIdentifier.description, data: valueBase64)
        //         .callReject(reject)
        // }
        // 字符串转Data
        let data = valueBase64.data(using: String.Encoding.utf8)
        //Data转byte
        let bytes = [UInt8](data!)
        let value = Data(bytes:bytes)   

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

    @objc
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

    @objc
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

    @objc
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
                if self?.pendingReads[characteristic.jsIdentifier] ?? 0 == 0 {
                    self?.dispatchEvent(BleEvent.readEvent, value: [NSNull(), characteristic.asJSObject, transactionId])
                }
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
                observer.onError(BleError.invalidIdentifiers(serviceUUID))
                return Disposables.create()
            }

            guard let characteristicCBUUID = characteristicUUID.toCBUUID() else {
                observer.onError(BleError.invalidIdentifiers(characteristicUUID))
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
                observer.onError(BleError.invalidIdentifiers(characteristicUUID))
                return Disposables.create()
            }

            guard let service = self?.discoveredServices[serviceId] else {
                observer.onError(BleError.serviceNotFound(serviceId.description))
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
                observer.onError(BleError.characteristicNotFound(characteristicId.description))
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
