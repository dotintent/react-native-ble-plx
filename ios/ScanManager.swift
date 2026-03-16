import Foundation
@preconcurrency import CoreBluetooth

// MARK: - ScanManager

/// Manages BLE scanning using AsyncStream.
/// Scan results are yielded as ScanResultSnapshot values.
actor ScanManager {
    private var isScanning = false
    private var scanTask: Task<Void, Never>?

    let queue: DispatchSerialQueue
    nonisolated var unownedExecutor: UnownedSerialExecutor { queue.asUnownedSerialExecutor() }

    init(queue: DispatchSerialQueue) {
        self.queue = queue
    }

    /// Start scanning for peripherals.
    /// The `onResult` callback is called for each discovered device.
    func startScan(
        centralManager: CBCentralManager,
        serviceUuids: [CBUUID]?,
        options: [String: Any]?,
        delegateHandler: CentralManagerDelegate,
        onResult: @escaping @Sendable (ScanResultSnapshot) -> Void
    ) {
        stopScanInternal(centralManager: centralManager)

        isScanning = true

        // Start the CB scan
        centralManager.scanForPeripherals(
            withServices: serviceUuids,
            options: options
        )

        // Consume the scan stream
        scanTask = Task { [weak self] in
            for await result in delegateHandler.scanStream {
                guard let self = self else { break }
                // Check we're still scanning (actor-isolated check done via Task)
                guard !Task.isCancelled else { break }
                onResult(result)
            }
        }
    }

    /// Stop scanning
    func stopScan(centralManager: CBCentralManager) {
        stopScanInternal(centralManager: centralManager)
    }

    private func stopScanInternal(centralManager: CBCentralManager) {
        if isScanning {
            centralManager.stopScan()
            isScanning = false
        }
        scanTask?.cancel()
        scanTask = nil
    }

    func cleanup(centralManager: CBCentralManager) {
        stopScanInternal(centralManager: centralManager)
    }
}
