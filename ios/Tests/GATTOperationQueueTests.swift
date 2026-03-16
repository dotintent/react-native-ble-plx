import XCTest
@testable import BlePlx

/// Tests for the actor-based serial GATT operation queue.
///
/// The queue provides:
///   - Serial execution: second operation waits for first to finish
///   - Per-operation timeouts that throw `.operationTimedOut`
///   - Pre-enqueue cancellation detection
///   - Mid-queue cancellation detection (cancel arrives between enqueue and execution)
final class GATTOperationQueueTests: XCTestCase {

    // MARK: - Serial execution

    /// Two operations enqueued concurrently must execute sequentially:
    /// the second must not start until the first completes.
    func testOperationsExecuteSerially() async throws {
        let queue = GATTOperationQueue(defaultTimeout: 5.0)
        var executionOrder: [Int] = []
        let lock = NSLock()

        // First operation takes a small amount of time
        async let first: Int = queue.enqueue {
            try await Task.sleep(nanoseconds: 50_000_000) // 50ms
            lock.lock()
            executionOrder.append(1)
            lock.unlock()
            return 1
        }

        // Small delay to ensure first is enqueued before second
        try await Task.sleep(nanoseconds: 5_000_000) // 5ms

        async let second: Int = queue.enqueue {
            lock.lock()
            executionOrder.append(2)
            lock.unlock()
            return 2
        }

        let (r1, r2) = try await (first, second)
        XCTAssertEqual(r1, 1)
        XCTAssertEqual(r2, 2)
        XCTAssertEqual(executionOrder, [1, 2], "Second must not start before first completes")
    }

    /// Enqueuing multiple operations returns each in the correct order.
    func testQueueReturnValues() async throws {
        let queue = GATTOperationQueue(defaultTimeout: 5.0)

        async let a: String = queue.enqueue { "alpha" }
        async let b: String = queue.enqueue { "beta" }
        async let c: String = queue.enqueue { "gamma" }

        let results = try await [a, b, c]
        XCTAssertEqual(results, ["alpha", "beta", "gamma"])
    }

    // MARK: - Timeout

    /// An operation that hangs longer than its timeout must throw `.operationTimedOut`.
    func testTimeoutFiresAndThrowsError() async {
        let queue = GATTOperationQueue(defaultTimeout: 5.0)

        do {
            let _: Void = try await queue.enqueue(timeout: 0.05) {
                // Hang for longer than the timeout
                try await Task.sleep(nanoseconds: 10_000_000_000) // 10s
            }
            XCTFail("Expected operationTimedOut error")
        } catch let error as BleError {
            XCTAssertEqual(error.code, .operationTimedOut)
        } catch {
            XCTFail("Expected BleError but got: \(error)")
        }
    }

    /// Default timeout is used when no per-operation timeout is specified.
    func testDefaultTimeoutIsApplied() async {
        let queue = GATTOperationQueue(defaultTimeout: 0.05) // 50ms default

        do {
            let _: Void = try await queue.enqueue {
                try await Task.sleep(nanoseconds: 10_000_000_000) // 10s
            }
            XCTFail("Expected operationTimedOut error")
        } catch let error as BleError {
            XCTAssertEqual(error.code, .operationTimedOut)
        } catch {
            XCTFail("Expected BleError but got: \(error)")
        }
    }

    /// A fast operation must succeed even when a timeout is set.
    func testFastOperationSucceedsWithTimeout() async throws {
        let queue = GATTOperationQueue(defaultTimeout: 5.0)

        let result: String = try await queue.enqueue(timeout: 2.0) {
            "done"
        }
        XCTAssertEqual(result, "done")
    }

    // MARK: - Cancel before execution

