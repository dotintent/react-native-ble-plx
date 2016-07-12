//
//  Promise.swift
//  EmptyProject
//
//  Created by Przemysław Lenart on 12/07/16.
//

import Foundation
import RxSwift

enum PromiseResult<T> {
  case Resolve(T)
  case Reject(ErrorType)
}

enum PromiseError: ErrorType {
  case ValueNotEmitted
  case ValueEmittedTwice
}

class Promise<T> : ObserverType, Disposable {
  typealias E = T
  typealias PromiseFunc = (result: PromiseResult<T>) -> Void

  let source: Observable<T>
  let disposable = SerialDisposable()
  var promiseFunc: PromiseFunc?
  var value: T?

  init(source: Observable<T>) {
    self.source = source
  }

  internal func on(event: RxSwift.Event<T>) {
    guard let promiseFunc = promiseFunc else { return }

    switch event {
    case let .Next(item):
      if value != nil {
        promiseFunc(result: PromiseResult.Reject(PromiseError.ValueEmittedTwice))
        break
      }
      value = item
      break
    case .Completed:
      guard let value = value else {
        promiseFunc(result: PromiseResult.Reject(PromiseError.ValueNotEmitted))
        break
      }
      promiseFunc(result: PromiseResult.Resolve(value))
      break
    case let .Error(errorType):
      promiseFunc(result: PromiseResult.Reject(errorType))
      break
    }
  }

  internal func dispose() {
    disposable.dispose()
  }

  @warn_unused_result(message="http://git.io/rxs.uo")
  func subscribe(subscription: PromiseFunc) -> Disposable {
    self.disposable.disposable = source.subscribe(self);
    return self
  }

  @warn_unused_result(message="http://git.io/rxs.uo")
  func subscribe(resolve resolve: T -> Void, reject: ErrorType -> Void) -> Disposable {
    return subscribe { result in
      switch result {
      case let .Resolve(item):
        resolve(item)
      case let .Reject(errorType):
        reject(errorType)
      }
    }
  }

}

extension ObservableType {
  @warn_unused_result(message="http://git.io/rxs.uo")
  func toPromise() -> Promise<E> {
    return Promise(source: self.asObservable())
  }
}
