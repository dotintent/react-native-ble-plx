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

class RxCBCharacteristic: RxCharacteristicType {

    let characteristic: CBCharacteristic

    init(characteristic: CBCharacteristic) {
        self.characteristic = characteristic
    }

    var objectId: UInt {
        return UInt(bitPattern: ObjectIdentifier(characteristic))
    }

    var uuid: CBUUID {
        return characteristic.uuid
    }

    var value: Data? {
        return characteristic.value
    }

    var isNotifying: Bool {
        return characteristic.isNotifying
    }

    var properties: CBCharacteristicProperties {
        return characteristic.properties
    }

    var descriptors: [RxDescriptorType]? {
        return characteristic.descriptors?.map(RxCBDescriptor.init)
    }

    var service: RxServiceType {
        return RxCBService(service: characteristic.service)
    }

    func isEqualTo(characteristic: RxCharacteristicType) -> Bool {
        guard let rhs = characteristic as? RxCBCharacteristic else { return false }
        return self.characteristic === rhs.characteristic
    }
}
