//
//  Logging.swift
//  RxBluetoothKit
//
//  Created by Przemysław Lenart on 23/05/17.
//  Copyright © 2017 Polidea. All rights reserved.
//

import Foundation
import CoreBluetooth

/**
 RxBluetoothKit specific logging class which gives access to its settings.
 */
public class RxBluetoothKitLog: ReactiveCompatible {

    fileprivate static var currentLogLevel: LogLevel = .none

    fileprivate static let subject = PublishSubject<String>()

    private init() {
    }

    /// Log levels for internal logging mechanism.
    public enum LogLevel: UInt8 {
        /// Logging is disabled
        case none = 255
        /// All logs are monitored.
        case verbose = 0
        /// Only debug logs and of higher importance are logged.
        case debug = 1
        /// Only info logs and of higher importance are logged.
        case info = 2
        /// Only warning logs and of higher importance are logged.
        case warning = 3
        /// Only error logs and of higher importance are logged.
        case error = 4
    }

    /**
     * Set new log level.
     * - Parameter logLevel: New log level to be applied.
     */
    public static func setLogLevel(_ logLevel: LogLevel) {
        currentLogLevel = logLevel
    }

    /**
     * Get current log level.
     * - Returns: Currently set log level.
     */
    public static func getLogLevel() -> LogLevel {
        return currentLogLevel
    }

    fileprivate static func tag(with logLevel: LogLevel) -> String {
        let prefix: String

        switch logLevel {
        case .none:
            prefix = "[RxBLEKit|NONE|"
        case .verbose:
            prefix = "[RxBLEKit|VERB|"
        case .debug:
            prefix = "[RxBLEKit|DEBG|"
        case .info:
            prefix = "[RxBLEKit|INFO|"
        case .warning:
            prefix = "[RxBLEKit|WARN|"
        case .error:
            prefix = "[RxBLEKit|ERRO|"
        }
        let time = Date().timeIntervalSinceReferenceDate
        return prefix + String(format: "%02.0f:%02.0f:%02.0f.%03.f]:",
                               floor(time / 3600.0).truncatingRemainder(dividingBy: 24),
                               floor(time / 60.0).truncatingRemainder(dividingBy: 60),
                               floor(time).truncatingRemainder(dividingBy: 60),
                               floor(time * 1000).truncatingRemainder(dividingBy: 1000))
    }

    fileprivate static func log(with logLevel: LogLevel, message: @autoclosure () -> String) {
        if currentLogLevel <= logLevel {
            let string = "\(tag(with: logLevel)) \(message())"
            subject.onNext(string)
            print(string)
        }
    }

    static func v(_ message: @autoclosure () -> String) {
        log(with: .verbose, message: message)
    }

    static func d(_ message: @autoclosure () -> String) {
        log(with: .debug, message: message)
    }

    static func i(_ message: @autoclosure () -> String) {
        log(with: .info, message: message)
    }

    static func w(_ message: @autoclosure () -> String) {
        log(with: .warning, message: message)
    }

    static func e(_ message: @autoclosure () -> String) {
        log(with: .error, message: message)
    }
}

extension RxBluetoothKitLog.LogLevel: Comparable {
    public static func < (lhs: RxBluetoothKitLog.LogLevel, rhs: RxBluetoothKitLog.LogLevel) -> Bool {
        return lhs.rawValue < rhs.rawValue
    }

    public static func <= (lhs: RxBluetoothKitLog.LogLevel, rhs: RxBluetoothKitLog.LogLevel) -> Bool {
        return lhs.rawValue <= rhs.rawValue
    }

    public static func > (lhs: RxBluetoothKitLog.LogLevel, rhs: RxBluetoothKitLog.LogLevel) -> Bool {
        return lhs.rawValue > rhs.rawValue
    }

    public static func >= (lhs: RxBluetoothKitLog.LogLevel, rhs: RxBluetoothKitLog.LogLevel) -> Bool {
        return lhs.rawValue >= rhs.rawValue
    }

    public static func == (lhs: RxBluetoothKitLog.LogLevel, rhs: RxBluetoothKitLog.LogLevel) -> Bool {
        return lhs.rawValue == rhs.rawValue
    }
}

protocol Loggable {
    var logDescription: String { get }
}

extension Data: Loggable {
    var logDescription: String {
        return map { String(format: "%02x", $0) }.joined()
    }
}

extension BluetoothState: Loggable {
    var logDescription: String {
        switch self {
        case .unknown: return "unknown"
        case .resetting: return "resetting"
        case .unsupported: return "unsupported"
        case .unauthorized: return "unauthorized"
        case .poweredOff: return "poweredOff"
        case .poweredOn: return "poweredOn"
        }
    }
}

extension CBCharacteristicWriteType: Loggable {
    var logDescription: String {
        switch self {
        case .withResponse: return "withResponse"
        case .withoutResponse: return "withoutResponse"
        }
    }
}

extension UUID: Loggable {
    var logDescription: String {
        return uuidString
    }
}

extension CBUUID: Loggable {
    @objc var logDescription: String {
        return uuidString
    }
}

extension CBCentralManager: Loggable {
    @objc var logDescription: String {
        return "CentralManager(\(UInt(bitPattern: ObjectIdentifier(self))))"
    }
}

extension CBPeripheral: Loggable {
    @objc var logDescription: String {
        return "Peripheral(uuid: \(value(forKey: "identifier") as! NSUUID as UUID), name: \(String(describing: name)))"
    }
}

extension CBCharacteristic: Loggable {
    @objc var logDescription: String {
        return "Characteristic(uuid: \(uuid), id: \((UInt(bitPattern: ObjectIdentifier(self)))))"
    }
}

extension CBService: Loggable {
    @objc var logDescription: String {
        return "Service(uuid: \(uuid), id: \((UInt(bitPattern: ObjectIdentifier(self)))))"
    }
}

extension CBDescriptor: Loggable {
    @objc var logDescription: String {
        return "Descriptor(uuid: \(uuid), id: \((UInt(bitPattern: ObjectIdentifier(self)))))"
    }
}

extension Array where Element: Loggable {
    var logDescription: String {
        return "[\(map { $0.logDescription }.joined(separator: ", "))]"
    }
}

extension Reactive where Base == RxBluetoothKitLog {
    /**
     * This is continuous value, which emits before a log is printed to standard output.
     *
     * - it never fails
     * - it delivers events on `MainScheduler.instance`
     * - `share(scope: .whileConnected)` sharing strategy
     */
    public var log: Observable<String> {
        return RxBluetoothKitLog.subject.asObserver()
            .observeOn(MainScheduler.instance)
            .catchErrorJustReturn("")
            .share(scope: .whileConnected)
    }
}
