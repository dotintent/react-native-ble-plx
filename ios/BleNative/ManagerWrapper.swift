import Foundation

@objc
class ManagerWrapper: NSObject {
    private let managerCache = ManagerCache()
    
    @objc
    func createCentralManager(queue: DispatchQueue, options: [String: AnyObject], callback: Callback) {
        let id = managerCache.addCentralManager(queue: queue, options: options)
        callback(createSuccessResult(data: id))
    } 
    
    @objc
    func destroyCentralManager(id: Int32) {
        managerCache.removeCentralManager(forId: id)
    }
    
    @objc
    func cancelPromise(centralManagerId: Int32, promiseId: String) {
        if let centralManager = managerCache.centralManager(forId: centralManagerId) {
            centralManager.cancelPromise(promiseId)
        }
    }
    
    // MARK: - Buffers 
    
    @objc
    public func actionOnBuffer(centralManagerId: Int32,
                               id: Int32,
                               options: [String: AnyObject], 
                               cancelOptions: [String: AnyObject], 
                               callback: @escaping Callback) {
        callOnCentralManager(centralManagerId, callback: callback) { 
            $0.actionOnBuffer(withId: id, options: options, cancelOptions: cancelOptions, callback: callback)
        }
    }
    
    @objc
    public func stopBuffer(centralManagerId: Int32, id: Int32, callback: Callback) {
        callOnCentralManager(centralManagerId, callback: callback) { 
            $0.stopBuffer(withId: id, callback: callback)
        }        
    }
    
    // MARK: - State
    
    @objc
    public func getState(centralManagerId: Int32, callback: Callback) {
        callOnCentralManager(centralManagerId, callback: callback) { 
            $0.getState(callback: callback)
        }
    }
    
    @objc
    public func monitorState(centralManagerId: Int32, options: [String: AnyObject]?, callback: Callback) {
        callOnCentralManager(centralManagerId, callback: callback) { 
            $0.monitorState(options: options, callback: callback)
        }
    }
    
    // MARK: - State restoration
    
    @objc
    public func monitorRestoreState(centralManagerId: Int32, callback: Callback) {
        callOnCentralManager(centralManagerId, callback: callback) { 
            $0.monitorRestoreState(callback: callback)
        }
    }
    
    // MARK: - Scanning
    
    @objc
    public func scanForPeripherals(centralManagerId: Int32, filteredUUIDs: [String]?, options: [String: AnyObject]?, callback: Callback) {        
        callOnCentralManager(centralManagerId, callback: callback) { 
            $0.scanForPeripherals(filteredUUIDs, options: options, callback: callback)
        }
    }
    
    // MARK: - Name
    
    @objc
    public func getNameForPeripheral(centralManagerId: Int32, uuidString: String, callback: @escaping Callback) {        
        callOnCentralManager(centralManagerId, callback: callback) { 
            $0.getNameForPeripheral(uuidString, callback: callback)
        }
    }
    
    @objc
    public func monitorPeripheralName(centralManagerId: Int32, uuidString: String, callback: @escaping Callback) {        
        callOnCentralManager(centralManagerId, callback: callback) { 
            $0.monitorPeripheralName(uuidString, callback: callback)
        }
    }
    
    // MARK: - Read RSSI
    
    @objc
    public func readRSSIForPeripheral(centralManagerId: Int32, uuidString: String, cancelOptions: [String: AnyObject], callback: @escaping Callback) {
        callOnCentralManager(centralManagerId, callback: callback) { 
            $0.readRSSIForPeripheral(uuidString, cancelOptions: cancelOptions, callback: callback)
        }
    }
    
    // MARK: - MTU
    
    @objc
    public func requestMTUForPeripheral(centralManagerId: Int32,
                                        uuidString: String,
                                        mtu: Int,
                                        cancelOptions: [String: AnyObject],
                                        callback: @escaping Callback) {
        callOnCentralManager(centralManagerId, callback: callback) { 
            $0.requestMTUForPeripheral(uuidString, mtu: mtu, cancelOptions: cancelOptions, callback: callback)
        }
    }
    
    @objc
    public func getMTUForPeripheral(centralManagerId: Int32, uuidString: String, callback: @escaping Callback) {
        callOnCentralManager(centralManagerId, callback: callback) { 
            $0.getMTUForPeripheral(uuidString, callback: callback)
        }
    }
    
    @objc
    public func monitorMTUForPeripheral(centralManagerId: Int32, uuidString: String, callback: @escaping Callback) {
        callOnCentralManager(centralManagerId, callback: callback) { 
            $0.monitorMTUForPeripheral(uuidString, callback: callback)
        }
    }
    
    // MARK: - Device managment
    
    @objc
    public func getPeripherals(centralManagerId: Int32, deviceIdentifiers: [String], callback: Callback) {
        callOnCentralManager(centralManagerId, callback: callback) { 
            $0.getPeripherals(deviceIdentifiers, callback: callback)
        }
    }
    
    @objc
    public func getConnectedPeripherals(centralManagerId: Int32, serviceUUIDs: [String], callback: Callback) {
        callOnCentralManager(centralManagerId, callback: callback) { 
            $0.getConnectedPeripherals(serviceUUIDs, callback: callback)
        }
    }
    
    // MARK: - Connection managment
    
    @objc
    public func connectToPeripheral(centralManagerId: Int32, uuidString: String, options: [String: AnyObject], callback: @escaping Callback) {
        callOnCentralManager(centralManagerId, callback: callback) { 
            $0.connectToPeripheral(uuidString, options: options, callback: callback)
        }
    }
    
