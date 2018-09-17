import Foundation
import CoreBluetooth

@objc 
public enum ResultKey: Int {
    case data
    case error
}

func createSuccessResult(data: Any) -> Result {
    return [
        ResultKey.data.rawValue: data,
        ResultKey.error.rawValue: NSNull()
    ]
}

func createErrorResult(error: Any) -> Result {
    return [
        ResultKey.data.rawValue: NSNull(),
        ResultKey.error.rawValue: error
    ]
}

func updateBuffersRequests(_ buffers: [Buffer], requestHandler: RequestHandler, bufferHandler: BufferHandler) {
    for buffer in buffers {
        guard 
            let request = requestHandler.findRequest(relatedIdentifier: buffer.id, type: buffer.type.requestType), 
            let options = request.options else {
                continue
        }
        if let items = bufferHandler.actionOnBuffer(buffer, options: options) {
            request.callback(createSuccessResult(data: items))
            requestHandler.removeRequest(request)
        }
    }
}

func invalidateBufferRequests(_ invalidatedBuffers: [Buffer], withError error: BleError, requestHandler: RequestHandler) {
    for buffer in invalidatedBuffers {
        guard 
            let request = requestHandler.findRequest(relatedIdentifier: buffer.id, type: buffer.type.requestType) else {
                continue
        }
        request.callback(error.asErrorResult())
        requestHandler.removeRequest(request)
    }
}

extension Sequence where Iterator.Element == String {
    func toCBUUIDS() -> [CBUUID]? {
        var newUUIDS: [CBUUID] = []
        for uuid in self {
            guard let nsuuid = uuid.toCBUUID() else {
                return nil
            }
            newUUIDS.append(nsuuid)
        }
        return newUUIDS
    }
}

extension String {
    func toCBUUID() -> CBUUID? {
        let uuid: String
        switch self.count {
        case 4:
            uuid = "0000\(self)-0000-1000-8000-00805f9b34fb"
        case 8:
            uuid = "\(self)-0000-1000-8000-00805f9b34fb"
        default:
            uuid = self
        }
        guard let nsuuid = UUID(uuidString: uuid) else {
            return nil
        }
        return CBUUID(nsuuid: nsuuid)
    }
    
    var fromBase64: Data? {
        return Data(base64Encoded: self, options: .ignoreUnknownCharacters)
    }
}

extension CBUUID {
    var fullUUIDString: String {
        let native = self.uuidString.lowercased()
        if native.count == 4 {
            return "0000\(native)-0000-1000-8000-00805f9b34fb"
        }
        if native.count == 8 {
            return "\(native)-0000-1000-8000-00805f9b34fb"
        }
        return native
    }
}

extension Data {
    var base64: String {
        // We are using Base64 encoding without line endings.
        return self.base64EncodedString()
    }
}
