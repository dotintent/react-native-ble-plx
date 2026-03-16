import Foundation
import CoreBluetooth

final class BLEPeripheralManager: NSObject, ObservableObject {

    // MARK: - UUIDs (matching Android)

    static let serviceUUID        = CBUUID(string: "12345678-1234-1234-1234-123456789abc")
    static let readCounterUUID    = CBUUID(string: "12345678-1234-1234-1234-123456789a01")
    static let writeEchoUUID      = CBUUID(string: "12345678-1234-1234-1234-123456789a02")
    static let notifyStreamUUID   = CBUUID(string: "12345678-1234-1234-1234-123456789a03")
    static let indicateStreamUUID = CBUUID(string: "12345678-1234-1234-1234-123456789a04")
    static let mtuTestUUID        = CBUUID(string: "12345678-1234-1234-1234-123456789a05")
    static let writeNoRespUUID    = CBUUID(string: "12345678-1234-1234-1234-123456789A06")
    static let l2capPsmUUID       = CBUUID(string: "12345678-1234-1234-1234-123456789A07")

    // MARK: - Published state

    @Published var statusText: String = "Initializing..."
    @Published var connectionText: String = "No connections"
    @Published var logLines: [String] = []
    @Published var peripheralIdentifier: String = ""

    // MARK: - Private state

    private var peripheralManager: CBPeripheralManager!
    private var service: CBMutableService?

    private var notifyCharacteristic: CBMutableCharacteristic?
    private var indicateCharacteristic: CBMutableCharacteristic?

    private var connectedCentral: CBCentral?
    private var subscribedNotifyCentral: CBCentral?
    private var subscribedIndicateCentral: CBCentral?

    private var readCounter: UInt32 = 0
    private var echoData = Data()
    private var noResponseData = Data()

    private var l2capPSM: UInt16 = 0
    private var l2capChannel: CBL2CAPChannel?
    private var l2capPsmCharacteristic: CBMutableCharacteristic?

    private var notifyCounter: UInt32 = 0
    private var indicateCounter: UInt32 = 0
    private var notifyEnabled = false
    private var indicateEnabled = false

    private var notifyTimer: Timer?
    private var indicateTimer: Timer?

    private var notifyBackpressure = false
    private var indicateBackpressure = false

    private var negotiatedMtu: UInt16 = 23

    // MARK: - Init

    override init() {
        super.init()
        peripheralManager = CBPeripheralManager(delegate: self, queue: nil)
    }

    deinit {
        stopTimers()
        peripheralManager.stopAdvertising()
    }

    // MARK: - Helpers

    private func appendLog(_ message: String) {
        DispatchQueue.main.async {
            self.logLines.append(message)
            if self.logLines.count > 200 {
                self.logLines.removeFirst(self.logLines.count - 200)
            }
        }
    }

    private func shortUUID(_ uuid: CBUUID) -> String {
        let s = uuid.uuidString
        return String(s.suffix(4))
    }

    private func uint32LEData(_ value: UInt32) -> Data {
        var v = value.littleEndian
        return Data(bytes: &v, count: 4)
    }

    private func uint16LEData(_ value: UInt16) -> Data {
        var v = value.littleEndian
        return Data(bytes: &v, count: 2)
    }

    // MARK: - Service setup

