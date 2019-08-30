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

/// Convenience class which helps reading advertisement data
public struct AdvertisementData {
    /// Advertisement data dictionary that contains all information advertised by peripheral.
    public let advertisementData: [String: Any]

    /// Creates advertisement data based on CoreBluetooth's dictionary
    /// - parameter advertisementData: Core Bluetooth's advertisement data
    public init(advertisementData: [String: Any]) {
        self.advertisementData = advertisementData
    }

    /// A string containing the local name of a peripheral.
    public var localName: String? {
        return advertisementData[CBAdvertisementDataLocalNameKey] as? String
    }

    /// A Data object containing the manufacturer data of a peripheral.
    public var manufacturerData: Data? {
        return advertisementData[CBAdvertisementDataManufacturerDataKey] as? Data
    }

    /// A dictionary containing service-specific advertisement data.
    /// The keys are CBUUID objects, representing CBService UUIDs. The values are Data objects,
    /// representing service-specific data.
    public var serviceData: [CBUUID: Data]? {
        return advertisementData[CBAdvertisementDataServiceDataKey] as? [CBUUID: Data]
    }

    /// An array of service UUIDs.
    public var serviceUUIDs: [CBUUID]? {
        return advertisementData[CBAdvertisementDataServiceUUIDsKey] as? [CBUUID]
    }

    /// An array of one or more CBUUID objects, representing CBService UUIDs that were found in the “overflow”
    /// area of the advertisement data.
    public var overflowServiceUUIDs: [CBUUID]? {
        return advertisementData[CBAdvertisementDataOverflowServiceUUIDsKey] as? [CBUUID]
    }

    /// A number (an instance of NSNumber) containing the transmit power of a peripheral.
    /// This key and value are available if the broadcaster (peripheral)
    /// provides its Tx power level in its advertising packet.
    /// Using the RSSI value and the Tx power level, it is possible to calculate path loss.
    public var txPowerLevel: NSNumber? {
        return advertisementData[CBAdvertisementDataTxPowerLevelKey] as? NSNumber
    }

    /// A Boolean value that indicates whether the advertising event type is connectable.
    /// The value for this key is an NSNumber object. You can use this value to determine whether
    /// a peripheral is connectable at a particular moment.
    public var isConnectable: Bool? {
        return advertisementData[CBAdvertisementDataIsConnectable] as? Bool
    }

    /// An array of one or more CBUUID objects, representing CBService UUIDs.
    public var solicitedServiceUUIDs: [CBUUID]? {
        return advertisementData[CBAdvertisementDataSolicitedServiceUUIDsKey] as? [CBUUID]
    }
}
