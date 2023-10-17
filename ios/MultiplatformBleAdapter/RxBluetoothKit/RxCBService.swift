import Foundation
import CoreBluetooth

class RxCBService: RxServiceType {

    let service: CBService
    init(service: CBService) {
        self.service = service
    }

    init?(service: CBService?) {
        guard let service = service else {
            return nil
        }
        self.service = service
    }

    var objectId: UInt {
        return UInt(bitPattern: ObjectIdentifier(service))
    }

    var uuid: CBUUID {
        return service.uuid
    }

    var characteristics: [RxCharacteristicType]? {
        return service.characteristics?.compactMap(RxCBCharacteristic.init)
    }

    var includedServices: [RxServiceType]? {
        return service.includedServices?.compactMap(RxCBService.init)
    }

    var isPrimary: Bool {
        return service.isPrimary
    }

    func isEqualTo(service: RxServiceType) -> Bool {
        guard let rhs = service as? RxCBService else { return false }
        return self.service === rhs.service
    }
}
