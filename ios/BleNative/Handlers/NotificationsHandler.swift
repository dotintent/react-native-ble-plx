import Foundation

class NotificationsHandler {
    private var enabledCallbacksForId = [Int32: [Callback]]()
    
    func enabledCallbacks(forId id: Int32) -> [Callback]? {
        return enabledCallbacksForId[id]
    }
    
    func removeEnabledCallbacks(forId id: Int32) {
        enabledCallbacksForId.removeValue(forKey: id)    
    } 
    
    func setCallbacks(_ callbacks: [Callback], forId id: Int32) {
        enabledCallbacksForId[id] = callbacks
    }
}
