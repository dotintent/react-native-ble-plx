import Foundation

// MARK: - GATTOperation

/// A single GATT operation with a typed result
final class GATTOperation<T: Sendable>: Sendable {
    let id: String
    let timeout: TimeInterval
    let continuation: UnsafeContinuation<T, Error>

    init(id: String, timeout: TimeInterval, continuation: UnsafeContinuation<T, Error>) {
        self.id = id
        self.timeout = timeout
        self.continuation = continuation
    }
}

// MARK: - GATTOperationQueue

/// Actor-based serial queue for GATT operations.
/// Operations execute one at a time with configurable timeouts.
actor GATTOperationQueue {
    private var isExecuting = false
    private var pendingWork: [() async -> Void] = []
    private var activeTransactionId: String?
    private var cancelledTransactions: Set<String> = []

    let defaultTimeout: TimeInterval

    init(defaultTimeout: TimeInterval = 10.0) {
        self.defaultTimeout = defaultTimeout
    }

    /// Enqueue an operation that will execute when the queue is free.
    /// Returns the result of the operation or throws on timeout/cancellation.
    func enqueue<T: Sendable>(
        transactionId: String? = nil,
        timeout: TimeInterval? = nil,
        operation: @escaping @Sendable () async throws -> T
    ) async throws -> T {
        // Check if already cancelled before queuing
        if let txId = transactionId, cancelledTransactions.contains(txId) {
            cancelledTransactions.remove(txId)
            throw BleError(code: .operationCancelled, message: "Transaction \(txId) was cancelled")
        }

        return try await withUnsafeThrowingContinuation { (continuation: UnsafeContinuation<T, Error>) in
            let work: () async -> Void = { [weak self] in
                guard let self = self else {
                    continuation.resume(throwing: BleError(code: .bluetoothManagerDestroyed, message: "Queue destroyed"))
                    return
                }

                // Re-check cancellation at execution time — cancel may have arrived
                // between enqueue and when this work block actually starts running.
                if let txId = transactionId, await self.isCancelled(txId) {
                    continuation.resume(throwing: BleError(code: .operationCancelled, message: "Transaction \(txId) was cancelled"))
                    await self.operationFinished()
                    return
                }

                let effectiveTimeout = timeout ?? self.defaultTimeout

                do {
                    let result = try await withThrowingTaskGroup(of: T.self) { group in
                        group.addTask {
                            return try await operation()
                        }
                        group.addTask {
                            try await Task.sleep(nanoseconds: UInt64(effectiveTimeout * 1_000_000_000))
                            throw BleError(code: .operationTimedOut, message: "Operation timed out after \(effectiveTimeout)s")
                        }

                        guard let result = try await group.next() else {
                            throw BleError(code: .unknown, message: "No result from operation")
                        }
                        group.cancelAll()
                        return result
                    }
                    continuation.resume(returning: result)
                } catch {
                    continuation.resume(throwing: error)
                }

                await self.operationFinished()
            }

            pendingWork.append(work)
            if let txId = transactionId {
                activeTransactionId = txId
            }

            if !isExecuting {
                executeNext()
            }
        }
    }

    /// Cancel a pending or active operation by transaction ID
    func cancelTransaction(_ transactionId: String) {
        cancelledTransactions.insert(transactionId)
    }

    /// Check if a transaction has been cancelled
    func isCancelled(_ transactionId: String) -> Bool {
        return cancelledTransactions.contains(transactionId)
    }

    private func operationFinished() {
        isExecuting = false
        activeTransactionId = nil
        executeNext()
    }

    private func executeNext() {
        guard !isExecuting, !pendingWork.isEmpty else { return }
        isExecuting = true
        let work = pendingWork.removeFirst()
        Task {
            await work()
        }
    }
}
