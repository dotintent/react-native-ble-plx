import Foundation
import CoreBluetooth

final class ScanOperation {
    let uuids: [CBUUID]?
    let observable: Observable<ScannedPeripheral>
    init(uuids: [CBUUID]?, observable: Observable<ScannedPeripheral>) {
        self.uuids = uuids
        self.observable = observable
    }
}

extension ScanOperation {
    func shouldAccept(_ newUUIDs: [CBUUID]?) -> Bool {
        guard let uuids = uuids else {
            return true
        }
        guard let newUUIDs = newUUIDs else {
            return false
        }
        return Set(uuids).isSuperset(of: Set(newUUIDs))
    }
}

func == (lhs: ScanOperation, rhs: ScanOperation) -> Bool {
    if lhs.uuids == nil {
        return rhs.uuids == nil
    }
    return rhs.uuids != nil && rhs.uuids! == lhs.uuids!
}
