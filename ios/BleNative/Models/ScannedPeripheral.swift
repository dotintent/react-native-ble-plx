import Foundation
import CoreBluetooth

struct ScannedPeripheral {
    let peripheral: CBPeripheral
    let advertisementData: [String: Any]
    let rssi: NSNumber
}
