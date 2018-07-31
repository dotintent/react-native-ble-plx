import Foundation

class BufferHandler {
    private var bufferToId: [Int32: Buffer] = [:]
    
    private var buffersToType: [BufferType: [Buffer]] = [:]
    
    private var currentBufferId: Int32 = 0
    
    private let deviceScanBufferId = Int32.max
    
    private let restoreStateBufferId = Int32.max - 1
    
    func buffer(forId id: Int32) -> Buffer? {
        return bufferToId[id]
    }
    
    func actionOnBuffer(_ buffer: Buffer, options: [String: Any], fulfillRequest: Bool = true) -> [Any]? {
        let strategy = options.bufferStrategy ?? .take
        let placement = options.bufferPlacement ?? .latest
        let chunkSize = options.bufferChunkSize
        let reversed = placement == .oldest
        
        switch strategy {
        case .take:
            return buffer.take(amount: chunkSize, reversed: reversed, fulfill: fulfillRequest)
        case .peek:
            return buffer.peek(amount: chunkSize, reversed: reversed, fulfill: fulfillRequest)
        }
    }
    
    func removeBuffer(_ buffer: Buffer) {
        bufferToId.removeValue(forKey: buffer.id)
        if var buffers = buffersToType[buffer.type], let index = buffers.index(where: { $0.id == buffer.id }) {
            buffers.remove(at: index)
            if buffers.count == 0 {
                buffersToType.removeValue(forKey: buffer.type)
            } else {
                buffersToType[buffer.type] = buffers
            }
        }  
    }
    
    func addBuffer(type: BufferType, relatedIdentifier: Int32? = nil) -> Buffer {
        let bufferId = nextBufferId(forType: type)
        let buffer = Buffer(id: bufferId, type: type, relatedIdentifier: relatedIdentifier)
        
        bufferToId[bufferId] = buffer
        var buffers: [Buffer] = buffersToType[type] ?? []
        buffers.append(buffer)
        buffersToType[type] = buffers
        return buffer
    }
    
    func appendBufferElement(_ element: Any, forType type: BufferType, relatedIdentifier: Int32? = nil) -> [Buffer] {
        guard let buffers = buffersToType[type]?.filter({ $0.relatedIdentifier == relatedIdentifier && $0.invalidated == false }) else { return [] }
        
        for buffer in buffers {
            buffer.append(element)
        }
        return buffers
    }
    
    func markBuffersInvalidated(reason: BleError, exceptTypes: [BufferType]) -> [Buffer] {
        return markBuffersInvalidated(
            reason: reason,
            bufferFilter: { $0.invalidated == false },
            exceptTypes: exceptTypes
        )
    }
    
    func markBuffersInvalidated(reason: BleError, relatedIdentifier relatedIdentifier: Int32, exceptTypes: [BufferType]) -> [Buffer] {
        return markBuffersInvalidated(
            reason: reason,
            bufferFilter: { $0.relatedIdentifier == relatedIdentifier && $0.invalidated == false },
            exceptTypes: exceptTypes
        )
    }
    
    private func markBuffersInvalidated(reason: BleError, bufferFilter: (Buffer) -> Bool, exceptTypes: [BufferType]) -> [Buffer] {
        let buffers = buffersToType
            .filter { !exceptTypes.contains($0.key) }
            .values
            .reduce([]) { (result: [Buffer], buffers: [Buffer]) -> [Buffer] in
                return result + buffers.filter(bufferFilter)    
        }
        for buffer in buffers {
            buffer.invalidate(reason: reason)
        }
        return buffers
    }
    
    func hasBuffer(withType type: BufferType, relatedIdentifier: Int32? = nil) -> Bool {
        if let buffers = buffersToType[type], buffers.contains(where: { $0.relatedIdentifier == relatedIdentifier }) {
            return true
        }
        return false
    }
    
    private func nextBufferId(forType type: BufferType) -> Int32 {
        switch type {
        case .stateRestore:
            return restoreStateBufferId
        case .scan:
            return deviceScanBufferId
        default:
            currentBufferId += 1
            return currentBufferId
        }
    }
}
