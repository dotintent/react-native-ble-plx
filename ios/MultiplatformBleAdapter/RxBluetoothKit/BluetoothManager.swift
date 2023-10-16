import Foundation
import CoreBluetooth

// swiftlint:disable line_length

/// BluetoothManager is a class implementing ReactiveX API which wraps all Core Bluetooth Manager's functions allowing to
/// discover, connect to remote peripheral devices and more. It's using thin layer behind `RxCentralManagerType` protocol which is
/// implemented by `RxCBCentralManager` and should not be used directly by the user of a RxBluetoothKit library.
/// You can start using this class by discovering available services of nearby peripherals. Before calling any
/// public `BluetoothManager`'s functions you should make sure that Bluetooth is turned on and powered on. It can be done
/// by calling and observing returned value of `monitorState()` and then chaining it with `scanForPeripherals(_:options:)`:
/// ```
/// bluetoothManager.rx_state
///     .filter { $0 == .PoweredOn }
///     .take(1)
///     .flatMap { manager.scanForPeripherals(nil) }
/// ```
/// As a result you will receive `ScannedPeripheral` which contains `Peripheral` object, `AdvertisementData` and
/// peripheral's RSSI registered during discovery. You can then `connectToPeripheral(_:options:)` and do other operations.
/// - seealso: `Peripheral`
public class BluetoothManager {

    /// Implementation of Central Manager
    private let centralManager: RxCentralManagerType

    /// Queue on which all observables are serialised if needed
    private let subscriptionQueue = SerializedSubscriptionQueue()

    /// Lock which should be used before accessing any internal structures
    private let lock = NSLock()

    /// Queue of scan operations which are waiting for an execution
    private var scanQueue: [ScanOperation] = []

    /// Unique identifier of an object. Should be removed in 4.0
    @available(*, deprecated)
    public var objectId: UInt {
        return centralManager.objectId
    }

    public var manager: CBCentralManager {
        return centralManager.centralManager
    }

    // MARK: Initialization

    /// Creates new `BluetoothManager` instance with specified implementation of `RxCentralManagerType` protocol which will be
    /// used by this class. Most of a time `RxCBCentralManager` should be chosen by the user.
    /// - parameter centralManager: Implementation of `RxCentralManagerType` protocol used by this class.
    init(centralManager: RxCentralManagerType) {
        self.centralManager = centralManager
    }

    /// Creates new `BluetoothManager` instance. By default all operations and events are executed and received on main thread.
    /// - warning: If you pass background queue to the method make sure to observe results on main thread for UI related code.
    /// - parameter queue: Queue on which bluetooth callbacks are received. By default main thread is used.
    /// - parameter options: An optional dictionary containing initialization options for a central manager.
    /// For more info about it please refer to [Central Manager initialization options](https://developer.apple.com/library/ios/documentation/CoreBluetooth/Reference/CBCentralManager_Class/index.html)
    public convenience init(queue: DispatchQueue = .main,
                            options: [String: AnyObject]? = nil) {
        self.init(centralManager: RxCBCentralManager(queue: queue, options: options))
    }

    // MARK: Scanning

