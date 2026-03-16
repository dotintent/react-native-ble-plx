import Foundation
@preconcurrency import CoreBluetooth

/// Protocol for the event emitter (ObjC++ BlePlx module)
/// Uses typed emit methods matching the Codegen-generated NativeBlePlxSpecBase
@objc public protocol BLEEventEmitter: AnyObject {
    func emitOnScanResult(_ value: NSDictionary)
    func emitOnConnectionStateChange(_ value: NSDictionary)
    func emitOnCharacteristicValueUpdate(_ value: NSDictionary)
    func emitOnStateChange(_ value: NSDictionary)
    func emitOnRestoreState(_ value: NSDictionary)
    func emitOnError(_ value: NSDictionary)
    func emitOnBondStateChange(_ value: NSDictionary)
    func emitOnConnectionEvent(_ value: NSDictionary)
    func emitOnL2CAPData(_ value: NSDictionary)
    func emitOnL2CAPClose(_ value: NSDictionary)
}

// MARK: - BLEModuleImpl

/// @objc Swift class that bridges between the ObjC++ TurboModule entry and the Swift actor.
/// All methods are called from the ObjC++ layer and delegate to BLEActor.
@objc public class BLEModuleImpl: NSObject {

    private weak var eventEmitter: BLEEventEmitter?
    private var actor: BLEActor?

    @objc public init(eventEmitter: BLEEventEmitter) {
        self.eventEmitter = eventEmitter
        super.init()
    }

    @objc public static func supportedEventNames() -> [String] {
        return [
            "onScanResult",
            "onConnectionStateChange",
            "onCharacteristicValueUpdate",
            "onStateChange",
            "onRestoreState",
            "onError",
            "onBondStateChange",
            "onConnectionEvent",
            "onL2CAPData",
            "onL2CAPClose",
        ]
    }

    // MARK: - Private helpers

    private func emitError(_ dict: [String: Any]) {
        eventEmitter?.emitOnError(dict as NSDictionary)
    }

    private func rejectWithError(_ reject: @escaping @Sendable (String?, String?, Error?) -> Void, error: BleError) {
        reject(String(error.code.rawValue), error.message, nil)
        emitError(error.toDictionary())
    }

    private func rejectWithError(_ reject: @escaping @Sendable (String?, String?, Error?) -> Void, error: Error) {
        if let bleError = error as? BleError {
            rejectWithError(reject, error: bleError)
        } else {
            let bleError = BleError(code: .unknown, message: error.localizedDescription)
            rejectWithError(reject, error: bleError)
        }
    }

    // MARK: - Lifecycle

    @objc public func createClient(
        restoreStateIdentifier: String?,
        resolve: @escaping @Sendable (Any?) -> Void,
        reject: @escaping @Sendable (String?, String?, Error?) -> Void
    ) {
        let emitter = self.eventEmitter

        actor = BLEActor(
            onScanResult: { [weak emitter] snapshot in
                emitter?.emitOnScanResult(snapshot.toDictionary() as NSDictionary)
            },
            onConnectionStateChange: { [weak emitter] deviceId, state, error in
                var body: [String: Any] = [
                    "deviceId": deviceId,
                    "state": state,
                ]
                body["errorCode"] = error?.code.rawValue
                body["errorMessage"] = error?.message
                emitter?.emitOnConnectionStateChange(body as NSDictionary)
            },
            onCharacteristicValueUpdate: { [weak emitter] deviceId, serviceUuid, charUuid, value, transactionId in
                var body: [String: Any] = [
                    "deviceId": deviceId,
                    "serviceUuid": serviceUuid,
                    "characteristicUuid": charUuid,
                    "value": value ?? "",
                ]
                body["transactionId"] = transactionId
                emitter?.emitOnCharacteristicValueUpdate(body as NSDictionary)
            },
            onStateChange: { [weak emitter] state in
                emitter?.emitOnStateChange(["state": state] as NSDictionary)
            },
            onRestoreState: { [weak emitter] devices in
                let deviceDicts = devices.map { $0.toDictionary() }
                emitter?.emitOnRestoreState(["devices": deviceDicts] as NSDictionary)
            },
            onError: { [weak emitter] error in
                emitter?.emitOnError(error.toDictionary() as NSDictionary)
            },
            onL2CAPData: { [weak emitter] channelId, data in
                emitter?.emitOnL2CAPData(["channelId": channelId, "data": data] as NSDictionary)
            },
            onL2CAPClose: { [weak emitter] channelId, error in
                emitter?.emitOnL2CAPClose(["channelId": channelId, "error": error as Any] as NSDictionary)
            }
        )

        Task {
            await actor?.createClient(restoreStateIdentifier: restoreStateIdentifier)
            resolve(nil)
        }
    }

