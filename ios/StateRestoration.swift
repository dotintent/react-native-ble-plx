import Foundation
@preconcurrency import CoreBluetooth

// MARK: - RestoredPeripheralInfo

struct RestoredPeripheralInfo: Sendable {
    let id: String
    let name: String?
}

// MARK: - RestorationState

/// Sendable replacement for the raw `[String: Any]` dictionary from willRestoreState.
/// Parsed immediately in the delegate callback (CB queue isolation domain) so that
/// no non-Sendable dictionary crosses actor boundaries.
struct RestorationState: Sendable {
    let peripheralIdentifiers: [UUID]
    let scanServiceUUIDs: [String]?
    let scanOptions: [String: Bool]?

    init(from dict: [String: Any]) {
        if let peripherals = dict[CBCentralManagerRestoredStatePeripheralsKey] as? [CBPeripheral] {
            self.peripheralIdentifiers = peripherals.map { $0.identifier }
        } else {
            self.peripheralIdentifiers = []
        }

        if let serviceUUIDs = dict[CBCentralManagerRestoredStateScanServicesKey] as? [CBUUID] {
            self.scanServiceUUIDs = serviceUUIDs.map { $0.uuidString }
        } else {
            self.scanServiceUUIDs = nil
        }

        if let options = dict[CBCentralManagerRestoredStateScanOptionsKey] as? [String: Any] {
            var boolOptions: [String: Bool] = [:]
            for (key, value) in options {
                if let boolValue = value as? Bool {
                    boolOptions[key] = boolValue
                }
            }
            self.scanOptions = boolOptions.isEmpty ? nil : boolOptions
        } else {
            self.scanOptions = nil
        }
    }
}

// MARK: - StateRestoration

/// Handles CoreBluetooth state restoration for background BLE operations.
/// - Re-attaches delegates to restored peripherals
/// - Stores peripheral references strongly (CB does not retain them)
/// - Buffers restoration data until JS subscribes
actor StateRestoration {
    private var restoredPeripherals: [UUID: CBPeripheral] = [:]
    private var bufferedRestorationData: [RestorationState] = []
    private var hasJSSubscribed = false

    let queue: DispatchSerialQueue
    nonisolated var unownedExecutor: UnownedSerialExecutor { queue.asUnownedSerialExecutor() }

    init(queue: DispatchSerialQueue) {
        self.queue = queue
    }

    /// Process restoration data from willRestoreState.
    /// Called before didUpdateState, so we must buffer.
    func handleRestoration(
        dict: [String: Any],
        peripheralFactory: (CBPeripheral) -> PeripheralWrapper
    ) -> [PeripheralWrapper] {
        var wrappers: [PeripheralWrapper] = []

        if let peripherals = dict[CBCentralManagerRestoredStatePeripheralsKey] as? [CBPeripheral] {
            for peripheral in peripherals {
                // Store strong reference — CB does NOT retain restored peripherals
                restoredPeripherals[peripheral.identifier] = peripheral

                let wrapper = peripheralFactory(peripheral)
                wrappers.append(wrapper)
            }
        }

        // Buffer the parsed (Sendable) restoration data for when JS subscribes
        bufferedRestorationData.append(RestorationState(from: dict))

        return wrappers
    }

    /// Called when JS subscribes to restoration events.
    /// Returns any buffered data, then clears the buffer.
    func getBufferedRestorationData() -> [RestorationState] {
        hasJSSubscribed = true
        let data = bufferedRestorationData
        bufferedRestorationData.removeAll()
        return data
    }

    /// Get restored peripheral info for the JS RestoreStateEvent
    func getRestoredDeviceInfos() -> [PeripheralSnapshot] {
        restoredPeripherals.values.map { peripheral in
            EventSerializer.snapshot(from: peripheral)
        }
    }

    /// Clean up restored peripheral references
    func cleanup() {
        restoredPeripherals.removeAll()
        bufferedRestorationData.removeAll()
    }
}
