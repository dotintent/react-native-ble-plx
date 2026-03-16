import Foundation
@preconcurrency import CoreBluetooth

// MARK: - BLEActor

/// Central manager actor with custom executor pinned to the CoreBluetooth queue.
/// All CBCentralManager and CBPeripheral interactions happen on this queue.
actor BLEActor {
    let queue = DispatchSerialQueue(label: "com.bleplx.ble")
    nonisolated var unownedExecutor: UnownedSerialExecutor { queue.asUnownedSerialExecutor() }

    private var centralManager: CBCentralManager!
    let delegateHandler: CentralManagerDelegate
    private var peripherals: [UUID: PeripheralWrapper] = [:]
    private var scanManager: ScanManager
    private var stateRestoration: StateRestoration
    private var l2capManager: L2CAPManager!

    // Notification monitoring tasks
    private var monitorTasks: [String: Task<Void, Never>] = [:]
    // Disconnection monitoring task
    private var disconnectionTask: Task<Void, Never>?
    // State monitoring task
    private var stateTask: Task<Void, Never>?
    // Restoration task
    private var restorationTask: Task<Void, Never>?

    // Event callbacks
    private let onScanResult: @Sendable (ScanResultSnapshot) -> Void
    private let onConnectionStateChange: @Sendable (String, String, BleError?) -> Void
    private let onCharacteristicValueUpdate: @Sendable (String, String, String, String?, String?) -> Void
    private let onStateChange: @Sendable (String) -> Void
    private let onRestoreState: @Sendable ([PeripheralSnapshot]) -> Void
    private let onError: @Sendable (BleError) -> Void
    private let onL2CAPData: @Sendable (Int, String) -> Void
    private let onL2CAPClose: @Sendable (Int, String?) -> Void

    init(
        onScanResult: @escaping @Sendable (ScanResultSnapshot) -> Void,
        onConnectionStateChange: @escaping @Sendable (String, String, BleError?) -> Void,
        onCharacteristicValueUpdate: @escaping @Sendable (String, String, String, String?, String?) -> Void,
        onStateChange: @escaping @Sendable (String) -> Void,
        onRestoreState: @escaping @Sendable ([PeripheralSnapshot]) -> Void,
        onError: @escaping @Sendable (BleError) -> Void,
        onL2CAPData: @escaping @Sendable (Int, String) -> Void,
        onL2CAPClose: @escaping @Sendable (Int, String?) -> Void
    ) {
        self.delegateHandler = CentralManagerDelegate()
        self.scanManager = ScanManager(queue: queue)
        self.stateRestoration = StateRestoration(queue: queue)
        self.onScanResult = onScanResult
        self.onConnectionStateChange = onConnectionStateChange
        self.onCharacteristicValueUpdate = onCharacteristicValueUpdate
        self.onStateChange = onStateChange
        self.onRestoreState = onRestoreState
        self.onError = onError
        self.onL2CAPData = onL2CAPData
        self.onL2CAPClose = onL2CAPClose

        self.l2capManager = L2CAPManager(
            onData: onL2CAPData,
            onClose: onL2CAPClose
        )
    }

    // MARK: - Lifecycle

    func createClient(restoreStateIdentifier: String?) {
        var options: [String: Any] = [:]
        if let identifier = restoreStateIdentifier {
            options[CBCentralManagerOptionRestoreIdentifierKey] = identifier
        }

        centralManager = CBCentralManager(
            delegate: delegateHandler,
            queue: queue,
            options: options.isEmpty ? nil : options
        )

        // Monitor state changes
        stateTask = Task { [weak self, delegateHandler] in
            for await state in delegateHandler.stateStream {
                guard let self = self else { break }
                let stateStr = EventSerializer.stateString(from: state)
                self.onStateChange(stateStr)
            }
        }

        // Monitor disconnections
        disconnectionTask = Task { [weak self, delegateHandler] in
            for await result in delegateHandler.disconnectionStream {
                guard let self = self else { break }
                let deviceId = result.peripheralId.uuidString
                let error = result.error.map {
                    ErrorConverter.from(cbError: $0, deviceId: deviceId, operation: "disconnect")
                }
                self.onConnectionStateChange(deviceId, "disconnected", error)

                // Clean up the peripheral wrapper
                await self.removePeripheral(result.peripheralId)
            }
        }

        // Monitor restoration
        restorationTask = Task { [weak self, delegateHandler] in
            for await _ in delegateHandler.restorationStream {
                guard let self = self else { break }
                // Consume the raw dicts from the delegate (same CB queue — no Sendable crossing).
                let rawDicts = delegateHandler.consumeRawRestorationDicts()
                for dict in rawDicts {
                    let wrappers = await self.stateRestoration.handleRestoration(dict: dict) { peripheral in
                        PeripheralWrapper(peripheral: peripheral, queue: self.queue)
                    }
                    for wrapper in wrappers {
                        let uuid = UUID(uuidString: wrapper.deviceId)!
                        await self.storePeripheral(uuid, wrapper: wrapper)
                    }
                }
                let snapshots = await self.stateRestoration.getRestoredDeviceInfos()
                self.onRestoreState(snapshots)
            }
        }
    }

    func destroyClient() async {
        // Stop scanning
        if let cm = centralManager {
            await scanManager.cleanup(centralManager: cm)
        }

        // Cancel all monitor tasks
        for (_, task) in monitorTasks {
            task.cancel()
        }
        monitorTasks.removeAll()

        // Clean up peripherals
        for (_, wrapper) in peripherals {
            await wrapper.cleanup()
        }
        peripherals.removeAll()

        // Clean up L2CAP
        await l2capManager.cleanup()

        // Clean up restoration
        await stateRestoration.cleanup()

        // Cancel monitoring tasks
        stateTask?.cancel()
        disconnectionTask?.cancel()
        restorationTask?.cancel()

        // Finish delegate streams
        delegateHandler.finish()

        centralManager = nil
    }

    // MARK: - State

    func state() -> String {
        guard let cm = centralManager else {
            return "Unknown"
        }
        return EventSerializer.stateString(from: cm.state)
    }

    // MARK: - Scanning

    func startDeviceScan(serviceUuids: [CBUUID]?, options: [String: Any]?) {
        guard let cm = centralManager else { return }

        var cbOptions: [String: Any] = [:]
        if let allowDuplicates = options?["allowDuplicates"] as? Bool, allowDuplicates {
            cbOptions[CBCentralManagerScanOptionAllowDuplicatesKey] = true
        }

        Task {
            await scanManager.startScan(
                centralManager: cm,
                serviceUuids: serviceUuids,
                options: cbOptions.isEmpty ? nil : cbOptions,
                delegateHandler: delegateHandler,
                onResult: onScanResult
            )
        }
    }

    func stopDeviceScan() async {
        guard let cm = centralManager else { return }
        await scanManager.stopScan(centralManager: cm)
    }

    // MARK: - Connection

    func connectToDevice(deviceId: String, options: [String: Any]?) async throws -> PeripheralSnapshot {
        guard let cm = centralManager else {
            throw BleError(code: .bluetoothManagerDestroyed, message: "BLE manager not initialized")
        }

        guard let uuid = UUID(uuidString: deviceId) else {
            throw BleError(code: .invalidIdentifiers, message: "Invalid device ID: \(deviceId)")
        }

        // Check if already connected
        if let existing = peripherals[uuid], await existing.isConnected() {
            throw BleError(code: .deviceAlreadyConnected, message: "Device \(deviceId) is already connected", deviceId: deviceId)
        }

        // Find or retrieve the peripheral
        let peripheral: CBPeripheral
        if let wrapper = peripherals[uuid] {
            peripheral = await wrapper.cbPeripheral
        } else if let discovered = delegateHandler.discoveredPeripheral(for: uuid) {
            peripheral = discovered
        } else {
            let known = cm.retrievePeripherals(withIdentifiers: [uuid])
            guard let p = known.first else {
                throw BleError(code: .deviceNotFound, message: "Device \(deviceId) not found", deviceId: deviceId)
            }
            peripheral = p
        }

        // Emit connecting state
        onConnectionStateChange(deviceId, "connecting", nil)

        // Build connect options
        var connectOptions: [String: Any]? = nil
        if let opts = options {
            var cbOpts: [String: Any] = [:]
            if let autoConnect = opts["autoConnect"] as? Bool, !autoConnect {
                // iOS doesn't support autoConnect=false, it always auto-connects
            }
            if !cbOpts.isEmpty {
                connectOptions = cbOpts
            }
        }

        // Connect with continuation
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            delegateHandler.addConnectionContinuation(continuation, for: uuid)
            cm.connect(peripheral, options: connectOptions)
        }

        // Create wrapper and store
        let wrapper = PeripheralWrapper(peripheral: peripheral, queue: queue)
        peripherals[uuid] = wrapper

        // Emit connected state
        onConnectionStateChange(deviceId, "connected", nil)

        return await wrapper.snapshot()
    }

    func cancelDeviceConnection(deviceId: String) async throws -> PeripheralSnapshot {
        guard let cm = centralManager else {
            throw BleError(code: .bluetoothManagerDestroyed, message: "BLE manager not initialized")
        }

        guard let uuid = UUID(uuidString: deviceId) else {
            throw BleError(code: .invalidIdentifiers, message: "Invalid device ID: \(deviceId)")
        }

        guard let wrapper = peripherals[uuid] else {
            throw BleError(code: .deviceNotFound, message: "Device \(deviceId) not found", deviceId: deviceId)
        }

        let snapshot = await wrapper.snapshot()

        onConnectionStateChange(deviceId, "disconnecting", nil)
        cm.cancelPeripheralConnection(await wrapper.cbPeripheral)

        // Cleanup happens via the disconnection delegate callback
        return snapshot
    }

    func isDeviceConnected(deviceId: String) async throws -> Bool {
        guard let uuid = UUID(uuidString: deviceId) else {
            throw BleError(code: .invalidIdentifiers, message: "Invalid device ID: \(deviceId)")
        }

        guard let wrapper = peripherals[uuid] else {
            return false
        }

        return await wrapper.isConnected()
    }

    // MARK: - Discovery

    func discoverAllServicesAndCharacteristics(deviceId: String) async throws -> PeripheralSnapshot {
        let wrapper = try getPeripheral(deviceId: deviceId)
        return try await wrapper.discoverAllServicesAndCharacteristics()
    }

    // MARK: - Read/Write

    func readCharacteristic(
        deviceId: String,
        serviceUuid: String,
        characteristicUuid: String,
        transactionId: String?
    ) async throws -> CharacteristicSnapshot {
        let wrapper = try getPeripheral(deviceId: deviceId)
        return try await wrapper.readCharacteristic(
            serviceUuid: serviceUuid,
            characteristicUuid: characteristicUuid,
            transactionId: transactionId
        )
    }

    func writeCharacteristic(
        deviceId: String,
        serviceUuid: String,
        characteristicUuid: String,
        value: Data,
        withResponse: Bool,
        transactionId: String?
    ) async throws -> CharacteristicSnapshot {
        let wrapper = try getPeripheral(deviceId: deviceId)
        return try await wrapper.writeCharacteristic(
            serviceUuid: serviceUuid,
            characteristicUuid: characteristicUuid,
            value: value,
            withResponse: withResponse,
            transactionId: transactionId
        )
    }

    // MARK: - Monitor

    func monitorCharacteristic(
        deviceId: String,
        serviceUuid: String,
        characteristicUuid: String,
        transactionId: String?
    ) async throws {
        let wrapper = try getPeripheral(deviceId: deviceId)

        // Enable notifications
        try await wrapper.setNotifyValue(true, serviceUuid: serviceUuid, characteristicUuid: characteristicUuid)

        let monitorKey = "\(deviceId)|\(serviceUuid)|\(characteristicUuid)"

        // Cancel any existing monitor for this characteristic
        monitorTasks[monitorKey]?.cancel()

        // Forward notification values
        let onUpdate = onCharacteristicValueUpdate
        monitorTasks[monitorKey] = Task {
            for await update in await wrapper.characteristicUpdateStream {
                guard !Task.isCancelled else { break }
                if update.characteristicUuid == characteristicUuid &&
                   update.serviceUuid == serviceUuid {
                    onUpdate(deviceId, serviceUuid, characteristicUuid, update.value, transactionId)
                }
            }
        }
    }

    func stopMonitorCharacteristic(
        deviceId: String,
        serviceUuid: String,
        characteristicUuid: String
    ) async throws {
        let wrapper = try getPeripheral(deviceId: deviceId)
        try await wrapper.setNotifyValue(false, serviceUuid: serviceUuid, characteristicUuid: characteristicUuid)

        let monitorKey = "\(deviceId)|\(serviceUuid)|\(characteristicUuid)"
        monitorTasks[monitorKey]?.cancel()
        monitorTasks.removeValue(forKey: monitorKey)
    }

    // MARK: - MTU

    func getMtu(deviceId: String) async throws -> Int {
        let wrapper = try getPeripheral(deviceId: deviceId)
        return await wrapper.mtu()
    }

    func requestMtu(deviceId: String, mtu: Int) async throws -> PeripheralSnapshot {
        // iOS doesn't support requesting a specific MTU — it's negotiated automatically
        let wrapper = try getPeripheral(deviceId: deviceId)
        return await wrapper.snapshot()
    }

    // MARK: - RSSI

    func readRSSI(deviceId: String) async throws -> Int {
        let wrapper = try getPeripheral(deviceId: deviceId)
        return try await wrapper.readRSSI()
    }

    // MARK: - L2CAP

    func openL2CAPChannel(deviceId: String, psm: UInt16) async throws -> Int {
        let wrapper = try getPeripheral(deviceId: deviceId)
        let channel = try await wrapper.openL2CAPChannel(psm: CBL2CAPPSM(psm))
        do {
            let channelId = await l2capManager.registerChannel(channel)
            return channelId
        } catch {
            channel.inputStream.close()
            channel.outputStream.close()
            throw error
        }
    }

    func writeL2CAPChannel(channelId: Int, data: Data) async throws {
        try await l2capManager.write(channelId: channelId, data: data)
    }

    func closeL2CAPChannel(channelId: Int) async throws {
        try await l2capManager.close(channelId: channelId)
    }

    // MARK: - Cancel Transaction

    func cancelTransaction(_ transactionId: String) async {
        for (_, wrapper) in peripherals {
            await wrapper.cancelTransaction(transactionId)
        }
    }

    // MARK: - Private helpers

    private func getPeripheral(deviceId: String) throws -> PeripheralWrapper {
        guard let uuid = UUID(uuidString: deviceId) else {
            throw BleError(code: .invalidIdentifiers, message: "Invalid device ID: \(deviceId)")
        }

        guard let wrapper = peripherals[uuid] else {
            throw BleError(code: .deviceNotConnected, message: "Device \(deviceId) is not connected", deviceId: deviceId)
        }

        return wrapper
    }

    private func storePeripheral(_ uuid: UUID, wrapper: PeripheralWrapper) {
        peripherals[uuid] = wrapper
    }

    private func removePeripheral(_ uuid: UUID) async {
        if let wrapper = peripherals.removeValue(forKey: uuid) {
            await wrapper.cleanup()
        }
    }
}
