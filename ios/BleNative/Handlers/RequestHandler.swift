import Foundation

struct RequestTimeout {
    let timeout: Int
    let onTimeout: (Request) -> Void 
}

class RequestHandler {
    private(set) var requests: [Request] = []
    private var timeoutsToRequest: [Request: DispatchWorkItem] = [:]
    
    func addRequest(_ request: Request, timeout: RequestTimeout?) {
        requests.append(request)
        if let timeout = timeout {
            addTimeout(timeout.timeout, forRequest: request, onTimeout: timeout.onTimeout)
        }
    }
    
    private func removeRequest(atIndex index: Int) -> Request? {
        let request = requests.remove(at: index)
        if let task = timeoutsToRequest.removeValue(forKey: request) {
            task.cancel()
        }
        return request
    }
    
    @discardableResult
    func removeRequest(promiseId: String) -> Request? {
        guard let index = requests.index(where: { $0.promiseId == promiseId }) else {
            return nil
        }
        return removeRequest(atIndex: index)
    }
    
    @discardableResult
    func removeRequest(relatedIdentifier: Int32, type: RequestType) -> Request? {
        guard let index = requests.index(where: { $0.relatedIdentifier == relatedIdentifier && $0.type == type }) else {
            return nil
        }
        return removeRequest(atIndex: index)
    }
    
    @discardableResult
    func removeRequest(_ request: Request) -> Request? {
        guard let index = requests.index(of: request) else { return nil }
        return removeRequest(atIndex: index)
    }
    
    func findRequest(relatedIdentifier: Int32, type: RequestType) -> Request? {
        return requests.first(where: { $0.relatedIdentifier == relatedIdentifier && $0.type == type })
    }
    
    private func addTimeout(_ timeout: Int, forRequest request: Request, onTimeout: @escaping (Request) -> Void) {
        let task = DispatchWorkItem { [weak self] in
            self?.removeRequest(request)
            onTimeout(request)            
        }
        timeoutsToRequest[request] = task
        
        let deadlineTime = DispatchTime.now() + .milliseconds(timeout)
        DispatchQueue.main.asyncAfter(deadline: deadlineTime, execute: task)
    }
}