    private func setupService() {
        let readCounterChar = CBMutableCharacteristic(
            type: Self.readCounterUUID,
            properties: [.read],
            value: nil,   // nil = dynamic value via delegate
            permissions: [.readable]
        )

        let writeEchoChar = CBMutableCharacteristic(
            type: Self.writeEchoUUID,
            properties: [.read, .write],
            value: nil,
            permissions: [.readable, .writeable]
        )

        let notifyChar = CBMutableCharacteristic(
            type: Self.notifyStreamUUID,
            properties: [.read, .notify],
            value: nil,
            permissions: [.readable]
        )

        let indicateChar = CBMutableCharacteristic(
            type: Self.indicateStreamUUID,
            properties: [.read, .indicate],
            value: nil,
            permissions: [.readable]
        )

        let mtuChar = CBMutableCharacteristic(
            type: Self.mtuTestUUID,
            properties: [.read],
            value: nil,
            permissions: [.readable]
        )

        let writeNoRespChar = CBMutableCharacteristic(
            type: Self.writeNoRespUUID,
            properties: [.read, .writeWithoutResponse],
            value: nil,
            permissions: [.readable, .writeable]
        )

        let l2capPsmChar = CBMutableCharacteristic(
            type: Self.l2capPsmUUID,
            properties: [.read],
            value: nil,
            permissions: [.readable]
        )

        notifyCharacteristic = notifyChar
        indicateCharacteristic = indicateChar
        l2capPsmCharacteristic = l2capPsmChar

        let svc = CBMutableService(type: Self.serviceUUID, primary: true)
        svc.characteristics = [readCounterChar, writeEchoChar, notifyChar, indicateChar, mtuChar, writeNoRespChar, l2capPsmChar]
        service = svc

        peripheralManager.add(svc)
        appendLog("GATT server opened with test service")
    }

    private func publishL2CAPChannel() {
        peripheralManager.publishL2CAPChannel(withEncryption: false)
        appendLog("L2CAP: publishing channel (no encryption)")
    }

    private func startAdvertising() {
        peripheralManager.startAdvertising([
            CBAdvertisementDataLocalNameKey: "BlePlxTest",
            CBAdvertisementDataServiceUUIDsKey: [Self.serviceUUID]
        ])
    }

    // MARK: - Timers

    private func startNotifyTimer() {
        notifyTimer?.invalidate()
        notifyCounter = 0
        notifyTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            self?.sendNotification()
        }
    }

    private func stopNotifyTimer() {
        notifyTimer?.invalidate()
        notifyTimer = nil
    }

    private func startIndicateTimer() {
        indicateTimer?.invalidate()
        indicateCounter = 0
        indicateTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            self?.sendIndication()
        }
    }

    private func stopIndicateTimer() {
        indicateTimer?.invalidate()
        indicateTimer = nil
    }

    private func stopTimers() {
        stopNotifyTimer()
        stopIndicateTimer()
    }

    // MARK: - Send notifications / indications

    private func sendNotification() {
        guard let char = notifyCharacteristic, let central = subscribedNotifyCentral else { return }
        guard !notifyBackpressure else { return }
        notifyCounter += 1
        let data = uint32LEData(notifyCounter)
        let sent = peripheralManager.updateValue(data, for: char, onSubscribedCentrals: [central])
        if !sent {
            notifyCounter -= 1
            notifyBackpressure = true
            appendLog("NOTIFY backpressure: transmit queue full, pausing until ready")
        }
    }

    private func sendIndication() {
        guard let char = indicateCharacteristic, let central = subscribedIndicateCentral else { return }
        guard !indicateBackpressure else { return }
        indicateCounter += 1
        let data = uint32LEData(indicateCounter)
        let sent = peripheralManager.updateValue(data, for: char, onSubscribedCentrals: [central])
        if !sent {
            indicateCounter -= 1
            indicateBackpressure = true
            appendLog("INDICATE backpressure: transmit queue full, pausing until ready")
        }
    }
}

// MARK: - CBPeripheralManagerDelegate

extension BLEPeripheralManager: CBPeripheralManagerDelegate {

