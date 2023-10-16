import Foundation
import CoreBluetooth

class RxCBCentralManager: RxCentralManagerType {

    let centralManager: CBCentralManager
    private let internalDelegate = InternalDelegate()

    @available(*, deprecated)
    var objectId: UInt {
        return UInt(bitPattern: ObjectIdentifier(centralManager))
    }

    init(queue: DispatchQueue, options: [String: AnyObject]? = nil) {
        centralManager = CBCentralManager(delegate: internalDelegate, queue: queue, options: options)
    }

    @objc private class InternalDelegate: NSObject, CBCentralManagerDelegate {
        let didUpdateStateSubject = PublishSubject<BluetoothState>()
        let willRestoreStateSubject = ReplaySubject<[String: Any]>.create(bufferSize: 1)
        let didDiscoverPeripheralSubject = PublishSubject<(RxPeripheralType, [String: Any], NSNumber)>()
        let didConnectPerihperalSubject = PublishSubject<RxPeripheralType>()
        let didFailToConnectPeripheralSubject = PublishSubject<(RxPeripheralType, Error?)>()
        let didDisconnectPeripheral = PublishSubject<(RxPeripheralType, Error?)>()

        @objc func centralManagerDidUpdateState(_ central: CBCentralManager) {
            guard let bleState = BluetoothState(rawValue: central.state.rawValue) else { return }
            RxBluetoothKitLog.d("\(central.logDescription) didUpdateState(state: \(bleState.logDescription))")
            didUpdateStateSubject.onNext(bleState)
        }

        @objc func centralManager(_ central: CBCentralManager, willRestoreState dict: [String: Any]) {
            RxBluetoothKitLog.d("\(central.logDescription) willRestoreState(restoredState: \(dict))")
            willRestoreStateSubject.onNext(dict)
        }

        @objc func centralManager(_ central: CBCentralManager,
                                  didDiscover peripheral: CBPeripheral,
                                  advertisementData: [String: Any],
                                  rssi: NSNumber) {
            RxBluetoothKitLog.v("""
                                \(central.logDescription) didDiscover(peripheral: \(peripheral.logDescription),
                                rssi: \(rssi))
                                """)
            didDiscoverPeripheralSubject.onNext((RxCBPeripheral(peripheral: peripheral), advertisementData, rssi))
        }

        @objc func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
            didConnectPerihperalSubject.onNext(RxCBPeripheral(peripheral: peripheral))
        }

        @objc func centralManager(_ central: CBCentralManager,
                                  didFailToConnect peripheral: CBPeripheral,
                                  error: Error?) {
            RxBluetoothKitLog.d("""
                                \(central.logDescription) didFailToConnect(to: \(peripheral.logDescription),
                                error: \(String(describing: error)))
                                """)
            didFailToConnectPeripheralSubject.onNext((RxCBPeripheral(peripheral: peripheral), error))
        }

        @objc func centralManager(_ central: CBCentralManager,
                                  didDisconnectPeripheral peripheral: CBPeripheral,
                                  error: Error?) {
            RxBluetoothKitLog.d("""
                                \(central.logDescription) didDisconnect(from: \(peripheral.logDescription),
                                error: \(String(describing: error)))
                                """)
            didDisconnectPeripheral.onNext((RxCBPeripheral(peripheral: peripheral), error))
        }
    }

    var rx_didUpdateState: Observable<BluetoothState> {
        return internalDelegate.didUpdateStateSubject
    }

    var rx_willRestoreState: Observable<[String: Any]> {
        return internalDelegate.willRestoreStateSubject
    }

    var rx_didDiscoverPeripheral: Observable<(RxPeripheralType, [String: Any], NSNumber)> {
        return internalDelegate.didDiscoverPeripheralSubject
    }

    var rx_didConnectPeripheral: Observable<RxPeripheralType> {
        return internalDelegate.didConnectPerihperalSubject
    }

    var rx_didFailToConnectPeripheral: Observable<(RxPeripheralType, Error?)> {
        return internalDelegate.didFailToConnectPeripheralSubject
    }

    var rx_didDisconnectPeripheral: Observable<(RxPeripheralType, Error?)> {
        return internalDelegate.didDisconnectPeripheral
    }

    var state: BluetoothState {
        return BluetoothState(rawValue: centralManager.state.rawValue) ?? .unsupported
    }

    func scanForPeripherals(withServices serviceUUIDs: [CBUUID]?, options: [String: Any]?) {
        RxBluetoothKitLog.d("""
                            \(centralManager.logDescription) scanForPeripherals(
                            withServices: \(String(describing: serviceUUIDs?.logDescription)),
                            options: \(String(describing: options)))
                            """)
        return centralManager.scanForPeripherals(withServices: serviceUUIDs, options: options)
    }

    func connect(_ peripheral: RxPeripheralType, options: [String: Any]?) {
        let cbperipheral = (peripheral as! RxCBPeripheral).peripheral
        RxBluetoothKitLog.d("""
                            \(centralManager.logDescription) connect(
                            peripheral: \(cbperipheral.logDescription),
                            options: \(String(describing: options)))
                            """)
        return centralManager.connect(cbperipheral, options: options)
    }

    func cancelPeripheralConnection(_ peripheral: RxPeripheralType) {
        let cbperipheral = (peripheral as! RxCBPeripheral).peripheral
        RxBluetoothKitLog.d("""
                            \(centralManager.logDescription) cancelPeripheralConnection(
                            peripheral: \(cbperipheral.logDescription))
                            """)
        return centralManager.cancelPeripheralConnection(cbperipheral)
    }

    func stopScan() {
        RxBluetoothKitLog.d("\(centralManager.logDescription) stopScan()")
        return centralManager.stopScan()
    }

    func retrieveConnectedPeripherals(withServices serviceUUIDs: [CBUUID]) -> Observable<[RxPeripheralType]> {
        RxBluetoothKitLog.d("""
                            \(centralManager.logDescription) retrieveConnectedPeripherals(
                            withServices: \(serviceUUIDs.logDescription))
                            """)
        return .just(centralManager.retrieveConnectedPeripherals(withServices: serviceUUIDs).map(RxCBPeripheral.init))
    }

    func retrievePeripherals(withIdentifiers identifiers: [UUID]) -> Observable<[RxPeripheralType]> {
        RxBluetoothKitLog.d("""
                            \(centralManager.logDescription) retrievePeripherals(
                            withIdentifiers: \(identifiers.logDescription))
                            """)
        return .just(centralManager.retrievePeripherals(withIdentifiers: identifiers).map(RxCBPeripheral.init))
    }
}
