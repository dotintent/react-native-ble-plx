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
