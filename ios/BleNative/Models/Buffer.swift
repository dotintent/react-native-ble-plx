import Foundation

enum BufferType {
    case state
    case scan
    case valueChange
    case disconnect
    case stateRestore
    case name
} 

class Buffer {
    private(set) var items: [Any] = []
    let id: Int32
    let type: BufferType
    let relatedIdentifier: Int32?
    private(set) var invalidated: Bool = false
    private(set) var invalidatedReason: BleError? = nil
    
    init(id: Int32, type: BufferType, relatedIdentifier: Int32? = nil) {
        self.id = id
        self.type = type
        self.relatedIdentifier = relatedIdentifier
    }
    
    func invalidate(reason: BleError) {
        invalidated = true
        invalidatedReason = reason
    }
    
    func append(_ element: Any) {
        items.append(element)
    }
    
    func take(amount: Int? = nil, reversed: Bool = false, fulfill: Bool = true) -> [Any]? {
        return retrieve(andRemove: true, amount: amount, reversed: reversed, fulfill: fulfill)
    }
    
    func peek(amount: Int? = nil, reversed: Bool = false, fulfill: Bool = true) -> [Any]? {
        return retrieve(andRemove: false, amount: amount, reversed: reversed, fulfill: fulfill)
    }    
    
    private func retrieve(andRemove remove: Bool, amount: Int? = nil, reversed: Bool = false, fulfill: Bool = true) -> [Any]? {
        var amount = amount ?? items.count
        if fulfill && (amount > items.count || amount < 1) {
            return nil
        }
        if !fulfill {
            amount = max(min(items.count, amount), 0) 
        }
        
        let result: [Any]
        if reversed {
            result = Array(items.suffix(amount))
            if remove {
                items.removeLast(amount)
            }
        } else {
            result = Array(items.prefix(upTo: amount))
            if remove {
                items.removeFirst(amount)
            }
        }
        return result
    }
    
    func removeAll() {
        items.removeAll()
    }
}
