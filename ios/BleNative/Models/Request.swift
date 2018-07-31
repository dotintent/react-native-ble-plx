import Foundation

enum RequestType {
    case readRssi
    case connect
    case disconnect
    case discoverServices
    case discoverCharacteristics
    case read
    case write
    
    case bufferState
    case bufferScan
    case bufferValueChange
    case bufferDisconnect
    case bufferStateRestore
    case bufferName
    
    var isBufferRequest: Bool {
        switch self {
        case .bufferDisconnect, .bufferScan, .bufferState, .bufferStateRestore, .bufferValueChange, .bufferName:
            return true
        case .connect, .disconnect, .readRssi, .discoverServices, .discoverCharacteristics, .read, .write:
            return false
        }
    }
}

struct Request {
    let type: RequestType
    let relatedIdentifier: Int32
    let promiseId: String?
    let options: [String: Any]?
    let callback: Callback
    
    init(type: RequestType, 
         relatedIdentifier: Int32, 
         callback: @escaping Callback,
         promiseId: String? = nil, 
         options: [String: Any]? = nil) {
        self.type = type
        self.relatedIdentifier = relatedIdentifier
        self.callback = callback
        self.promiseId = promiseId
        self.options = options
    }
}

extension Request: Equatable {
    static func == (lhs: Request, rhs: Request) -> Bool {
        return lhs.type == rhs.type && lhs.relatedIdentifier == rhs.relatedIdentifier && lhs.promiseId == rhs.promiseId
    }
}

extension Request: Hashable {
    var hashValue: Int {
        return "\(type.hashValue) + \(relatedIdentifier) \(promiseId ?? "unknown")".hashValue 
    }
}

extension BufferType {
    var requestType: RequestType {
        switch self {
        case .disconnect: return .bufferDisconnect
        case .scan: return .bufferScan
        case .state: return .bufferState
        case .stateRestore: return .bufferStateRestore
        case .valueChange: return .bufferValueChange
        case .name: return .bufferName
        }
    }
}
