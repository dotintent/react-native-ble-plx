import Foundation
import CoreBluetooth

#if os(iOS)
    /// Convenience class which helps reading state of restored BluetoothManager.
    public struct RestoredState {

        /// Restored state dictionary.
        public let restoredStateData: [String: Any]

        public unowned let bluetoothManager: BluetoothManager
        /// Creates restored state information based on CoreBluetooth's dictionary
        /// - parameter restoredStateDictionary: Core Bluetooth's restored state data
        /// - parameter bluetoothManager: `BluetoothManager` instance of which state has been restored.
        init(restoredStateDictionary: [String: Any], bluetoothManager: BluetoothManager) {
            restoredStateData = restoredStateDictionary
            self.bluetoothManager = bluetoothManager
        }

        /// Array of `Peripheral` objects which have been restored.
        /// These are peripherals that were connected to the central manager (or had a connection pending)
        /// at the time the app was terminated by the system.
        public var peripherals: [Peripheral] {
            let objects = restoredStateData[CBCentralManagerRestoredStatePeripheralsKey] as? [AnyObject]
            guard let arrayOfAnyObjects = objects else { return [] }
            return arrayOfAnyObjects.compactMap { $0 as? CBPeripheral }
                .map(RxCBPeripheral.init)
                .map { Peripheral(manager: bluetoothManager, peripheral: $0) }
        }

        /// Dictionary that contains all of the peripheral scan options that were being used
        /// by the central manager at the time the app was terminated by the system.
        public var scanOptions: [String: AnyObject]? {
            return restoredStateData[CBCentralManagerRestoredStatePeripheralsKey] as? [String: AnyObject]
        }

        /// Array of `Service` objects which have been restored.
        /// These are all the services the central manager was scanning for at the time the app
        /// was terminated by the system.
        public var services: [Service] {
            let objects = restoredStateData[CBCentralManagerRestoredStateScanServicesKey] as? [AnyObject]
            guard let arrayOfAnyObjects = objects else { return [] }
            return arrayOfAnyObjects.compactMap { $0 as? CBService }
                .map(RxCBService.init)
                .compactMap {

                    // Necessary to accomodate the changes between
                    // iOS 14 and iOS 15
                    let optPeripheral: CBPeripheral? = $0.service.peripheral
                    guard let peripheral = optPeripheral else {
                        return nil
                    }

                    return Service(peripheral: Peripheral(manager: bluetoothManager,
                                                          peripheral: RxCBPeripheral(peripheral: peripheral)),
                                   service: $0) }
        }
    }
#endif
