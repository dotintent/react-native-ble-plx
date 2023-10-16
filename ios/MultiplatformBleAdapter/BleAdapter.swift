import Foundation

@objc public protocol BleAdapter {

    // MARK: - Properties

    var delegate: BleClientManagerDelegate? { get set }

    // MARK: - Initializers

    init(queue: DispatchQueue, restoreIdentifierKey: String?)
    func invalidate()

    // MARK: - Functions

    func cancelTransaction(_ transactionId: String)

    func setLogLevel(_ logLevel: String)

    func logLevel(_ resolve: Resolve,
                  reject: Reject)

    func enable(_ transactionId: String,
                resolve: Resolve,
                reject: Reject)

    func disable(_ transactionId: String,
                 resolve: Resolve,
                 reject: Reject)

    func state(_ resolve: Resolve,
               reject: Reject)

    func startDeviceScan(_ filteredUUIDs: [String]?,
                         options:[String:AnyObject]?)

    func stopDeviceScan()

    func readRSSIForDevice(_ deviceIdentifier: String,
                           transactionId: String,
                           resolve: @escaping Resolve,
                           reject: @escaping Reject)

    func requestMTUForDevice(_ deviceIdentifier: String,
                             mtu: Int,
                             transactionId: String,
                             resolve: @escaping Resolve,
                             reject: @escaping Reject)

    func requestConnectionPriorityForDevice(_ deviceIdentifier: String,
                                            connectionPriority: Int,
                                            transactionId: String,
                                            resolve: @escaping Resolve,
                                            reject: @escaping Reject)

    func devices(_ deviceIdentifiers: [String],
                 resolve: @escaping Resolve,
                 reject: @escaping Reject)

    func connectedDevices(_ serviceUUIDs: [String],
                          resolve: @escaping Resolve,
                          reject: @escaping Reject)

    func connectToDevice(_ deviceIdentifier: String,
                         options:[String: AnyObject]?,
                         resolve: @escaping Resolve,
                         reject: @escaping Reject)

    func cancelDeviceConnection(_ deviceIdentifier: String,
                                resolve: @escaping Resolve,
                                reject: @escaping Reject)

    func isDeviceConnected(_ deviceIdentifier: String,
                           resolve: Resolve,
                           reject: Reject)

    func discoverAllServicesAndCharacteristicsForDevice(_ deviceIdentifier: String,
                                                        transactionId: String,
                                                        resolve: @escaping Resolve,
                                                        reject: @escaping Reject)

    func servicesForDevice(_ deviceIdentifier: String,
                           resolve: Resolve,
                           reject: Reject)

    func characteristicsForDevice(_ deviceIdentifier: String,
                                  serviceUUID: String,
                                  resolve: Resolve,
                                  reject: Reject)

    func characteristicsForService(_ serviceIdentifier: Double,
                                   resolve: Resolve,
                                   reject: Reject)
    
    func descriptorsForDevice(_ deviceIdentifier: String,
                              serviceUUID: String,
                              characteristicUUID: String,
                              resolve: Resolve,
                              reject: Reject)
                              
    func descriptorsForService(_ serviceIdentifier: Double,
                               characteristicUUID: String,
                               resolve: Resolve,
                               reject: Reject)
    
    func descriptorsForCharacteristic(_ characteristicIdentifier: Double,
                                      resolve: Resolve,
                                      reject: Reject)
    

    func readCharacteristicForDevice(_ deviceIdentifier: String,
                                     serviceUUID: String,
                                     characteristicUUID: String,
                                     transactionId: String,
                                     resolve: @escaping Resolve,
                                     reject: @escaping Reject)

    func readCharacteristicForService(_ serviceIdentifier: Double,
                                      characteristicUUID: String,
                                      transactionId: String,
                                      resolve: @escaping Resolve,
                                      reject: @escaping Reject)

    func readCharacteristic(_ characteristicIdentifier: Double,
                            transactionId: String,
                            resolve: @escaping Resolve,
                            reject: @escaping Reject)

    func writeCharacteristicForDevice(_ deviceIdentifier: String,
                                      serviceUUID: String,
                                      characteristicUUID: String,
                                      valueBase64: String,
                                      response: Bool,
                                      transactionId: String,
                                      resolve: @escaping Resolve,
                                      reject: @escaping Reject)

    func writeCharacteristicForService(_ serviceIdentifier: Double,
                                       characteristicUUID: String,
                                       valueBase64: String,
                                       response: Bool,
                                       transactionId: String,
                                       resolve: @escaping Resolve,
                                       reject: @escaping Reject)

    func writeCharacteristic(_ characteristicIdentifier: Double,
                             valueBase64: String,
                             response: Bool,
                             transactionId: String,
                             resolve: @escaping Resolve,
                             reject: @escaping Reject)

    func monitorCharacteristicForDevice(_ deviceIdentifier: String,
                                        serviceUUID: String,
                                        characteristicUUID: String,
                                        transactionId: String,
                                        resolve: @escaping Resolve,
                                        reject: @escaping Reject)

    func monitorCharacteristicForService(_ serviceIdentifier: Double,
                                         characteristicUUID: String,
                                         transactionId: String,
                                         resolve: @escaping Resolve,
                                         reject: @escaping Reject)

    func monitorCharacteristic(_ characteristicIdentifier: Double,
                               transactionId: String,
                               resolve: @escaping Resolve,
                               reject: @escaping Reject)
    
    func readDescriptorForDevice(_ deviceIdentifier: String,
                                 serviceUUID: String,
                                 characteristicUUID: String,
                                 descriptorUUID: String,
                                 transactionId: String,
                                 resolve: @escaping Resolve,
                                 reject: @escaping Reject)
    
    func readDescriptorForService(_ serviceId: Double,
                                  characteristicUUID: String,
                                  descriptorUUID: String,
                                  transactionId: String,
                                  resolve: @escaping Resolve,
                                  reject: @escaping Reject)
    
    func readDescriptorForCharacteristic(_ characteristicID: Double,
                                         descriptorUUID: String,
                                         transactionId: String,
                                         resolve: @escaping Resolve,
                                         reject: @escaping Reject)
    
    func readDescriptor(_ descriptorID: Double,
                        transactionId: String,
                        resolve: @escaping Resolve,
                        reject: @escaping Reject)
    
    func writeDescriptorForDevice(_ deviceIdentifier: String,
                                  serviceUUID: String,
                                  characteristicUUID: String,
                                  descriptorUUID: String,
                                  valueBase64: String,
                                  transactionId: String,
                                  resolve: @escaping Resolve,
                                  reject: @escaping Reject)
    
    func writeDescriptorForService(_ serviceID: Double,
                                   characteristicUUID: String,
                                   descriptorUUID: String,
                                   valueBase64: String,
                                   transactionId: String,
                                   resolve: @escaping Resolve,
                                   reject: @escaping Reject)
    
    func writeDescriptorForCharacteristic(_ characteristicID: Double,
                                          descriptorUUID: String,
                                          valueBase64: String,
                                          transactionId: String,
                                          resolve: @escaping Resolve,
                                          reject: @escaping Reject)
    
    func writeDescriptor(_ descriptorID: Double,
                         valueBase64: String,
                         transactionId: String,
                         resolve: @escaping Resolve,
                         reject: @escaping Reject)
}

extension BleClientManager: BleAdapter { }
