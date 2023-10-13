import Foundation
import CoreBluetooth

protocol RxCentralManagerType {

    @available(*, deprecated)
    var objectId: UInt { get }
    var rx_didUpdateState: Observable<BluetoothState> { get }
    var rx_willRestoreState: Observable<[String: Any]> { get }
    var rx_didDiscoverPeripheral: Observable<(RxPeripheralType, [String: Any], NSNumber)> { get }
    var rx_didConnectPeripheral: Observable<RxPeripheralType> { get }
    var rx_didFailToConnectPeripheral: Observable<(RxPeripheralType, Error?)> { get }
    var rx_didDisconnectPeripheral: Observable<(RxPeripheralType, Error?)> { get }
    var state: BluetoothState { get }
    var centralManager: CBCentralManager { get }

    func scanForPeripherals(withServices serviceUUIDs: [CBUUID]?, options: [String: Any]?)
    func connect(_ peripheral: RxPeripheralType, options: [String: Any]?)
    func cancelPeripheralConnection(_ peripheral: RxPeripheralType)
    func stopScan()
    func retrieveConnectedPeripherals(withServices serviceUUIDs: [CBUUID]) -> Observable<[RxPeripheralType]>
    func retrievePeripherals(withIdentifiers identifiers: [UUID]) -> Observable<[RxPeripheralType]>
}
