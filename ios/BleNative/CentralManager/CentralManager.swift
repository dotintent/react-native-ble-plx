import Foundation
import CoreBluetooth

public typealias Result = [Int: Any]
public typealias Callback = (Result) -> Void


public class CentralManager: NSObject {
    let manager: CBCentralManager
    
    let id: Int32
    
    let bufferHandler = BufferHandler()
    
    let cacheHandler = CacheHandler()
    
    let requestHandler = RequestHandler()
    
    let notificationsHandler = NotificationsHandler()
    
    let delegateHandler: CBCentralManagerDelegateHandler
    
    let queue: DispatchQueue
    
    let restoreBuffer: Buffer?
    
    init(id: Int32, queue: DispatchQueue, options: [String: AnyObject]) {
        self.id = id
        self.queue = queue
        delegateHandler = CBCentralManagerDelegateHandler(
            centralId: id,
            bufferHandler: bufferHandler, 
            cacheHandler: cacheHandler, 
            requestHandler: requestHandler, 
            notificationsHandler: notificationsHandler
        )
        
        let restoreIdentifierKey = options[CentralManagerInitOptionKeys.restoreStateId.rawValue] as? String
        let showPowerAlertKey = options[CentralManagerInitOptionKeys.showPowerAlert.rawValue] as? Bool
        var managerOptions: [String: AnyObject] = [:]
        if let restoreIdentifierKey = restoreIdentifierKey {
            managerOptions[CBCentralManagerOptionRestoreIdentifierKey] = restoreIdentifierKey as AnyObject 
        }
        if let showPowerAlertKey = showPowerAlertKey {
            managerOptions[CBCentralManagerOptionShowPowerAlertKey] = showPowerAlertKey as AnyObject
        } 
        manager = CBCentralManager(delegate: delegateHandler, queue: queue, options: managerOptions)
        
        if restoreIdentifierKey != nil {
            restoreBuffer = bufferHandler.addBuffer(type: .stateRestore)
        } else {
            restoreBuffer = nil
        }
    }
    
    // MARK: - Transactions
    
    func cancelPromise(_ promiseId: String) {
        if let request = requestHandler.removeRequest(promiseId: promiseId) {
            request.callback(BleError.cancelled().asErrorResult())
        }
    }
    
    // MARK: - Buffers 
    
    func actionOnBuffer(withId id: Int32, 
                        options: [String: AnyObject], 
                        cancelOptions: [String: AnyObject], 
                        callback: @escaping Callback) {
        guard let buffer = bufferHandler.buffer(forId: id) else {
            callback(BleError.bufferNotExist(id).asErrorResult())
            return
        }
        if let reason = buffer.invalidatedReason {
            callback(reason.asErrorResult())
            return
        }
        if let items = bufferHandler.actionOnBuffer(buffer, options: options) {
            callback(createSuccessResult(data: items))
        } else {
            let request = Request(
                type: buffer.type.requestType, 
                relatedIdentifier: buffer.id, 
                callback: callback,
                promiseId: cancelOptions[CancelOptionKeys.promiseId.rawValue] as? String,
                options: options
            )
            requestHandler.addRequest(request, timeout: timeout(fromCancelOptions: cancelOptions))
        }
    }
    
    func stopBuffer(withId id: Int32, callback: Callback) {
        guard let buffer = bufferHandler.buffer(forId: id) else {
            callback(BleError.bufferNotExist(id).asErrorResult())
            return
        }
        bufferHandler.removeBuffer(buffer)
        handleOnBufferRemoved(buffer)
        
        callback(createSuccessResult(data: true))
    }
    
    // MARK: - State
    
    func getState(callback: Callback) {
        let state = BleState(rawValue: manager.state.rawValue) ?? .unsupported
        callback(state.asSuccessResult())
    }
    
    func monitorState(options: [String: AnyObject]?, callback: Callback) {
        let buffer = bufferHandler.addBuffer(type: .state)
        if options?.emitCurrentState ?? false {
            let state = BleState(rawValue: manager.state.rawValue) ?? .unsupported
            buffer.append(state.asDataObject)
        }
        callback(buffer.asSuccessResult(centralId: id))
    }
    
    // MARK: - State restoration
    
    func monitorRestoreState(callback: Callback) {
        guard let buffer = restoreBuffer else {
            callback(BleError.restoreBufferNotExist().asErrorResult())
            return
        }
        callback(buffer.asSuccessResult(centralId: id))
    }
    
    // MARK: - Scanning
    
