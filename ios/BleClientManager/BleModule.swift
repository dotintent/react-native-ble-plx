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
extension Data {
    var checksum: Int {
        return self.map { Int($0) }.reduce(0, +) & 0xff
    }
}

@objc
public class BleClientManager : NSObject {

    // Scale Write Characteristic
    private let scaleWriteCharacteristic : String = "0000fff3-0000-1000-8000-00805f9b34fb"

    // Tracker Write Characteristic
    private let trackerWriteCharacteristic : String = "0000fff6-0000-1000-8000-00805f9b34fb"

    // Tracker Read Characteristic
    private let trackerReadCharacteristic : String = "0000fff7-0000-1000-8000-00805f9b34fb"

    // Scale Read Characteristic
    private let scaleReadCharacteristic : String = "0000fff4-0000-1000-8000-00805f9b34fb"

    // Alternative Scale Read Temporary Characteristic
    private let alternativeScaleReadTemporaryCharacteristic : String = "0000fff3-0000-1000-8000-00805f9b34fb"

    // Alternative Scale Read Final Characteristic
    private let alternativeScaleReadFinalCharacteristic : String = "0000fff1-0000-1000-8000-00805f9b34fb"
    
    // Alternative Scale Write  Characteristic
    private let alternativeScaleWriteCharacteristic : String = "0000fff2-0000-1000-8000-00805f9b34fb"
    
    // Tracker Service UUID
    private let trackerServiceUUID : String = "0000fff0-0000-1000-8000-00805f9b34fb"

    // Tracker Service UUID
    private let scaleServiceUUID : String = "0000fff0-0000-1000-8000-00805f9b34fb"

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

    @objc
    public func enable(_ transactionId: String, resolve: Resolve, reject: Reject) {
        BleError(errorCode: .BluetoothStateChangeFailed).callReject(reject)
    }

    @objc
    public func disable(_ transactionId: String, resolve: Resolve, reject: Reject) {
        BleError(errorCode: .BluetoothStateChangeFailed).callReject(reject)
    }

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

        // Start BLE scanning.
    @objc
    public func startTrackerScan(_ filteredUUIDs: [String]?, options:[String:AnyObject]?) {

        // iOS handles allowDuplicates option to receive more scan records.
        var rxOptions = [String:Any]()
        if let options = options {
            if ((options["allowDuplicates"]?.isEqual(to: NSNumber(value: true as Bool))) ?? false) {
                rxOptions[CBCentralManagerScanOptionAllowDuplicatesKey] = true
            }
        }

        // If passed iOS will show only devices with specified service UUIDs.
        let uuids = ["fff0"].toCBUUIDS()

        // Scanning will emit Scan peripherals as events.
        scanDisposable.disposable = manager.scanForPeripherals(withServices: uuids, options: rxOptions)
            .subscribe(onNext: { [weak self] scannedPeripheral in
                self?.dispatchEvent(BleEvent.scanEvent, value: [NSNull(), scannedPeripheral.asJSObject])
            }, onError: { [weak self] errorType in
                self?.dispatchEvent(BleEvent.scanEvent, value: errorType.bleError.toJSResult)
            })
    }