    func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
        DispatchQueue.main.async {
            switch peripheral.state {
            case .poweredOn:
                self.statusText = "Bluetooth powered on"
                self.appendLog("Bluetooth powered on")
                self.setupService()
                self.startAdvertising()
                self.publishL2CAPChannel()
            case .poweredOff:
                self.statusText = "Bluetooth is off"
                self.appendLog("Bluetooth powered off")
            case .unauthorized:
                self.statusText = "Bluetooth unauthorized"
                self.appendLog("Bluetooth unauthorized")
            case .unsupported:
                self.statusText = "BLE not supported"
                self.appendLog("BLE not supported on this device")
            case .resetting:
                self.statusText = "Bluetooth resetting..."
                self.appendLog("Bluetooth resetting")
            case .unknown:
                self.statusText = "Bluetooth state unknown"
            @unknown default:
                self.statusText = "Bluetooth state unknown"
            }
        }
    }

    func peripheralManagerDidStartAdvertising(_ peripheral: CBPeripheralManager, error: Error?) {
        DispatchQueue.main.async {
            if let error = error {
                self.statusText = "Advertising failed: \(error.localizedDescription)"
                self.appendLog("Advertising failed: \(error.localizedDescription)")
            } else {
                self.statusText = "Advertising..."
                self.appendLog("Advertising started as 'BlePlxTest'")
            }
        }
    }

    func peripheralManager(_ peripheral: CBPeripheralManager, didAdd service: CBService, error: Error?) {
        if let error = error {
            appendLog("Failed to add service: \(error.localizedDescription)")
        } else {
            appendLog("Service added: \(shortUUID(service.uuid))")
        }
    }

    func peripheralManager(_ peripheral: CBPeripheralManager, central: CBCentral, didSubscribeTo characteristic: CBCharacteristic) {
        DispatchQueue.main.async {
            self.connectedCentral = central
            self.negotiatedMtu = UInt16(central.maximumUpdateValueLength + 3)  // ATT header is 3 bytes
            self.connectionText = "Connected: \(central.identifier.uuidString.prefix(8))..."

            if characteristic.uuid == Self.notifyStreamUUID {
                self.subscribedNotifyCentral = central
                self.notifyEnabled = true
                self.startNotifyTimer()
                self.appendLog("NOTIFY enabled")
            } else if characteristic.uuid == Self.indicateStreamUUID {
                self.subscribedIndicateCentral = central
                self.indicateEnabled = true
                self.startIndicateTimer()
                self.appendLog("INDICATE enabled")
            }
        }
    }

    func peripheralManager(_ peripheral: CBPeripheralManager, central: CBCentral, didUnsubscribeFrom characteristic: CBCharacteristic) {
        DispatchQueue.main.async {
            if characteristic.uuid == Self.notifyStreamUUID {
                self.notifyEnabled = false
                self.subscribedNotifyCentral = nil
                self.stopNotifyTimer()
                self.appendLog("NOTIFY disabled")
            } else if characteristic.uuid == Self.indicateStreamUUID {
                self.indicateEnabled = false
                self.subscribedIndicateCentral = nil
                self.stopIndicateTimer()
                self.appendLog("INDICATE disabled")
            }

            // Check if anything is still subscribed
            if self.subscribedNotifyCentral == nil && self.subscribedIndicateCentral == nil {
                self.connectedCentral = nil
                self.connectionText = "No connections"
            }
        }
    }

    func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveRead request: CBATTRequest) {
        let uuid = request.characteristic.uuid
        var value: Data

        switch uuid {
        case Self.readCounterUUID:
            readCounter += 1
            value = uint32LEData(readCounter)
        case Self.writeEchoUUID:
            value = echoData
        case Self.notifyStreamUUID:
            value = uint32LEData(notifyCounter)
        case Self.indicateStreamUUID:
            value = uint32LEData(indicateCounter)
        case Self.mtuTestUUID:
            if let central = request.central as CBCentral? {
                negotiatedMtu = UInt16(central.maximumUpdateValueLength + 3)
            }
            value = uint16LEData(negotiatedMtu)
        case Self.writeNoRespUUID:
            value = noResponseData
        case Self.l2capPsmUUID:
            value = uint16LEData(l2capPSM)
        default:
            peripheral.respond(to: request, withResult: .requestNotSupported)
            return
        }

        if request.offset > value.count {
            peripheral.respond(to: request, withResult: .invalidOffset)
            return
        }

        request.value = value.subdata(in: request.offset..<value.count)
        peripheral.respond(to: request, withResult: .success)
        appendLog("READ \(shortUUID(uuid)) -> \(Array(value))")

        // Track connection
        DispatchQueue.main.async {
            if self.connectedCentral == nil {
                self.connectedCentral = request.central
                self.connectionText = "Connected: \(request.central.identifier.uuidString.prefix(8))..."
                self.appendLog("Device connected: \(request.central.identifier.uuidString.prefix(8))...")
            }
        }
    }

    func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveWrite requests: [CBATTRequest]) {
        for request in requests {
            if request.characteristic.uuid == Self.writeEchoUUID {
                if let value = request.value {
                    echoData = value
                    appendLog("WRITE \(shortUUID(request.characteristic.uuid)) <- \(Array(value))")
                }
            } else if request.characteristic.uuid == Self.writeNoRespUUID {
                if let value = request.value {
                    noResponseData = value
                    appendLog("WRITE_NO_RESP \(shortUUID(request.characteristic.uuid)) <- \(Array(value))")
                }
            }

            // Track connection
            DispatchQueue.main.async {
                if self.connectedCentral == nil {
                    self.connectedCentral = request.central
                    self.connectionText = "Connected: \(request.central.identifier.uuidString.prefix(8))..."
                    self.appendLog("Device connected: \(request.central.identifier.uuidString.prefix(8))...")
                }
            }
        }

        peripheral.respond(to: requests[0], withResult: .success)
    }

    func peripheralManagerIsReady(toUpdateSubscribers peripheral: CBPeripheralManager) {
        // CoreBluetooth signals the transmit queue has space again
        if notifyBackpressure {
            notifyBackpressure = false
            appendLog("NOTIFY backpressure relieved, resuming")
            sendNotification()
        }
        if indicateBackpressure {
            indicateBackpressure = false
            appendLog("INDICATE backpressure relieved, resuming")
            sendIndication()
        }
    }

    // MARK: - L2CAP

    func peripheralManager(_ peripheral: CBPeripheralManager, didPublishL2CAPChannel PSM: CBL2CAPPSM, error: Error?) {
        if let error = error {
            appendLog("L2CAP: failed to publish channel: \(error.localizedDescription)")
            return
        }
        l2capPSM = UInt16(PSM)
        appendLog("L2CAP: published channel with PSM \(PSM)")
    }

    func peripheralManager(_ peripheral: CBPeripheralManager, didOpen channel: CBL2CAPChannel?, error: Error?) {
        if let error = error {
            appendLog("L2CAP: connection error: \(error.localizedDescription)")
            return
        }
        guard let channel = channel else {
            appendLog("L2CAP: didOpen called with nil channel")
            return
        }
        l2capChannel = channel
        appendLog("L2CAP: incoming connection opened (PSM \(channel.psm))")

        channel.inputStream.delegate = self
        channel.outputStream.delegate = self
        channel.inputStream.schedule(in: .main, forMode: .default)
        channel.outputStream.schedule(in: .main, forMode: .default)
        channel.inputStream.open()
        channel.outputStream.open()
    }
}

