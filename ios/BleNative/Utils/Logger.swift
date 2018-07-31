import Foundation

enum LogLevel: Int {
    case none
    case verbose
    case debug
    case info
    case warning
    case error
}

class Logger {
    static private(set) var logLevel: LogLevel = .none
    static var tag: String = "BleNative"
    
    
    static func changeLevel(levelString: String) {
        guard let level = LogLevel(levelString: levelString) else {
            fatalError("Could not create log level for string: \(levelString)")
        }
        self.logLevel = level
    }
    
    private static func log(with logLevel: LogLevel, message: @autoclosure () -> String) {
        if logLevel >= self.logLevel {
            let string = "\(tag(with: logLevel)) \(message())"
            print(string)
        }
    }
    
    private static func tag(with logLevel: LogLevel) -> String {
        let prefix: String
        
        switch logLevel {
        case .none:
            prefix = "[\(tag)|NONE|"
        case .verbose:
            prefix = "[\(tag)|VERB|"
        case .debug:
            prefix = "[\(tag)|DEBG|"
        case .info:
            prefix = "[\(tag)|INFO|"
        case .warning:
            prefix = "[\(tag)|WARN|"
        case .error:
            prefix = "[\(tag)|ERRO|"
        }
        let time = Date().timeIntervalSinceReferenceDate
        return prefix + String(format: "%02.0f:%02.0f:%02.0f.%03.f]:",
                               floor(time / 3600.0).truncatingRemainder(dividingBy: 24),
                               floor(time / 60.0).truncatingRemainder(dividingBy: 60),
                               floor(time).truncatingRemainder(dividingBy: 60),
                               floor(time * 1000).truncatingRemainder(dividingBy: 1000))
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

extension LogLevel: Comparable {
    public static func < (lhs: LogLevel, rhs: LogLevel) -> Bool {
        return lhs.rawValue < rhs.rawValue
    }
    
    public static func <= (lhs: LogLevel, rhs: LogLevel) -> Bool {
        return lhs.rawValue <= rhs.rawValue
    }
    
    public static func > (lhs: LogLevel, rhs: LogLevel) -> Bool {
        return lhs.rawValue > rhs.rawValue
    }
    
    public static func >= (lhs: LogLevel, rhs: LogLevel) -> Bool {
        return lhs.rawValue >= rhs.rawValue
    }
    
    public static func == (lhs: LogLevel, rhs: LogLevel) -> Bool {
        return lhs.rawValue == rhs.rawValue
    }
}

extension LogLevel: CustomStringConvertible {
    init?(levelString: String) {
        switch levelString {
        case "None":
            self = .none
        case "Verbose":
            self = .verbose
        case "Debug":
            self = .debug
        case "Info":
            self = .info
        case "Warning":
            self = .warning
        case "Error":
            self = .error
        default:
            return nil
        }
    }
    
    var description: String {
        switch self {
        case .none: return "None"
        case .verbose: return "Verbose"
        case .debug: return "Debug"
        case .info: return "Info"
        case .warning: return "Warning"
        case .error: return "Error"
        }
    }
}
