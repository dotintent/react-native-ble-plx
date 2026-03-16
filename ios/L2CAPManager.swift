import Foundation
@preconcurrency import CoreBluetooth

// MARK: - L2CAPChannelWrapper

/// Wraps a CBL2CAPChannel with stream delegate bridging.
/// L2CAP does NOT wake suspended apps.
final class L2CAPChannelWrapper: NSObject, StreamDelegate, @unchecked Sendable {
    let channelId: Int
    private let channel: CBL2CAPChannel
    private let inputStream: InputStream
    private let outputStream: OutputStream
    private let runLoopQueue: DispatchQueue

    private let dataSubject = AsyncStreamBridge<Data>()
    private let closeSubject = AsyncStreamBridge<Error?>()

    var dataStream: AsyncStream<Data> { dataSubject.stream }
    var closeStream: AsyncStream<Error?> { closeSubject.stream }

    init(channel: CBL2CAPChannel, channelId: Int) {
        self.channel = channel
        self.channelId = channelId
        self.inputStream = channel.inputStream
        self.outputStream = channel.outputStream
        self.runLoopQueue = DispatchQueue(label: "com.bleplx.l2cap.\(channelId)")
        super.init()

        // Set up streams on a dedicated run loop
        runLoopQueue.async { [weak self] in
            guard let self = self else { return }
            self.inputStream.delegate = self
            self.outputStream.delegate = self

            let runLoop = RunLoop.current
            self.inputStream.schedule(in: runLoop, forMode: .default)
            self.outputStream.schedule(in: runLoop, forMode: .default)

            self.inputStream.open()
            self.outputStream.open()

            // Keep the run loop alive
            while !self.inputStream.streamStatus.isTerminal &&
                  !self.outputStream.streamStatus.isTerminal {
                runLoop.run(mode: .default, before: Date(timeIntervalSinceNow: 0.1))
            }
        }
    }

    func write(data: Data) throws {
        guard outputStream.hasSpaceAvailable else {
            throw BleError(code: .l2capWriteFailed, message: "L2CAP output stream not ready")
        }

        // Loop to handle partial writes — outputStream.write() may return
        // less than data.count without returning -1 (not an error, just
        // the output buffer being full). We must write remaining bytes.
        var offset = 0
        while offset < data.count {
            let bytesWritten = data.withUnsafeBytes { buffer -> Int in
                guard let ptr = buffer.baseAddress?.assumingMemoryBound(to: UInt8.self) else { return -1 }
                return outputStream.write(ptr.advanced(by: offset), maxLength: data.count - offset)
            }

            if bytesWritten < 0 {
                throw BleError(
                    code: .l2capWriteFailed,
                    message: "L2CAP write failed: \(outputStream.streamError?.localizedDescription ?? "unknown error")"
                )
            }

            if bytesWritten == 0 {
                // Stream buffer full — caller should retry
                throw BleError(code: .l2capWriteFailed, message: "L2CAP output buffer full, wrote \(offset)/\(data.count) bytes")
            }

            offset += bytesWritten
        }
    }

    func close() {
        // Dispatch stream unschedule/close to the same RunLoop thread that scheduled them.
        // Calling remove(from: .current) from a different thread is a no-op at best,
        // and a race at worst.
        runLoopQueue.async { [weak self] in
            guard let self = self else { return }
            self.inputStream.remove(from: .current, forMode: .default)
            self.outputStream.remove(from: .current, forMode: .default)
            self.inputStream.close()
            self.outputStream.close()
        }
        dataSubject.finish()
        closeSubject.finish()
    }

    // MARK: - StreamDelegate

    func stream(_ aStream: Stream, handle eventCode: Stream.Event) {
        switch eventCode {
        case .hasBytesAvailable:
            guard let inputStream = aStream as? InputStream else { return }
            readAvailableData(from: inputStream)

        case .errorOccurred:
            let error = aStream.streamError
            closeSubject.yield(error)

        case .endEncountered:
            closeSubject.yield(nil)

        default:
            break
        }
    }

    private func readAvailableData(from stream: InputStream) {
        let bufferSize = 4096
        var buffer = [UInt8](repeating: 0, count: bufferSize)
        var allData = Data()

        while stream.hasBytesAvailable {
            let bytesRead = stream.read(&buffer, maxLength: bufferSize)
            if bytesRead > 0 {
                allData.append(buffer, count: bytesRead)
            } else {
                break
            }
        }

        if !allData.isEmpty {
            dataSubject.yield(allData)
        }
    }
}

private extension Stream.Status {
    var isTerminal: Bool {
        self == .closed || self == .error || self == .atEnd
    }
}

// MARK: - L2CAPManager

/// Manages L2CAP channel lifecycle.
actor L2CAPManager {
    private var channels: [Int: L2CAPChannelWrapper] = [:]
    private var nextChannelId: Int = 1
    private var dataForwardingTasks: [Int: Task<Void, Never>] = [:]
    private var closeForwardingTasks: [Int: Task<Void, Never>] = [:]

    private let onData: @Sendable (Int, String) -> Void  // channelId, base64 data
    private let onClose: @Sendable (Int, String?) -> Void  // channelId, error message

    init(
        onData: @escaping @Sendable (Int, String) -> Void,
        onClose: @escaping @Sendable (Int, String?) -> Void
    ) {
        self.onData = onData
        self.onClose = onClose
    }

    /// Open a new L2CAP channel.
    /// The actual CBL2CAPChannel is received via the peripheral delegate callback.
    func registerChannel(_ channel: CBL2CAPChannel) -> Int {
        let channelId = nextChannelId
        nextChannelId += 1

        let wrapper = L2CAPChannelWrapper(channel: channel, channelId: channelId)
        channels[channelId] = wrapper

        // Forward data events
        let onData = self.onData
        dataForwardingTasks[channelId] = Task { [weak self] in
            for await data in wrapper.dataStream {
                let base64 = data.base64EncodedString()
                onData(wrapper.channelId, base64)
            }
        }

        // Forward close events
        let onClose = self.onClose
        closeForwardingTasks[channelId] = Task { [weak self] in
            for await error in wrapper.closeStream {
                onClose(wrapper.channelId, error?.localizedDescription)
                await self?.removeChannel(wrapper.channelId)
            }
        }

        return channelId
    }

    func write(channelId: Int, data: Data) throws {
        guard let channel = channels[channelId] else {
            throw BleError(code: .l2capNotConnected, message: "L2CAP channel \(channelId) not found")
        }
        try channel.write(data: data)
    }

    func close(channelId: Int) throws {
        guard let channel = channels[channelId] else {
            throw BleError(code: .l2capNotConnected, message: "L2CAP channel \(channelId) not found")
        }
        channel.close()
        removeChannel(channelId)
    }

    func cleanup() {
        for (_, channel) in channels {
            channel.close()
        }
        for (_, task) in dataForwardingTasks {
            task.cancel()
        }
        for (_, task) in closeForwardingTasks {
            task.cancel()
        }
        channels.removeAll()
        dataForwardingTasks.removeAll()
        closeForwardingTasks.removeAll()
    }

    private func removeChannel(_ channelId: Int) {
        channels.removeValue(forKey: channelId)
        dataForwardingTasks[channelId]?.cancel()
        dataForwardingTasks.removeValue(forKey: channelId)
        closeForwardingTasks[channelId]?.cancel()
        closeForwardingTasks.removeValue(forKey: channelId)
    }
}
