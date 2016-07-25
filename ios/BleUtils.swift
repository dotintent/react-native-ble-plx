//
//  BleUtils.swift
//  EmptyProject
//
//  Created by Przemysław Lenart on 20/07/16.
//

import Foundation
import RxSwift
import CoreBluetooth

class DisposableMap {
  private var disposables = Dictionary<String, Disposable>()

  func replaceDisposable(key: String, disposable: Disposable?) {
    disposables[key]?.dispose()
    disposables[key] = disposable
  }

  func removeDisposable(key: String) {
    replaceDisposable(key, disposable: nil)
  }
}

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