    func scanForPeripherals(_ filteredUUIDs: [String]?, options: [String: AnyObject]?, callback: Callback) {
        guard ensureState(callback: callback) else { return }
        
        guard !bufferHandler.hasBuffer(withType: .scan) else {
            callback(BleError.scanStartFailed("Cannot start new scan when there is different scan ongoing").asErrorResult())
            return
        }
        
        var cbUuids: [CBUUID]? = nil
        if let filteredUUIDs = filteredUUIDs {
            guard let uuids = filteredUUIDs.toCBUUIDS() else {
                callback(BleError.invalidIdentifiers(filteredUUIDs).asErrorResult())
                return
            }
            cbUuids = uuids
        }
        var cbOptions: [String: Any] = [:]
        if let options = options {
            let allowDuplicates = (options["allowDuplicates"]?.isEqual(to: NSNumber(value: true as Bool))) ?? false
            if allowDuplicates {
                cbOptions[CBCentralManagerScanOptionAllowDuplicatesKey] = true
            }
        }
        
        let buffer = bufferHandler.addBuffer(type: .scan)
        
        manager.scanForPeripherals(withServices: cbUuids, options: cbOptions)
        
        callback(buffer.asSuccessResult(centralId: id))
    }
    
    func stopScanningBuffer() {
        manager.stopScan()
    } 
    
    // MARK: - Read Name
    
    func getNameForPeripheral(_ uuidString: String, callback: @escaping Callback) {
        guard ensureState(callback: callback) else { return }
        
        guard let peripheral = retrieveConnectedPeripheral(withUuidString: uuidString, callback: callback) else {
            return
        }
        
        callback(createSuccessResult(data: peripheral.name ?? NSNull()))
    }
    
    func monitorPeripheralName(_ uuidString: String, callback: @escaping Callback) {
        guard ensureState(callback: callback) else { return }
        
        guard let peripheral = retrieveConnectedPeripheral(withUuidString: uuidString, callback: callback) else {
            return
        }
        
        let peripheralId = ObjectIdGenerators.peripherals.id(for: peripheral)
        let buffer = bufferHandler.addBuffer(type: .name, relatedIdentifier: peripheralId)
        callback(buffer.asSuccessResult(centralId: id))
    }
    
    // MARK: - Read RSSI
    
    func readRSSIForPeripheral(_ uuidString: String, cancelOptions: [String: AnyObject], callback: @escaping Callback) {
        guard ensureState(callback: callback) else { return }
        guard let peripheral = retrieveConnectedPeripheral(withUuidString: uuidString, callback: callback, promiseId: cancelOptions.promiseId) else {
            return
        }
        
        let peripheralId = ObjectIdGenerators.peripherals.id(for: peripheral)
        let request = Request(type: .readRssi, relatedIdentifier: peripheralId, callback: callback, promiseId: cancelOptions.promiseId)
        requestHandler.addRequest(request, timeout: timeout(fromCancelOptions: cancelOptions))
        
        peripheral.readRSSI()
    }
    
    // MARK: - MTU
    
    func requestMTUForPeripheral(_ uuidString: String,
                                 mtu: Int,
                                 cancelOptions: [String: AnyObject],
                                 callback: @escaping Callback) {
        callback(BleError.methodNotSupported(reason: "Cannot request MTU on iOS").asErrorResult())
    }
    
    func getMTUForPeripheral(_ uuidString: String, callback: @escaping Callback) {
        guard ensureState(callback: callback) else { return }
        
        guard let peripheral = retrievePeripheral(withUuidString: uuidString, callback: callback) else {
            return
        }
        
        callback(createSuccessResult(data: peripheral.mtu))
    }
    
    func monitorMTUForPeripheral(_ uuidString: String, callback: @escaping Callback) {
        callback(BleError.methodNotSupported(reason: "Cannot monitor MTU changes on iOS").asErrorResult())
    }
    
    // MARK: - Device managment
    
    func getPeripherals(_ deviceIdentifiers: [String], callback: Callback) {
        let uuids = deviceIdentifiers.compactMap { UUID(uuidString: $0) }
        guard uuids.count == deviceIdentifiers.count else {
            callback(BleError.invalidIdentifiers(deviceIdentifiers).asErrorResult())
            return
        }
        
        let results = manager.retrievePeripherals(withIdentifiers: uuids).map { 
            $0.asDataObject(centralId: id)
        }
        callback(createSuccessResult(data: results))
    }
    
