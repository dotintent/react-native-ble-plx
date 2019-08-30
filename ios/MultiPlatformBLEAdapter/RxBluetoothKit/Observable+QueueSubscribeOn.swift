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

/// Queue which is used for queueing subscriptions for queueSubscribeOn operator.
class SerializedSubscriptionQueue {
    let lock = NSLock()

    /// First element on queue is curently subscribed and not completed
    /// observable. All others are queued for subscription when the first
    /// one is finished.
    var queue: [DelayedObservableType] = []

    /// Queue subscription. If observable is inserted
    /// into empty queue it's subscribed immediately. Otherwise
    /// it waits for completion from other observables.
    func queueSubscription(observable: DelayedObservableType) {
        lock.lock(); defer { lock.unlock() }
        let execute = queue.isEmpty
        queue.append(observable)
        if execute {
            // Observable is scheduled immidiately
            queue.first?.delayedSubscribe()
        }
    }

    func unsubscribe(observable: DelayedObservableType) {
        lock.lock(); defer { lock.unlock() }
        // Find index of observable which should be unsubscribed
        // and remove it from queue
        if let index = queue.index(where: { $0 === observable }) {
            queue.remove(at: index)
            // If first item was unsubscribed, subscribe on next one
            // if available
            if index == 0 {
                queue.first?.delayedSubscribe()
            }
        }
    }
}

protocol DelayedObservableType: class {
    func delayedSubscribe()
}

class QueueSubscribeOn<Element>: Cancelable, ObservableType, ObserverType, DelayedObservableType {
    typealias E = Element

    let source: Observable<Element>
    let queue: SerializedSubscriptionQueue
    var observer: AnyObserver<Element>?

    let serialDisposable = SerialDisposable()
    var _isDisposed: Int32 = 0
    var isDisposed: Bool {
        return _isDisposed == 1
    }

    var disposed: Bool {
        return _isDisposed == 1
    }

    init(source: Observable<Element>, queue: SerializedSubscriptionQueue) {
        self.source = source
        self.queue = queue
    }

    /// All event needs to be passed to original observer
    /// if subscription was not disposed. If stream is completed
    /// cleanup should occur.
    func on(_ event: Event<Element>) {
        guard !isDisposed else { return }
        observer?.on(event)
        if event.isStopEvent {
            dispose()
        }
    }

    /// Part of producer implementation. We need to make sure that we can optimize
    /// scheduling of a work (taken from RxSwift source code)
    func subscribe<O: ObserverType>(_ observer: O) -> Disposable where O.E == Element {
        if !CurrentThreadScheduler.isScheduleRequired {
            return run(observer: observer)
        }
        return CurrentThreadScheduler.instance.schedule(()) { _ in
            self.run(observer: observer)
        }
    }

    /// After original subscription we need to place it on queue for delayed execution if required.
    func run<O: ObserverType>(observer: O) -> Disposable where O.E == Element {
        self.observer = observer.asObserver()
        queue.queueSubscription(observable: self)
        return self
    }

    /// Delayed subscription must be called after original subscription so that observer
    /// will be stored by that time.
    func delayedSubscribe() {
        serialDisposable.disposable = self.source.subscribe(self)
    }

    /// When this observable is disposed we need to remove it from queue to let other
    /// observables to be able to subscribe.
    func dispose() {
        if OSAtomicCompareAndSwap32(0, 1, &_isDisposed) {
            self.queue.unsubscribe(observable: self)
            self.serialDisposable.dispose()
        }
    }
}

extension ObservableType {

    // swiftlint:disable missing_docs
    /// Store subscription in queue on which it will be executed sequentially. Subscribe method is called
    /// only when there are no registered subscription on queue or last running observable completed its stream
    /// or was disposed before that event.
    /// - parameter queue: Queue on which scheduled subscriptions will be executed in sequentially.
    /// - returns: The source which will be subscribe when queue is empty or previous
    /// observable was completed or disposed.
    func queueSubscribe(on queue: SerializedSubscriptionQueue) -> Observable<E> {
        return QueueSubscribeOn(source: asObservable(), queue: queue).asObservable()
    }

    // swiftlint:enable missing_docs
}
