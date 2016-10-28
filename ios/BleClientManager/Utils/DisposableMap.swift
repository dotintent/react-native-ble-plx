//
//  DisposableMap.swift
//  BleClientManager
//
//  Created by Przemysław Lenart on 25/10/16.
//  Copyright © 2016 Polidea. All rights reserved.
//

import RxSwift

class DisposableMap<T: Hashable> {
    private var disposables = Dictionary<T, Disposable>()

    func replaceDisposable(key: T, disposable: Disposable?) {
        disposables[key]?.dispose()
        disposables[key] = disposable
    }

    func removeDisposable(key: T) {
        replaceDisposable(key, disposable: nil)
    }

    deinit {
        disposables.forEach {
            (_, disposable) in
            disposable.dispose()
        }
    }
}