    @objc public func destroyClient(
        resolve: @escaping @Sendable (Any?) -> Void,
        reject: @escaping @Sendable (String?, String?, Error?) -> Void
    ) {
        Task {
            await actor?.destroyClient()
            actor = nil
            resolve(nil)
        }
    }

    @objc public func invalidate() {
        Task {
            await actor?.destroyClient()
            actor = nil
        }
    }

    // MARK: - State

    @objc public func state(
        resolve: @escaping @Sendable (Any?) -> Void,
        reject: @escaping @Sendable (String?, String?, Error?) -> Void
    ) {
        Task {
            let state = await actor?.state() ?? "Unknown"
            resolve(state)
        }
    }

    // MARK: - Scanning

    @objc public func startDeviceScan(
        uuids: [String]?,
        options: NSDictionary?
    ) {
        let serviceUuids = uuids?.compactMap { CBUUID(string: $0) }
        let opts = options as? [String: Any]

        Task {
            await actor?.startDeviceScan(serviceUuids: serviceUuids, options: opts)
        }
    }

    @objc public func stopDeviceScan(
        resolve: @escaping @Sendable (Any?) -> Void,
        reject: @escaping @Sendable (String?, String?, Error?) -> Void
    ) {
        Task {
            await actor?.stopDeviceScan()
            resolve(nil)
        }
    }

    // MARK: - Connection

    @objc public func connectToDevice(
        deviceId: String,
        options: NSDictionary?,
        resolve: @escaping @Sendable (Any?) -> Void,
        reject: @escaping @Sendable (String?, String?, Error?) -> Void
    ) {
        let opts = options as? [String: Any]

        Task {
            do {
                guard let actor = actor else {
                    throw BleError(code: .bluetoothManagerDestroyed, message: "BLE manager not initialized")
                }
                let snapshot = try await actor.connectToDevice(deviceId: deviceId, options: opts)
                resolve(snapshot.toDictionary())
            } catch {
                rejectWithError(reject, error: error)
            }
        }
    }

    @objc public func cancelDeviceConnection(
        deviceId: String,
        resolve: @escaping @Sendable (Any?) -> Void,
        reject: @escaping @Sendable (String?, String?, Error?) -> Void
    ) {
        Task {
            do {
                guard let actor = actor else {
                    throw BleError(code: .bluetoothManagerDestroyed, message: "BLE manager not initialized")
                }
                let snapshot = try await actor.cancelDeviceConnection(deviceId: deviceId)
                resolve(snapshot.toDictionary())
            } catch {
                rejectWithError(reject, error: error)
            }
        }
    }

    @objc public func isDeviceConnected(
        deviceId: String,
        resolve: @escaping @Sendable (Any?) -> Void,
        reject: @escaping @Sendable (String?, String?, Error?) -> Void
    ) {
        Task {
            do {
                guard let actor = actor else {
                    throw BleError(code: .bluetoothManagerDestroyed, message: "BLE manager not initialized")
                }
                let connected = try await actor.isDeviceConnected(deviceId: deviceId)
                resolve(connected)
            } catch {
                rejectWithError(reject, error: error)
            }
        }
    }

    // MARK: - Discovery

    @objc public func discoverAllServicesAndCharacteristics(
        deviceId: String,
        transactionId: String?,
        resolve: @escaping @Sendable (Any?) -> Void,
        reject: @escaping @Sendable (String?, String?, Error?) -> Void
    ) {
        Task {
            do {
                guard let actor = actor else {
                    throw BleError(code: .bluetoothManagerDestroyed, message: "BLE manager not initialized")
                }
                let snapshot = try await actor.discoverAllServicesAndCharacteristics(deviceId: deviceId)
                resolve(snapshot.toDictionary())
            } catch {
                rejectWithError(reject, error: error)
            }
        }
    }

    // MARK: - Read/Write