    /// Cancelling a transaction ID before calling enqueue must cause the enqueue
    /// call to throw `.operationCancelled` immediately.
    func testCancelBeforeEnqueueThrowsOperationCancelled() async {
        let queue = GATTOperationQueue(defaultTimeout: 5.0)
        let txId = "pre-cancel-tx"

        // Mark cancelled before we enqueue
        await queue.cancelTransaction(txId)

        do {
            let _: Void = try await queue.enqueue(transactionId: txId) {
                XCTFail("Operation body must not execute when pre-cancelled")
            }
            XCTFail("Expected operationCancelled error")
        } catch let error as BleError {
            XCTAssertEqual(error.code, .operationCancelled)
            XCTAssertTrue(error.message.contains(txId))
        } catch {
            XCTFail("Expected BleError but got: \(error)")
        }
    }

    // MARK: - Cancel between enqueue and execution

    /// Cancelling a transaction while a previous operation is still executing
    /// must throw `.operationCancelled` when the queued operation finally starts.
    func testCancelBetweenEnqueueAndExecutionThrowsOperationCancelled() async {
        // Use a very short default timeout so the test doesn't hang if something goes wrong
        let queue = GATTOperationQueue(defaultTimeout: 2.0)

        let firstStarted = AsyncSemaphore()
        let cancelIssued = AsyncSemaphore()
        let txId = "mid-queue-tx"

        // First operation blocks until we signal it
        let firstTask = Task<Void, Error> {
            try await queue.enqueue {
                await firstStarted.signal()
                // Wait until the test has issued the cancel
                await cancelIssued.wait()
                try await Task.sleep(nanoseconds: 10_000_000) // 10ms — complete quickly
            }
        }

        // Wait for first op to actually start executing
        await firstStarted.wait()

        // Enqueue second operation (it will be pending behind the first)
        let secondTask = Task<Void, Error> {
            try await queue.enqueue(transactionId: txId) {
                XCTFail("Cancelled operation body must not execute")
            }
        }

        // Cancel the second transaction while it is waiting in the queue
        await queue.cancelTransaction(txId)

        // Let the first operation finish
        await cancelIssued.signal()

        do {
            try await firstTask.value
        } catch {
            XCTFail("First operation should not throw: \(error)")
        }

        do {
            try await secondTask.value
            XCTFail("Expected operationCancelled for second task")
        } catch let error as BleError {
            XCTAssertEqual(error.code, .operationCancelled)
        } catch {
            XCTFail("Expected BleError but got: \(error)")
        }
    }

    // MARK: - isCancelled

    func testIsCancelledReturnsTrueAfterCancel() async {
        let queue = GATTOperationQueue(defaultTimeout: 5.0)
        await queue.cancelTransaction("my-tx")
        let cancelled = await queue.isCancelled("my-tx")
        XCTAssertTrue(cancelled)
    }

    func testIsCancelledReturnsFalseForUnknownTransaction() async {
        let queue = GATTOperationQueue(defaultTimeout: 5.0)
        let cancelled = await queue.isCancelled("never-seen")
        XCTAssertFalse(cancelled)
    }

    // MARK: - Operations without transaction ID are not cancelled

    func testOperationWithoutTransactionIdIsNotAffectedByCancel() async throws {
        let queue = GATTOperationQueue(defaultTimeout: 5.0)
        // Cancel a transaction id that was never registered
        await queue.cancelTransaction("unrelated-tx")

        let result: Int = try await queue.enqueue {
            42
        }
        XCTAssertEqual(result, 42)
    }
}

// MARK: - AsyncSemaphore (test helper)

/// Minimal async semaphore used to synchronise test tasks without blocking threads.
private actor AsyncSemaphore {
    private var count = 0
    private var waiters: [CheckedContinuation<Void, Never>] = []

    func signal() {
        if waiters.isEmpty {
            count += 1
        } else {
            let waiter = waiters.removeFirst()
            waiter.resume()
        }
    }

    func wait() async {
        if count > 0 {
            count -= 1
            return
        }
        await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
            waiters.append(continuation)
        }
    }
}
