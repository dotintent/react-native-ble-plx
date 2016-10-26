//
//  CharacteristicKey.swift
//  BleClientManager
//
//  Created by Przemysław Lenart on 25/10/16.
//  Copyright © 2016 Polidea. All rights reserved.
//

import CoreBluetooth

struct CharacteristicKey: Hashable {
    let deviceId: NSUUID
    let serviceId: CBUUID
    let characteristicId: CBUUID

    var hashValue: Int {
        return deviceId.hashValue ^
               serviceId.hashValue ^
               characteristicId.hashValue
    }
}

func ==(lhs: CharacteristicKey, rhs: CharacteristicKey) -> Bool {
    return lhs.deviceId == rhs.deviceId &&
           lhs.serviceId == rhs.serviceId &&
           lhs.characteristicId == rhs.characteristicId
}