    @objc public func readCharacteristic(
        deviceId: String,
        serviceUuid: String,
        characteristicUuid: String,
        transactionId: String?,
        resolve: @escaping @Sendable (Any?) -> Void,
        reject: @escaping @Sendable (String?, String?, Error?) -> Void
    ) {
        Task {
            do {
                guard let actor = actor else {
                    throw BleError(code: .bluetoothManagerDestroyed, message: "BLE manager not initialized")
                }
                let snapshot = try await actor.readCharacteristic(
                    deviceId: deviceId,
                    serviceUuid: serviceUuid,
                    characteristicUuid: characteristicUuid,
                    transactionId: transactionId
                )
                resolve(snapshot.toDictionary())
            } catch {
                rejectWithError(reject, error: error)
            }
        }
    }

    @objc public func writeCharacteristic(
        deviceId: String,
        serviceUuid: String,
        characteristicUuid: String,
        value: String,
        withResponse: Bool,
        transactionId: String?,
        resolve: @escaping @Sendable (Any?) -> Void,
        reject: @escaping @Sendable (String?, String?, Error?) -> Void
    ) {
        Task {
            do {
                guard let actor = actor else {
                    throw BleError(code: .bluetoothManagerDestroyed, message: "BLE manager not initialized")
                }
                guard let data = Data(base64Encoded: value) else {
                    throw BleError(code: .invalidIdentifiers, message: "Invalid base64 value")
                }
                let snapshot = try await actor.writeCharacteristic(
                    deviceId: deviceId,
                    serviceUuid: serviceUuid,
                    characteristicUuid: characteristicUuid,
                    value: data,
                    withResponse: withResponse,
                    transactionId: transactionId
                )
                resolve(snapshot.toDictionary())
            } catch {
                rejectWithError(reject, error: error)
            }
        }
    }

    // MARK: - Monitor

    @objc public func monitorCharacteristic(
        deviceId: String,
        serviceUuid: String,
        characteristicUuid: String,
        subscriptionType: String?,
        transactionId: String?
    ) {
        Task {
            do {
                guard let actor = actor else {
                    throw BleError(code: .bluetoothManagerDestroyed, message: "BLE manager not initialized")
                }
                try await actor.monitorCharacteristic(
                    deviceId: deviceId,
                    serviceUuid: serviceUuid,
                    characteristicUuid: characteristicUuid,
                    transactionId: transactionId
                )
            } catch {
                if let bleError = error as? BleError {
                    emitError(bleError.toDictionary())
                }
            }
        }
    }

    // MARK: - MTU

    @objc public func getMtu(
        deviceId: String,
        resolve: @escaping @Sendable (Any?) -> Void,
        reject: @escaping @Sendable (String?, String?, Error?) -> Void
    ) {
        Task {
            do {
                guard let actor = actor else {
                    throw BleError(code: .bluetoothManagerDestroyed, message: "BLE manager not initialized")
                }
                let mtu = try await actor.getMtu(deviceId: deviceId)
                resolve(mtu)
            } catch {
                rejectWithError(reject, error: error)
            }
        }
    }

    @objc public func requestMtu(
        deviceId: String,
        mtu: NSInteger,
        transactionId: String?,
        resolve: @escaping @Sendable (Any?) -> Void,
        reject: @escaping @Sendable (String?, String?, Error?) -> Void
    ) {
        Task {
            do {
                guard let actor = actor else {
                    throw BleError(code: .bluetoothManagerDestroyed, message: "BLE manager not initialized")
                }
                let snapshot = try await actor.requestMtu(deviceId: deviceId, mtu: mtu)
                resolve(snapshot.toDictionary())
            } catch {
                rejectWithError(reject, error: error)
            }
        }
    }

    // MARK: - PHY (Not supported on iOS)

    @objc public func requestPhy(
        deviceId: String,
        txPhy: NSInteger,
        rxPhy: NSInteger,
        resolve: @escaping @Sendable (Any?) -> Void,
        reject: @escaping @Sendable (String?, String?, Error?) -> Void
    ) {
        // PHY selection is not available on iOS
        Task {
            do {
                guard let actor = actor else {
                    throw BleError(code: .bluetoothManagerDestroyed, message: "BLE manager not initialized")
                }
                let wrapper = try await actor.discoverAllServicesAndCharacteristics(deviceId: deviceId)
                resolve(wrapper.toDictionary())
            } catch {
                reject(String(BleErrorCode.operationStartFailed.rawValue),
                       "PHY selection is not supported on iOS", nil)
            }
        }
    }