// MARK: - StreamDelegate (L2CAP echo)

extension BLEPeripheralManager: StreamDelegate {

    func stream(_ aStream: Stream, handle eventCode: Stream.Event) {
        switch eventCode {
        case .hasBytesAvailable:
            guard let inputStream = aStream as? InputStream else { return }
            var buffer = [UInt8](repeating: 0, count: 1024)
            let bytesRead = inputStream.read(&buffer, maxLength: buffer.count)
            if bytesRead > 0 {
                let data = Data(buffer[0..<bytesRead])
                appendLog("L2CAP: read \(bytesRead) bytes")
                // Echo back on the output stream
                if let outputStream = l2capChannel?.outputStream {
                    let written = data.withUnsafeBytes { ptr -> Int in
                        guard let baseAddress = ptr.baseAddress?.assumingMemoryBound(to: UInt8.self) else { return 0 }
                        return outputStream.write(baseAddress, maxLength: bytesRead)
                    }
                    appendLog("L2CAP: echoed \(written) bytes")
                }
            }
        case .hasSpaceAvailable:
            break
        case .errorOccurred:
            appendLog("L2CAP: stream error: \(aStream.streamError?.localizedDescription ?? "unknown")")
        case .endEncountered:
            appendLog("L2CAP: stream ended")
            aStream.close()
            aStream.remove(from: .main, forMode: .default)
        case .openCompleted:
            appendLog("L2CAP: stream open completed")
        default:
            break
        }
    }
}
