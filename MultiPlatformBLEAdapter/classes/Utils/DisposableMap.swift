//
//  DisposableMap.swift
//  BleClientManager
//
//  Created by Przemysław Lenart on 25/10/16.
//  Copyright © 2016 Polidea. All rights reserved.
//

class DisposableMap<T: Hashable> {
    fileprivate var disposables = Dictionary<T, Disposable>()

    func replaceDisposable(_ key: T, disposable: Disposable?) {
        disposables[key]?.dispose()
        disposables[key] = disposable
    }

    func removeDisposable(_ key: T) {
        replaceDisposable(key, disposable: nil)
    }

    func dispose() {
        disposables.forEach {
            (_, disposable) in
            disposable.dispose()
        }
        disposables.removeAll()
    }

    deinit {
        dispose()
    }
}
