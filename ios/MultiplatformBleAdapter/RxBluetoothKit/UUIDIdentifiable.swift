import Foundation
import CoreBluetooth

protocol UUIDIdentifiable {
    var uuid: CBUUID { get }
}

extension Characteristic: UUIDIdentifiable {}
extension Service: UUIDIdentifiable {}

/// Filters an item list based on the provided UUID list. The items must conform to UUIDIdentifiable.
/// Only items returned whose UUID matches an item in the provided UUID list.
/// Each UUID should have at least one item matching in the items list. Otherwise the result is nil.

/// - uuids: a UUID list or nil
/// - items: items to be filtered
/// - Returns: the filtered item list
func filterUUIDItems<T: UUIDIdentifiable>(uuids: [CBUUID]?, items: [T]) -> [T]? {
    guard let uuids = uuids, !uuids.isEmpty else { return items }

    let itemsUUIDs = items.map { $0.uuid }
    let uuidsSet = Set(uuids)
    guard uuidsSet.isSubset(of: Set(itemsUUIDs)) else { return nil }
    return items.filter { uuidsSet.contains($0.uuid) }
}