    func getConnectedPeripherals(_ serviceUUIDs: [String], callback: Callback) {
        let uuids = serviceUUIDs.compactMap { $0.toCBUUID() }
        guard uuids.count == serviceUUIDs.count else {
            callback(BleError.invalidIdentifiers(serviceUUIDs).asErrorResult())
            return
        }
        
        let results = manager.retrieveConnectedPeripherals(withServices: uuids).map { 
            $0.asDataObject(centralId: id)
        }
        callback(createSuccessResult(data: results))
    }
    
    // MARK: - Connection managment
    
    func connectToPeripheral(_ uuidString: String, options: [String: AnyObject], callback: @escaping Callback) {
        guard ensureState(callback: callback) else { return }
        
        guard let peripheral = retrievePeripheral(withUuidString: uuidString, callback: callback) else {
            return
        }
        
        let peripheralId = ObjectIdGenerators.peripherals.id(for: peripheral)
        let request = Request(type: .connect, relatedIdentifier: peripheralId, callback: callback, promiseId: options.promiseId)
        requestHandler.addRequest(request, timeout: timeout(fromCancelOptions: options))
        
        let notifyOnConnection = options[ConnectToPeripheralOptionKeys.notifyOnConnection.rawValue] as? Bool
        let notifyOnDisconnection = options[ConnectToPeripheralOptionKeys.notifyOnDisconnection.rawValue] as? Bool
        let notifyOnNotification = options[ConnectToPeripheralOptionKeys.notifyOnNotification.rawValue] as? Bool
        let connectOptions = [
            CBConnectPeripheralOptionNotifyOnConnectionKey: NSNumber(booleanLiteral: notifyOnConnection ?? false) as AnyObject,
            CBConnectPeripheralOptionNotifyOnDisconnectionKey: NSNumber(booleanLiteral: notifyOnDisconnection ?? false) as AnyObject,
            CBConnectPeripheralOptionNotifyOnNotificationKey: NSNumber(booleanLiteral: notifyOnNotification ?? false) as AnyObject
        ]
        manager.connect(peripheral, options: connectOptions)
    }
    
    func cancelPeripheralConnection(_ uuidString: String, cancelOptions: [String: AnyObject], callback: @escaping Callback) {
        guard let peripheral = retrievePeripheral(withUuidString: uuidString, callback: callback) else {
            return
        }
        
        if [CBPeripheralState.connected, CBPeripheralState.connecting].contains(peripheral.state) {
            let peripheralId = ObjectIdGenerators.peripherals.id(for: peripheral)
            let request = Request(type: .disconnect, relatedIdentifier: peripheralId, callback: callback, promiseId: cancelOptions.promiseId)
            requestHandler.addRequest(request, timeout: timeout(fromCancelOptions: cancelOptions))
            
            manager.cancelPeripheralConnection(peripheral)
        } else {
            callback(BleError.cancelled().asErrorResult())
        }
    }
    
    func isPeripheralConnected(_ uuidString: String, callback: Callback) {
        guard let peripheral = retrievePeripheral(withUuidString: uuidString, callback: callback) else {
            return
        }
        
        callback(createSuccessResult(data: peripheral.state == .connected))
    }
    
    func monitorDisconnection(callback: Callback) {
        let buffer = bufferHandler.addBuffer(type: .disconnect)
        callback(buffer.asSuccessResult(centralId: id))
    }
    
    // MARK: - Discovery
    
    func discoverAllServicesAndCharacteristicsForPeripheral(_ uuidString: String,
                                                            callback: @escaping Callback) {
        guard ensureState(callback: callback) else { return }
        guard let peripheral = retrieveConnectedPeripheral(withUuidString: uuidString, callback: callback) else {
            return
        }
        
        let requestCallback = { [weak self] (data: Result) in
            guard let strongSelf = self else { return }
            guard data[ResultKey.data.rawValue] != nil, 
                let services = peripheral.services,
                services.count > 0 else {
                    callback(data)
                    return
            }
            
            var receivedResponsesCount = 0
            let requiredResponsesCount = services.count
            for service in services {
                let serviceId = ObjectIdGenerators.services.id(for: service)
                strongSelf.cacheHandler.addService(service)
                let characteristicCallback = { [weak self] (characteristicData: Any) in
                    guard let strongSelf = self else { return }
                    guard let dict = characteristicData as? [Int: Any], dict[ResultKey.data.rawValue] != nil else {
                        callback(data)
                        return
                    } 
                    service.characteristics?.forEach { strongSelf.cacheHandler.addCharacteristic($0) }
                    receivedResponsesCount += 1
                    if receivedResponsesCount == requiredResponsesCount {
                        callback(createSuccessResult(data: NSNull()))
                    }
                }
                let request = Request(type: .discoverCharacteristics, relatedIdentifier: serviceId, callback: characteristicCallback)
                strongSelf.requestHandler.addRequest(request, timeout: nil)
                peripheral.discoverCharacteristics(nil, for: service) 
            }
        }
        let peripheralId = ObjectIdGenerators.peripherals.id(for: peripheral)
        let request = Request(type: .discoverServices, relatedIdentifier: peripheralId, callback: requestCallback)
        requestHandler.addRequest(request, timeout: nil) // TODO: - we will need to think about possibility to cancel this action
        
        peripheral.discoverServices(nil)
    }
    