        // Start BLE scanning.
    @objc
    public func startScaleScan(_ options:[String:AnyObject]?) {

        // iOS handles allowDuplicates option to receive more scan records.
        var rxOptions = [String:Any]()
        if let options = options {
            if ((options["allowDuplicates"]?.isEqual(to: NSNumber(value: true as Bool))) ?? false) {
                rxOptions[CBCentralManagerScanOptionAllowDuplicatesKey] = true
            }
        }

        // If passed iOS will show only devices with specified service UUIDs.
        let uuids = ["fff0"].toCBUUIDS()

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

    @objc
    public func requestConnectionPriorityForDevice(_ deviceIdentifier: String,
                                                   connectionPriority: Int,
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
        let uuids = deviceIdentifiers.compactMap { UUID(uuidString: $0) }
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
        let uuids = serviceUUIDs.compactMap { $0.toCBUUID() }
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

        safeDiscoverAllServicesAndCharacteristicsForDevice(peripheral, transactionId: transactionId, promise: SafePromise(resolve: resolve, reject: reject))
    }

    func safeDiscoverAllServicesAndCharacteristicsForDevice(_ peripheral: Peripheral,
                                                           transactionId: String,
                                                                 promise: SafePromise) {
        let disposable = peripheral
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
                onError: { error in error.bleError.callReject(promise) },
                onCompleted: { promise.resolve(peripheral.asJSObject()) },
                onDisposed: { [weak self] in
                    self?.transactions.removeDisposable(transactionId)
                    BleError.cancelled().callReject(promise)
                }
        )

        transactions.replaceDisposable(transactionId, disposable: disposable)
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
        guard let value = valueBase64.fromBase64 else {
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

    public func createNewArray() -> [UInt8] {
        return [UInt8](repeating: 0x00, count: 16)
    }
    
    public func convertToData(data: [UInt8]) -> Data {
        return Data(bytes: data, count:data.count)
    }
    
    public func convertFullArray(data: [UInt8]) -> Data {
//        CLEAN UP THIS FUNCTION. IT WORKS BUT ITS SUPER SLOPPY
        var data = data
        let response: Data = convertToData(data: data)
        let check = response.checksum
        data[15] = UInt8(check)
        let value: Data = convertToData(data: data)
        return value
    }

      public func convertScaleFullArray(data: [UInt8]) -> Data {
//        CLEAN UP THIS FUNCTION. IT WORKS BUT ITS SUPER SLOPPY
        let value: Data = convertToData(data: data)
        return value
    }
    
    
    
        @objc
    public func activateVibration(  _ deviceIdentifier: String,
                                                    duration: Int,
                                                    transactionId: String,
                                                          resolve: @escaping Resolve,
                                                           reject: @escaping Reject) {
        var data = createNewArray()
        data[0] = 0x36
        data[1] = UInt8(duration)
        let value = convertFullArray(data: data)

        let observable = getCharacteristicForDevice(deviceIdentifier,
                                                    serviceUUID: self.trackerServiceUUID,
                                                    characteristicUUID: self.trackerWriteCharacteristic)
        safeWriteCharacteristicForDevice(observable,
                                         value: value,
                                         response: true,
                                         transactionId: transactionId,
                                         promise: SafePromise(resolve: resolve, reject: reject))
    }

            @objc
    public func setUserProfileToScales(  _ deviceIdentifier: String,
                                                    age: Int,
                                                    height: Int,
                                                    gender: String,
                                                    transactionId: String,
                                                          resolve: @escaping Resolve,
                                                           reject: @escaping Reject) {

        let ageHex = String(format:"%2X", age)
        let number = (gender as! String == "male") ? UInt8(ageHex, radix: 16)! + 128 : UInt8(ageHex, radix: 16)
        let heightHex = String(format:"%2X", height)                                                   
        var data = getEmptyRequestScales(count: 7)

        data[0] = 0xFD
        data[1] = 0x53
        data[2] = 0x00
        data[3] = 0x00
        data[4] = 0x40
        data[5] = number!
        data[6] = UInt8(heightHex, radix: 16)!

        let value = convertScaleFullArray(data: data)

        let observable = getCharacteristicForDevice(deviceIdentifier,
                                                    serviceUUID: self.trackerServiceUUID,
                                                    characteristicUUID: self.scaleWriteCharacteristic)
        safeWriteCharacteristicForDevice(observable,
                                         value: value,
                                         response: true,
                                         transactionId: transactionId,
                                         promise: SafePromise(resolve: resolve, reject: reject))
    }

                @objc
    public func setUserProfileToAlternativeScale(  _ deviceIdentifier: String,
                                                    age: Int,
                                                    height: Int,
                                                    gender: String,
                                                    transactionId: String,
                                                          resolve: @escaping Resolve,
                                                           reject: @escaping Reject) {

        var data = getEmptyRequestScales(count: 13)

        let gender = (gender as! String == "male") ? 0 : 1

        data[0] = 0x81
        data[1] = 0x00
        data[2] = 0x81
        data[3] = 0x00
        data[4] = 0x00
        data[5] = 0x00
        data[6] = 0x00
        data[7] = 0x00
        data[8] =  UInt8(height)
        data[9] =  UInt8(age)
        data[10] = UInt8(gender)
        data[11] = 0x00
        data[12] = 0x00

        let value = convertScaleFullArray(data: data)

        let observable = getCharacteristicForDevice(deviceIdentifier,
                                                    serviceUUID: self.trackerServiceUUID,
                                                    characteristicUUID: self.alternativeScaleWriteCharacteristic)
        safeWriteCharacteristicForDevice(observable,
                                         value: value,
                                         response: false,
                                         transactionId: transactionId,
                                         promise: SafePromise(resolve: resolve, reject: reject))
    }

                    @objc
    public func synchronizeAlternativeScale(  _ deviceIdentifier: String,
                                                    transactionId: String,
                                                          resolve: @escaping Resolve,
                                                           reject: @escaping Reject) {
        
        var data = getEmptyRequestScales(count: 8)                                                    
        data[0] = 0x41
        data[1] = 0x00
        data[2] = 0x84
        data[3] = 0x7F
        data[4] = 0x44
        data[5] = 0x3C
        data[6] = 0xFB
        data[7] = 0x00

        let value = convertScaleFullArray(data: data)

        let observable = getCharacteristicForDevice(deviceIdentifier,
                                                    serviceUUID: self.trackerServiceUUID,
                                                    characteristicUUID: self.alternativeScaleWriteCharacteristic)
        safeWriteCharacteristicForDevice(observable,
                                         value: value,
                                         response: false,
                                         transactionId: transactionId,
                                         promise: SafePromise(resolve: resolve, reject: reject))
    }

                        @objc
    public func selectProfileAlternativeScale(  _ deviceIdentifier: String,
                                                    transactionId: String,
                                                          resolve: @escaping Resolve,
                                                           reject: @escaping Reject) {
   
        var data = getEmptyRequestScales(count: 7)                                                    
        data[0] = 0x41
        data[1] = 0x00
        data[2] = 0x82
        data[3] = 0x00
        data[4] = 0x00
        data[5] = 0x00
        data[6] = 0x20

        let value = convertScaleFullArray(data: data)

        let observable = getCharacteristicForDevice(deviceIdentifier,
                                                    serviceUUID: self.trackerServiceUUID,
                                                    characteristicUUID: self.alternativeScaleWriteCharacteristic)
        safeWriteCharacteristicForDevice(observable,
                                         value: value,
                                         response: false,
                                         transactionId: transactionId,
                                         promise: SafePromise(resolve: resolve, reject: reject))
    }

    @objc
    public func setDeviceTime(  _ deviceIdentifier: String,
                                                    date: String,
                                                    transactionId: String,
                                                    
                                                          resolve: @escaping Resolve,
                                                           reject: @escaping Reject) {
        var dateString = date
        let calendar = Calendar.current
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
        let date = dateFormatter.date(from: dateString)
        let year = UInt8(calendar.component(.year, from: date!) % 100)
        let month = UInt8(calendar.component(.month, from: date!))
        let day = UInt8(calendar.component(.day, from: date!))
        let hour = UInt8(calendar.component(.hour, from: date!))
        let minute = UInt8(calendar.component(.minute, from: date!))
        let second = UInt8(calendar.component(.second, from: date!))
        
        var data = createNewArray()
        data[0] = 0x01
        data[1] = UInt8(String(year), radix: 16)!
        data[2] = UInt8(String(month), radix: 16)!
        data[3] = UInt8(String(day), radix: 16)!
        data[4] = UInt8(String(hour), radix: 16)!
        data[5] = UInt8(String(minute), radix: 16)!
        data[6] = UInt8(String(second), radix: 16)!
        let value = convertFullArray(data: data)

        let observable = getCharacteristicForDevice(deviceIdentifier,
                                                    serviceUUID: self.trackerServiceUUID,
                                                    characteristicUUID: self.trackerWriteCharacteristic)
        safeWriteCharacteristicForDevice(observable,
                                         value: value,
                                         response: true,
                                         transactionId: transactionId,
                                         promise: SafePromise(resolve: resolve, reject: reject))
    }

        @objc
    public func setUserPersonalInfo(  _ deviceIdentifier: String,
                                                    info: Dictionary<String, Any>,
                                                    transactionId: String,
                                                          resolve: @escaping Resolve,
                                                           reject: @escaping Reject) {

       
        let gender = (info["gender"] as! String == "male") ? 1 : 0
        let age = info["age"] as! UInt8
        let height = info["height"] as! UInt8
        let weight = info["weight"] as! UInt8
        let strideLength = info["strideLength"] as! UInt8
        
        var data = createNewArray()
        data[0] = 0x02
        data[1] = UInt8(gender)
        data[2] = age
        data[3] = height
        data[4] = weight
        data[5] = strideLength                                              

        let value = convertFullArray(data: data)

        let observable = getCharacteristicForDevice(deviceIdentifier,
                                                    serviceUUID: self.trackerServiceUUID,
                                                    characteristicUUID: self.trackerWriteCharacteristic)
        safeWriteCharacteristicForDevice(observable,
                                         value: value,
                                         response: true,
                                         transactionId: transactionId,
                                         promise: SafePromise(resolve: resolve, reject: reject))
    }

        @objc
    public func getDetailedDayActivity(  _ deviceIdentifier: String,
                                                    date: Int,
                                                    transactionId: String,
                                                          resolve: @escaping Resolve,
                                                           reject: @escaping Reject) {

        var data = createNewArray()
        data[0] = 0x43
        data[1] = UInt8(date)                            

        let value = convertFullArray(data: data)

        

        let observable = getCharacteristicForDevice(deviceIdentifier,
                                                    serviceUUID: self.trackerServiceUUID,
                                                    characteristicUUID: self.trackerWriteCharacteristic)
                                       
        safeWriteCharacteristicForDevice(observable,
                                         value: value,
                                         response: true,
                                         transactionId: transactionId,
                                         promise: SafePromise(resolve: resolve, reject: reject))
    }

            @objc
    public func getSummaryDayActivity(  _ deviceIdentifier: String,
                                                    date: Int,
                                                    transactionId: String,
                                                          resolve: @escaping Resolve,
                                                           reject: @escaping Reject) {

        var data = createNewArray()
        data[0] = 0x07
        data[1] = UInt8(date)                            

        let value = convertFullArray(data: data)
        let observable = getCharacteristicForDevice(deviceIdentifier,
                                                    serviceUUID: self.trackerServiceUUID,
                                                    characteristicUUID: self.trackerWriteCharacteristic)
                                       
        safeWriteCharacteristicForDevice(observable,
                                         value: value,
                                         response: true,
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
        guard let value = valueBase64.fromBase64 else {
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

    @objc
    public func writeCharacteristic(  _ characteristicIdentifier: Double,
                                                     valueBase64: String,
                                                        response: Bool,
                                                   transactionId: String,
                                                         resolve: @escaping Resolve,
                                                          reject: @escaping Reject) {
        guard let value = valueBase64.fromBase64 else {
            return BleError.invalidWriteDataForCharacteristic(characteristicIdentifier.description, data: valueBase64)
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
    public func monitorTrackerResponse(  _ deviceIdentifier: String,
                                                      transactionId: String,
                                                            resolve: @escaping Resolve,
                                                             reject: @escaping Reject) {
        let observable = getCharacteristicForDevice(deviceIdentifier,
                                                    serviceUUID: self.trackerServiceUUID,
                                                    characteristicUUID: self.trackerReadCharacteristic)

        safeMonitorCharacteristicForDevice(observable,
                                           transactionId: transactionId,
                                           promise: SafePromise(resolve: resolve, reject: reject))
    }

        @objc
    public func monitorScaleResponse(  _ deviceIdentifier: String,
                                                      transactionId: String,
                                                            resolve: @escaping Resolve,
                                                             reject: @escaping Reject) {
        let observable = getCharacteristicForDevice(deviceIdentifier,
                                                    serviceUUID: self.trackerServiceUUID,
                                                    characteristicUUID: self.scaleReadCharacteristic)

        safeMonitorCharacteristicForDevice(observable,
                                           transactionId: transactionId,
                                           promise: SafePromise(resolve: resolve, reject: reject))
    }

    @objc
    public func monitorAlternativeScaleResponse(  _ deviceIdentifier: String,
                                                      transactionId: String,
                                                            resolve: @escaping Resolve,
                                                             reject: @escaping Reject) {
        let observable = getCharacteristicForDevice(deviceIdentifier,
                                                    serviceUUID: self.trackerServiceUUID,
                                                    characteristicUUID: self.alternativeScaleReadTemporaryCharacteristic)

        safeMonitorCharacteristicForDevice(observable,
                                           transactionId: transactionId,
                                           promise: SafePromise(resolve: resolve, reject: reject))
    }

        @objc
    public func monitorAlternativeScaleFinalResponse(  _ deviceIdentifier: String,
                                                      transactionId: String,
                                                            resolve: @escaping Resolve,
                                                             reject: @escaping Reject) {
        let observable = getCharacteristicForDevice(deviceIdentifier,
                                                    serviceUUID: self.trackerServiceUUID,
                                                    characteristicUUID: self.alternativeScaleReadFinalCharacteristic)

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

    private func getEmptyRequestScales(count: Int) -> [UInt8] {
        return [UInt8](repeating: 0x00, count: count)
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
