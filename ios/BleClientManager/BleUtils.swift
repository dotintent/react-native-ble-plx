//
//  BleUtils.swift
//  EmptyProject
//
//  Created by Przemysław Lenart on 20/07/16.
//

import Foundation
import RxSwift
import CoreBluetooth

public typealias Resolve = AnyObject? -> ()
public typealias Reject = (NSString?, NSString?, NSError?) -> ()

class DisposableMap {
    private var disposables = Dictionary<String, Disposable>()

    func replaceDisposable(key: String, disposable: Disposable?) {
        disposables[key]?.dispose()
        disposables[key] = disposable
    }

    func removeDisposable(key: String) {
        replaceDisposable(key, disposable: nil)
    }

    deinit {
        disposables.forEach {
            (_, disposable) in
            disposable.dispose()
        }
    }
}

extension SequenceType where Generator.Element == String {
    func toCBUUIDS() -> [CBUUID]? {
        var newUUIDS: [CBUUID] = []
        for uuid in self {
            guard let nsuuid = uuid.toCBUUID() else {
                return nil;
            }
            newUUIDS.append(nsuuid)
        }
        return newUUIDS
    }
}

extension String {
    func toCBUUID() -> CBUUID? {
        let value = self.characters.count == 4 ? "0000\(self)-0000-1000-8000-00805f9b34fb" : self
        return CBUUID(string: value)
    }
}

extension CBUUID {
    var fullUUIDString: String {
        let native = self.UUIDString.lowercaseString
        if (native.characters.count == 4) {
            return "0000\(native)-0000-1000-8000-00805f9b34fb"
        }
        if (native.characters.count == 8) {
            return "\(native)-0000-1000-8000-00805f9b34fb"
        }
        return native
    }
}
