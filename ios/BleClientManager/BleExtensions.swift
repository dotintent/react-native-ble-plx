//
//  BleExtensions.swift
//  BleClientManager
//
//  Created by Przemysław Lenart on 05/08/16.
//  Copyright © 2016 Polidea. All rights reserved.
//

import Foundation
import RxBluetoothKit

extension Characteristic {
    var valueBase64: String? {
        return value?.base64EncodedStringWithOptions(.EncodingEndLineWithCarriageReturn)
    }
}