    @objc public func readPhy(
        deviceId: String,
        resolve: @escaping @Sendable (Any?) -> Void,
        reject: @escaping @Sendable (String?, String?, Error?) -> Void
    ) {
        reject(String(BleErrorCode.operationStartFailed.rawValue),
               "PHY reading is not supported on iOS", nil)
    }

    // MARK: - Connection Priority (Not applicable on iOS)

    @objc public func requestConnectionPriority(
        deviceId: String,
        priority: NSInteger,
        resolve: @escaping @Sendable (Any?) -> Void,
        reject: @escaping @Sendable (String?, String?, Error?) -> Void
    ) {
        // Connection priority is an Android-only concept
        reject(String(BleErrorCode.operationStartFailed.rawValue),
               "Connection priority is not supported on iOS", nil)
    }

    // MARK: - L2CAP

    @objc public func openL2CAPChannel(
        deviceId: String,
        psm: NSInteger,
        resolve: @escaping @Sendable (Any?) -> Void,
        reject: @escaping @Sendable (String?, String?, Error?) -> Void
    ) {
        Task {
            do {
                guard let actor = actor else {
                    throw BleError(code: .bluetoothManagerDestroyed, message: "BLE manager not initialized")
                }
                let channelId = try await actor.openL2CAPChannel(deviceId: deviceId, psm: UInt16(psm))
                resolve(["channelId": channelId])
            } catch {
                rejectWithError(reject, error: error)
            }
        }
    }

    @objc public func writeL2CAPChannel(
        channelId: NSInteger,
        data: String,
        resolve: @escaping @Sendable (Any?) -> Void,
        reject: @escaping @Sendable (String?, String?, Error?) -> Void
    ) {
        Task {
            do {
                guard let actor = actor else {
                    throw BleError(code: .bluetoothManagerDestroyed, message: "BLE manager not initialized")
                }
                guard let binaryData = Data(base64Encoded: data) else {
                    throw BleError(code: .invalidIdentifiers, message: "Invalid base64 data")
                }
                try await actor.writeL2CAPChannel(channelId: channelId, data: binaryData)
                resolve(nil)
            } catch {
                rejectWithError(reject, error: error)
            }
        }
    }

    @objc public func closeL2CAPChannel(
        channelId: NSInteger,
        resolve: @escaping @Sendable (Any?) -> Void,
        reject: @escaping @Sendable (String?, String?, Error?) -> Void
    ) {
        Task {
            do {
                guard let actor = actor else {
                    throw BleError(code: .bluetoothManagerDestroyed, message: "BLE manager not initialized")
                }
                try await actor.closeL2CAPChannel(channelId: channelId)
                resolve(nil)
            } catch {
                rejectWithError(reject, error: error)
            }
        }
    }

    // MARK: - Bonding (Limited on iOS)

    @objc public func getBondedDevices(
        resolve: @escaping @Sendable (Any?) -> Void,
        reject: @escaping @Sendable (String?, String?, Error?) -> Void
    ) {
        // iOS doesn't expose bonded device list via CoreBluetooth
        resolve([])
    }

    // MARK: - Authorization

    @objc public func getAuthorizationStatus(
        resolve: @escaping @Sendable (Any?) -> Void,
        reject: @escaping @Sendable (String?, String?, Error?) -> Void
    ) {
        if #available(iOS 13.1, *) {
            switch CBManager.authorization {
            case .allowedAlways:
                resolve("authorized")
            case .denied:
                resolve("denied")
            case .restricted:
                resolve("restricted")
            case .notDetermined:
                resolve("notDetermined")
            @unknown default:
                resolve("notDetermined")
            }
        } else {
            // Before iOS 13.1, BLE was always authorized if the app had the permission
            resolve("authorized")
        }
    }

    // MARK: - Cancellation

    @objc public func cancelTransaction(
        transactionId: String,
        resolve: @escaping @Sendable (Any?) -> Void,
        reject: @escaping @Sendable (String?, String?, Error?) -> Void
    ) {
        Task {
            await actor?.cancelTransaction(transactionId)
            resolve(nil)
        }
    }
}

