//
//  Utils.swift
//  EmptyProject
//
//  Created by Przemysław Lenart on 20/07/16.
//  Copyright © 2016 Facebook. All rights reserved.
//

import Foundation
import CoreBluetooth

extension SequenceType where Generator.Element == String {
  func toCBUUIDS() -> [CBUUID]? {
    var newUUIDS: [CBUUID] = []
    for uuid in self {
      guard let nsuuid = NSUUID(UUIDString: uuid) else {
        return nil;
      }
      newUUIDS.append(CBUUID(NSUUID: nsuuid))
    }
    return newUUIDS
  }
}