    /// Scans for `Peripheral`s after subscription to returned observable. First parameter `serviceUUIDs` is
    /// an array of `Service` UUIDs which needs to be implemented by a peripheral to be discovered. If user don't want to
    /// filter any peripherals, `nil` can be used instead. Additionally dictionary of
    /// [CBCentralManager specific options](https://developer.apple.com/library/ios/documentation/CoreBluetooth/Reference/CBCentralManager_Class/#//apple_ref/doc/constant_group/Peripheral_Scanning_Options)
    /// can be passed to allow further customisation.
    /// Scans by default are infinite streams of `ScannedPeripheral` structures which need to be stopped by the user. For
    /// example this can be done by limiting scanning to certain number of peripherals or time:
    /// ```
    /// bluetoothManager.scanForPeripherals(withServices: nil)
    ///     .timeout(3.0, timeoutScheduler)
    ///     .take(2)
    /// ```
    ///
    /// If different scan is currently in progress and peripherals needed by a user can be discovered by it, new scan is
    /// shared. Otherwise scan is queued and will be executed when other scans finished with complete/error event or
    /// were unsubscribed. As a result you will receive `ScannedPeripheral` which contains `Peripheral` object,
    /// `AdvertisementData` and peripheral's RSSI registered during discovery. You can then
    /// `connectToPeripheral(_:options:)` and do other operations.
    /// - seealso: `Peripheral`
    ///
    /// - parameter serviceUUIDs: Services of peripherals to search for. Nil value will accept all peripherals.
    /// - parameter options: Optional scanning options.
    /// - returns: Infinite stream of scanned peripherals.
    public func scanForPeripherals(withServices serviceUUIDs: [CBUUID]?, options: [String: Any]? = nil)
        -> Observable<ScannedPeripheral> {
        return .deferred { [weak self] in
            guard let strongSelf = self else { throw BluetoothError.destroyed }
            let observable: Observable<ScannedPeripheral> = { [weak self] () -> Observable<ScannedPeripheral> in
                guard let strongSelf = self else { return .error(BluetoothError.destroyed) }
                // If it's possible use existing scan - take if from the queue
                strongSelf.lock.lock(); defer { strongSelf.lock.unlock() }
                if let elem = strongSelf.scanQueue.first(where: { $0.shouldAccept(serviceUUIDs) }) {
                    guard let serviceUUIDs = serviceUUIDs else {
                        return elem.observable
                    }

                    // When binding to existing scan we need to make sure that services are
                    // filtered properly
                    return elem.observable.filter { scannedPeripheral in
                        if let services = scannedPeripheral.advertisementData.serviceUUIDs {
                            return Set(services).isSuperset(of: Set(serviceUUIDs))
                        }
                        return false
                    }
                }

                let scanOperationBox = WeakBox<ScanOperation>()

                // Create new scan which will be processed in a queue
                let operation = Observable.create { [weak self] (element: AnyObserver<ScannedPeripheral>) -> Disposable in
                    guard let strongSelf = self else { return Disposables.create() }
                    // Observable which will emit next element, when peripheral is discovered.
                    let disposable = strongSelf.centralManager.rx_didDiscoverPeripheral
                        .flatMap { [weak self] (peripheral, advertisment, rssi) -> Observable<ScannedPeripheral> in
                            guard let strongSelf = self else { throw BluetoothError.destroyed }
                            let peripheral = Peripheral(manager: strongSelf, peripheral: peripheral)
                            let advertismentData = AdvertisementData(advertisementData: advertisment)
                            return .just(ScannedPeripheral(peripheral: peripheral,
                                                           advertisementData: advertismentData, rssi: rssi))
                        }
                        .subscribe(element)

                    // Start scanning for devices
                    strongSelf.centralManager.scanForPeripherals(withServices: serviceUUIDs, options: options)

                    return Disposables.create { [weak self] in
                        guard let strongSelf = self else { return }
                        // When disposed, stop all scans, and remove scanning operation from queue
                        if strongSelf.centralManager.state == .poweredOn {
                            strongSelf.centralManager.stopScan()
                        }
                        disposable.dispose()
                        do { strongSelf.lock.lock(); defer { strongSelf.lock.unlock() }
                            if let index = strongSelf.scanQueue.index(where: { $0 == scanOperationBox.value! }) {
                                strongSelf.scanQueue.remove(at: index)
                            }
                        }
                    }
                }
                .queueSubscribe(on: strongSelf.subscriptionQueue)
                .publish()
                .refCount()

                let scanOperation = ScanOperation(uuids: serviceUUIDs, observable: operation)
                strongSelf.scanQueue.append(scanOperation)

                scanOperationBox.value = scanOperation
                return operation
            }()
            // Allow scanning as long as bluetooth is powered on
            return strongSelf.ensure(.poweredOn, observable: observable)
        }
    }

    // MARK: State

    /// Continuous state of `BluetoothManager` instance described by `BluetoothState` which is equivalent to  [CBManagerState](https://developer.apple.com/reference/corebluetooth/cbmanager/1648600-state).
    /// - returns: Observable that emits `Next` immediately after subscribtion with current state of Bluetooth. Later,
    /// whenever state changes events are emitted. Observable is infinite : doesn't generate `Complete`.
    public var rx_state: Observable<BluetoothState> {
        return .deferred { [weak self] in
            guard let `self` = self else { throw BluetoothError.destroyed }
            return self.centralManager.rx_didUpdateState.startWith(self.centralManager.state)
        }
    }

    /// Current state of `BluetoothManager` instance described by `BluetoothState` which is equivalent to [CBManagerState](https://developer.apple.com/reference/corebluetooth/cbmanager/1648600-state).
    /// - returns: Current state of `BluetoothManager` as `BluetoothState`.
    public var state: BluetoothState {
        return centralManager.state
    }

