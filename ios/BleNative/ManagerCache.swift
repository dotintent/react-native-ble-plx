import Foundation

@objc
public class ManagerCache: NSObject {
    private var centralManagerToId: [Int32: CentralManager] = [:]
    
    private var currentCentralManagerId: Int32 = 0
    
    @objc
    public func addCentralManager(queue: DispatchQueue, options: [String: AnyObject]) -> Int32 {
        currentCentralManagerId += 1
        let manager = CentralManager(id: currentCentralManagerId, queue: queue, options: options)
        centralManagerToId[currentCentralManagerId] = manager
        return currentCentralManagerId
    }
    
    @objc
    public func centralManager(forId id: Int32) -> CentralManager? {
        return centralManagerToId[id]
    }
    
    @objc
    public func removeCentralManager(forId id: Int32) {
        centralManagerToId.removeValue(forKey: id)
    }
}