    // MARK: - Service and characteristic getters
    
    func getServiceForPeripheral(_ uuidString: String, serviceUUIDString: String, callback: Callback) {
        guard let serviceCBUUID = serviceUUIDString.toCBUUID() else {
            callback(BleError.invalidIdentifier(serviceUUIDString).asErrorResult())
            return
        }
        
        guard let peripheral = retrieveConnectedPeripheral(withUuidString: uuidString, callback: callback) else {
            return
        }
        
        guard let service = peripheral.services?.first(where: { $0.uuid == serviceCBUUID }) else {
            callback(BleError.serviceNotFound(serviceUUIDString).asErrorResult())
            return 
        }
        
        callback(createSuccessResult(data: service.asDataObject(centralId: id)))
    }
    
    func getServicesForPeripheral(_ uuidString: String, callback: Callback) {
        guard let peripheral = retrieveConnectedPeripheral(withUuidString: uuidString, callback: callback) else {
            return
        }
        
        let services = peripheral.services?.map { $0.asDataObject(centralId: id) } ?? []
        callback(createSuccessResult(data: services))
    }
    
    func getCharacteristicForService(_ uuidString: String, serviceUUIDString: String, characteristicUUIDString: String, callback: Callback) {
        guard let serviceCBUUID = serviceUUIDString.toCBUUID() else {
            callback(BleError.invalidIdentifier(serviceUUIDString).asErrorResult())
            return
        }
        
        guard let characteristicCBUUID = characteristicUUIDString.toCBUUID() else {
            callback(BleError.invalidIdentifier(characteristicUUIDString).asErrorResult())
            return
        }
        
        guard let peripheral = retrieveConnectedPeripheral(withUuidString: uuidString, callback: callback) else {
            return 
        }
        
        guard let service = (peripheral.services?.first { serviceCBUUID == $0.uuid }) else {
            callback(BleError.serviceNotFound(serviceUUIDString).asErrorResult())
            return
        }
        
        guard let characteristic = service.characteristics?.first(where: { $0.uuid == characteristicCBUUID }) else {
            callback(BleError.characteristicNotFound(characteristicUUIDString).asErrorResult())
            return
        }
        
        callback(characteristic.asSuccessResult(centralId: id))
    }
    
    func getCharacteristicForService(_ serviceId: Int32, characteristicUUIDString: String, callback: Callback) {
        guard let characteristicCBUUID = characteristicUUIDString.toCBUUID() else {
            callback(BleError.invalidIdentifier(characteristicUUIDString).asErrorResult())
            return
        }
        
        guard let service = cacheHandler.service(forId: serviceId) else {
            callback(BleError.serviceNotFound(serviceId.description).asErrorResult())
            return
        }
        
        guard let characteristic = service.characteristics?.first(where: { $0.uuid == characteristicCBUUID }) else {
            callback(BleError.characteristicNotFound(characteristicUUIDString).asErrorResult())
            return
        }
        
        callback(characteristic.asSuccessResult(centralId: id))
    }
    
    func getCharacteristicsForService(_ serviceId: Int32, callback: Callback) {
        guard let service = cacheHandler.service(forId: serviceId) else {
            callback(BleError.serviceNotFound(serviceId.description).asErrorResult())
            return
        }
        
        let characteristics = service.characteristics?.map { $0.asDataObject(centralId: id) } ?? []
        callback(createSuccessResult(data: characteristics))
    }
    
    // MARK: - Reading
    
    func readBase64CharacteristicValue(_ characteristicId: Int32,
                                       cancelOptions: [String: AnyObject],
                                       callback: @escaping Callback) {
        guard let characteristic = retrieveCharacteristic(withId: characteristicId, callback: callback, promiseId: cancelOptions.promiseId) else {
            return
        }
        safeReadCharacteristic(characteristic, cancelOptions: cancelOptions, callback: callback)
    }
    