    // MARK: Peripheral's Connection Management

    /// Establishes connection with `Peripheral` after subscription to returned observable. It's user responsibility
    /// to close connection with `cancelConnectionToPeripheral(_:)` after subscription was completed. Unsubscribing from
    /// returned observable cancels connection attempt. By default observable is waiting infinitely for successful connection.
    /// Additionally you can pass optional [dictionary](https://developer.apple.com/library/ios/documentation/CoreBluetooth/Reference/CBCentralManager_Class/#//apple_ref/doc/constant_group/Peripheral_Connection_Options)
    /// to customise the behaviour of connection.
    /// - parameter peripheral: The `Peripheral` to which `BluetoothManager` is attempting to connect.
    /// - parameter options: Dictionary to customise the behaviour of connection.
    /// - returns: Observable which emits next and complete events after connection is established.
    public func connect(_ peripheral: Peripheral, options: [String: Any]? = nil)
        -> Observable<Peripheral> {

        let success = centralManager.rx_didConnectPeripheral
            .filter { $0 == peripheral.peripheral }
            .take(1)
            .map { _ in return peripheral }

        let error = centralManager.rx_didFailToConnectPeripheral
            .filter { $0.0 == peripheral.peripheral }
            .take(1)
            .map { (peripheral, error) -> Peripheral in
                throw BluetoothError.peripheralConnectionFailed(Peripheral(manager: self, peripheral: peripheral), error)
            }

        let observable = Observable<Peripheral>.create { [weak self] observer in
            guard let strongSelf = self else {
                observer.onError(BluetoothError.destroyed)
                return Disposables.create()
            }
            if let error = BluetoothError(state: strongSelf.centralManager.state) {
                observer.onError(error)
                return Disposables.create()
            }

            guard !peripheral.isConnected else {
                observer.onNext(peripheral)
                observer.onCompleted()
                return Disposables.create()
            }

            let disposable = success.amb(error).subscribe(observer)

            strongSelf.centralManager.connect(peripheral.peripheral, options: options)

            return Disposables.create { [weak self] in
                guard let strongSelf = self else { return }
                if !peripheral.isConnected {
                    strongSelf.centralManager.cancelPeripheralConnection(peripheral.peripheral)
                    disposable.dispose()
                }
            }
        }

        return ensure(.poweredOn, observable: observable)
    }

    /// Cancels an active or pending local connection to a `Peripheral` after observable subscription. It is not guaranteed
    /// that physical connection will be closed immediately as well and all pending commands will not be executed.
    /// - parameter peripheral: The `Peripheral` to which the `BluetoothManager` is either trying to
    /// connect or has already connected.
    /// - returns: Observable which emits next and complete events when peripheral successfully cancelled connection.
    public func cancelPeripheralConnection(_ peripheral: Peripheral) -> Observable<Peripheral> {
        let observable = Observable<Peripheral>.create { [weak self] observer in
            guard let strongSelf = self else {
                observer.onError(BluetoothError.destroyed)
                return Disposables.create()
            }
            let disposable = strongSelf.monitorDisconnection(for: peripheral).take(1).subscribe(observer)
            strongSelf.centralManager.cancelPeripheralConnection(peripheral.peripheral)
            return disposable
        }
        return ensure(.poweredOn, observable: observable)
    }

    // MARK: Retrieving Lists of Peripherals

    /// Returns observable list of the `Peripheral`s which are currently connected to the `BluetoothManager` and contain all of the specified `Service`'s UUIDs.
    /// - parameter serviceUUIDs: A list of `Service` UUIDs
    /// - returns: Observable which emits retrieved `Peripheral`s. They are in connected state and contain all of the
    /// `Service`s with UUIDs specified in the `serviceUUIDs` parameter. Just after that complete event is emitted
    public func retrieveConnectedPeripherals(withServices serviceUUIDs: [CBUUID]) -> Observable<[Peripheral]> {
        let observable = Observable<[Peripheral]>.deferred { [weak self] in
            guard let strongSelf = self else { throw BluetoothError.destroyed }
            return strongSelf.centralManager.retrieveConnectedPeripherals(withServices: serviceUUIDs)
                .map { [weak self] (peripheralTable: [RxPeripheralType]) -> [Peripheral] in
                    guard let strongSelf = self else { throw BluetoothError.destroyed }
                    return peripheralTable.map {
                        Peripheral(manager: strongSelf, peripheral: $0)
                    }
                }
        }
        return ensure(.poweredOn, observable: observable)
    }

