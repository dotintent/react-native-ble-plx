import Foundation

enum CentralManagerInitOptionKeys: String {
    case restoreStateId
    case showPowerAlert
}

enum ConnectToPeripheralOptionKeys: String {
    case notifyOnConnection
    case notifyOnDisconnection
    case notifyOnNotification
}

enum CancelOptionKeys: String {
    case promiseId
    case timeout
    case ignoreCancelled
} 

enum MonitorStateOptions: String {
    case emitCurrentState
}

enum BufferActionKeys: String {
    case strategy
    case placement
    case chunkSize
}

enum BufferActionStrategy: String {
    case take
    case peek
}

enum BufferActionPlacement: String {
    case latest
    case oldest
}

enum RestoredStateKeys: String {
    case connectedPeripherals
    case scanOptions
    case scanServices
}