    private func safeReadCharacteristic(_ characteristic: CBCharacteristic,
                                        cancelOptions: [String: AnyObject],
                                        callback: @escaping Callback) {
        guard ensureState(callback: callback) else { return }
        
        let characteristicId = ObjectIdGenerators.characteristics.id(for: characteristic)
        let request = Request(type: .read, relatedIdentifier: characteristicId, callback: callback, promiseId: cancelOptions.promiseId)
        requestHandler.addRequest(request, timeout: timeout(fromCancelOptions: cancelOptions))
        
        characteristic.service.peripheral.readValue(for: characteristic)
    }
    
    // MARK: - Writing
    
    func writeBase64CharacteristicValue(_ characteristicId: Int32,
                                        valueBase64: String,
                                        response: Bool,
                                        cancelOptions: [String: AnyObject],
                                        callback: @escaping Callback) {
        guard let value = valueBase64.fromBase64 else {
            callback(BleError.invalidWriteDataForCharacteristic(characteristicId.description, data: valueBase64).asErrorResult())
            return
        }
        guard let characteristic = retrieveCharacteristic(withId: characteristicId, callback: callback, promiseId: cancelOptions.promiseId) else {
            return
        }
        safeWriteCharacteristic(
            characteristic,
            value: value,
            response: response,
            cancelOptions: cancelOptions,
            callback: callback
        )
    }
    
    private func safeWriteCharacteristic(_ characteristic: CBCharacteristic,
                                         value: Data,
                                         response: Bool,
                                         cancelOptions: [String: AnyObject],
                                         callback: @escaping Callback) {
        guard ensureState(callback: callback) else { return }
        
        let characteristicId = ObjectIdGenerators.characteristics.id(for: characteristic)
        if response {
            let request = Request(type: .write, relatedIdentifier: characteristicId, callback: callback, promiseId: cancelOptions.promiseId)
            requestHandler.addRequest(request, timeout: timeout(fromCancelOptions: cancelOptions))
        }
        characteristic.service.peripheral.writeValue(value, for: characteristic, type: response ? .withResponse : .withoutResponse)
        if !response {
            callback(createSuccessResult(data: NSNull()))
        }
    }
    
    // MARK: - Monitoring
    
    func monitorBase64CharacteristicValue(_ characteristicId: Int32, callback: @escaping Callback) {
        guard let characteristic = retrieveCharacteristic(withId: characteristicId, callback: callback) else {
            return
        }
        safeMonitorCharacteristic(characteristic, callback: callback)
    }
    
    private func safeMonitorCharacteristic(_ characteristic: CBCharacteristic, callback: @escaping Callback) {
        guard ensureState(callback: callback) else { return }
        
        let characteristicId = ObjectIdGenerators.characteristics.id(for: characteristic)
        
        if !characteristic.isNotifying {
            var callbacks = notificationsHandler.enabledCallbacks(forId: characteristicId) ?? []
            callbacks.append { [weak self] data in
                guard let strongSelf = self else { return }
                guard data[ResultKey.data.rawValue] != nil else {
                    callback(data)
                    return
                }
                let buffer = strongSelf.bufferHandler.addBuffer(type: .valueChange, relatedIdentifier: characteristicId)
                callback(buffer.asSuccessResult(centralId: strongSelf.id))
            }
            notificationsHandler.setCallbacks(callbacks, forId: characteristicId)
            if callbacks.count == 1 {
                characteristic.service.peripheral.setNotifyValue(true, for: characteristic)
            }
        } else {
            let buffer = bufferHandler.addBuffer(type: .valueChange, relatedIdentifier: characteristicId)
            callback(buffer.asSuccessResult(centralId: id))
        }
    }
    
    func isCharacteristicNotifying(_ characteristicId: Int32, callback: @escaping Callback) {
        guard let characteristic = retrieveCharacteristic(withId: characteristicId, callback: callback) else {
            return
        }
        callback(createSuccessResult(data: characteristic.isNotifying))
    }
    
    func stopMonitoringBuffer(_ buffer: Buffer) {
        guard let characteristicId = buffer.relatedIdentifier, 
            let characteristic = cacheHandler.characteristic(forId: characteristicId) else { return }
        if !bufferHandler.hasBuffer(withType: buffer.type, relatedIdentifier: characteristicId) {
            characteristic.service.peripheral.setNotifyValue(false, for: characteristic)
        }
    }
}