    /// Returns observable list of `Peripheral`s by their identifiers which are known to `BluetoothManager`.
    /// - parameter identifiers: List of `Peripheral`'s identifiers which should be retrieved.
    /// - returns: Observable which emits next and complete events when list of `Peripheral`s are retrieved.
    public func retrievePeripherals(withIdentifiers identifiers: [UUID]) -> Observable<[Peripheral]> {
        let observable = Observable<[Peripheral]>.deferred { [weak self] in
            guard let strongSelf = self else { throw BluetoothError.destroyed }
            return strongSelf.centralManager.retrievePeripherals(withIdentifiers: identifiers)
                .map { [weak self] (peripheralTable: [RxPeripheralType]) -> [Peripheral] in
                    guard let strongSelf = self else { throw BluetoothError.destroyed }
                    return peripheralTable.map {
                        Peripheral(manager: strongSelf, peripheral: $0)
                    }
                }
        }
        return ensure(.poweredOn, observable: observable)
    }

    // MARK: Internal functions

    /// Ensure that `state` is and will be the only state of `BluetoothManager` during subscription.
    /// Otherwise error is emitted.
    /// - parameter state: `BluetoothState` which should be present during subscription.
    /// - parameter observable: Observable into which potential errors should be merged.
    /// - returns: New observable which merges errors with source observable.
    func ensure<T>(_ state: BluetoothState, observable: Observable<T>) -> Observable<T> {
        let statesObservable = rx_state
            .filter { $0 != state && BluetoothError(state: $0) != nil }
            .map { state -> T in throw BluetoothError(state: state)! }
        return .absorb(statesObservable, observable)
    }

    /// Ensure that specified `peripheral` is connected during subscription.
    /// - parameter peripheral: `Peripheral` which should be connected during subscription.
    /// - returns: Observable which emits error when `peripheral` is disconnected during subscription.
    func ensurePeripheralIsConnected<T>(_ peripheral: Peripheral) -> Observable<T> {
        return .deferred {
            if !peripheral.isConnected {
                throw BluetoothError.peripheralDisconnected(peripheral, nil)
            }
            return self.centralManager.rx_didDisconnectPeripheral
                .filter { $0.0 == peripheral.peripheral }
                .map { (_, error) -> T in
                    throw BluetoothError.peripheralDisconnected(peripheral, error)
                }
        }
    }

    /// Emits `Peripheral` instance when it's connected.
    /// - Parameter peripheral: `Peripheral` which is monitored for connection.
    /// - Returns: Observable which emits next events when `peripheral` was connected.
    public func monitorConnection(for peripheral: Peripheral) -> Observable<Peripheral> {
        return monitorPeripheral(on: centralManager.rx_didConnectPeripheral, peripheral: peripheral)
    }

    /// Emits `Peripheral` instance when it's disconnected.
    /// - Parameter peripheral: `Peripheral` which is monitored for disconnection.
    /// - Returns: Observable which emits next events when `peripheral` was disconnected.
    public func monitorDisconnection(for peripheral: Peripheral) -> Observable<Peripheral> {
        return monitorPeripheral(on: centralManager.rx_didDisconnectPeripheral.map { $0.0 }, peripheral: peripheral)
    }

    func monitorPeripheral(on peripheralAction: Observable<RxPeripheralType>, peripheral: Peripheral)
        -> Observable<Peripheral> {
        let observable =
            peripheralAction
            .filter { $0 == peripheral.peripheral }
            .map { _ in peripheral }
        return ensure(.poweredOn, observable: observable)
    }

    #if os(iOS)
        /// Emits `RestoredState` instance, when state of `BluetoothManager` has been restored,
        /// Should only be called once in the lifetime of the app
        /// - Returns: Observable which emits next events state has been restored
        public func listenOnRestoredState() -> Observable<RestoredState> {
            return centralManager
                .rx_willRestoreState
                .take(1)
                .flatMap { [weak self] dict -> Observable<RestoredState> in
                    guard let strongSelf = self else { throw BluetoothError.destroyed }
                    return .just(RestoredState(restoredStateDictionary: dict, bluetoothManager: strongSelf))
                }
        }
    #endif
}