    @objc
    public func cancelPeripheralConnection(centralManagerId: Int32, uuidString: String, cancelOptions: [String: AnyObject], callback: @escaping Callback) {
        callOnCentralManager(centralManagerId, callback: callback) { 
            $0.cancelPeripheralConnection(uuidString, cancelOptions: cancelOptions, callback: callback)
        }
    }
    
    @objc
    public func isPeripheralConnected(centralManagerId: Int32, uuidString: String, callback: Callback) {
        callOnCentralManager(centralManagerId, callback: callback) { 
            $0.isPeripheralConnected(uuidString, callback: callback)
        }
    }
    
    @objc
    public func monitorDisconnection(centralManagerId: Int32, callback: Callback) {
        callOnCentralManager(centralManagerId, callback: callback) { 
            $0.monitorDisconnection(callback: callback)
        }
    }
    
    // MARK: - Discovery
    
    @objc
    public func discoverAllServicesAndCharacteristicsForPeripheral(centralManagerId: Int32,
                                                                   uuidString: String,
                                                                   callback: @escaping Callback) {
        callOnCentralManager(centralManagerId, callback: callback) { 
            $0.discoverAllServicesAndCharacteristicsForPeripheral(uuidString, callback: callback)
        }
    }
    
    // MARK: - Service and characteristic getters
    
    @objc
    public func getServiceForPeripheral(centralManagerId: Int32, uuidString: String, serviceUUIDString: String, callback: Callback) {
        callOnCentralManager(centralManagerId, callback: callback) { 
            $0.getServiceForPeripheral(uuidString, serviceUUIDString: serviceUUIDString, callback: callback)
        }
    }
    
    @objc
    public func getServicesForPeripheral(centralManagerId: Int32, uuidString: String, callback: Callback) {
        callOnCentralManager(centralManagerId, callback: callback) { 
            $0.getServicesForPeripheral(uuidString, callback: callback)
        }
    }
    
    @objc
    public func getCharacteristicForServiceByUUID(
        centralManagerId: Int32, 
        uuidString: String, 
        serviceUUIDString: String, 
        characteristicUUIDString: String, 
        callback: Callback) {
        callOnCentralManager(centralManagerId, callback: callback) { 
            $0.getCharacteristicForService(uuidString, 
                                           serviceUUIDString: serviceUUIDString, 
                                           characteristicUUIDString: characteristicUUIDString,
                                           callback: callback)
        }
    }
    
    @objc
    public func getCharacteristicForService(
        centralManagerId: Int32, 
        serviceId: Int32, 
        characteristicUUIDString: String, 
        callback: Callback) {
        callOnCentralManager(centralManagerId, callback: callback) { 
            $0.getCharacteristicForService(serviceId,  
                                           characteristicUUIDString: characteristicUUIDString,
                                           callback: callback)
        }
    }
    
    @objc
    public func getCharacteristicsForService(centralManagerId: Int32, serviceId: Int32, callback: Callback) {
        callOnCentralManager(centralManagerId, callback: callback) { 
            $0.getCharacteristicsForService(serviceId, callback: callback)
        }
    }
    
    // MARK: - Reading
    
    @objc
    public func readBase64CharacteristicValue(centralManagerId: Int32,
                                              characteristicId: Int32,
                                              cancelOptions: [String: AnyObject],
                                              callback: @escaping Callback) {
        callOnCentralManager(centralManagerId, callback: callback) { 
            $0.readBase64CharacteristicValue(characteristicId, cancelOptions: cancelOptions, callback: callback)
        }
    }
    
    // MARK: - Writing
    
    @objc
    public func writeBase64CharacteristicValue(centralManagerId: Int32,
                                               characteristicId: Int32,
                                               valueBase64: String,
                                               response: Bool,
                                               cancelOptions: [String: AnyObject],
                                               callback: @escaping Callback) {
        callOnCentralManager(centralManagerId, callback: callback) { 
            $0.writeBase64CharacteristicValue(
                characteristicId,
                valueBase64: valueBase64,
                response: response,
                cancelOptions: cancelOptions,
                callback: callback
            )
        }
    }
    
    // MARK: - Monitoring
    
    @objc
    public func monitorBase64CharacteristicValue(centralManagerId: Int32, characteristicId: Int32, callback: @escaping Callback) {
        callOnCentralManager(centralManagerId, callback: callback) { 
            $0.monitorBase64CharacteristicValue(characteristicId, callback: callback)
        }
    }
    
    @objc
    public func isCharacteristicNotifying(centralManagerId: Int32, characteristicId: Int32, callback: @escaping Callback) {
        callOnCentralManager(centralManagerId, callback: callback) { 
            $0.isCharacteristicNotifying(characteristicId, callback: callback)
        }
    }
    
    // MARK: - Logging
    
    @objc
    public func setLogLevel(_ logLevelString: String) {
        Logger.d("ManagerWrapper setLogLevel(logLevelString: \(logLevelString))")
        Logger.changeLevel(levelString: logLevelString)
    }
    
    @objc
    public func getLogLevel(_ callback: Callback) {
        Logger.d("ManagerWrapper getLogLevel()")
        callback(createSuccessResult(data: Logger.logLevel.description))
    }
    
    
    private func callOnCentralManager(_ centralManagerId: Int32, callback: Callback, call: (CentralManager) -> ()) {
        guard let centralManager = managerCache.centralManager(forId: centralManagerId) else {
            callback(BleError.managerNotFound().asErrorResult())
            return
        }
        call(centralManager)
    }
}
