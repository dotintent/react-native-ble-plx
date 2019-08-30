// The MIT License (MIT)
//
// Copyright (c) 2016 Polidea
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

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
