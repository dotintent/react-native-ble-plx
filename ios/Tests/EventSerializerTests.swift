import XCTest
import CoreBluetooth
@testable import BlePlx

/// Tests for EventSerializer — CoreBluetooth object → Sendable snapshot → dictionary.
///
/// EventSerializer doesn't accept CBPeripheral directly in the parts we test
/// (PeripheralSnapshot, CharacteristicSnapshot, ScanResultSnapshot toDictionary),
/// so many tests work entirely with the concrete structs returned by the
/// serializer helpers and verify the resulting dictionaries.
final class EventSerializerTests: XCTestCase {

    // MARK: - PeripheralSnapshot.toDictionary

    func testPeripheralSnapshotHasIdKey() {
        let snapshot = makePeripheralSnapshot(id: "AABB-CCDD")
        let dict = snapshot.toDictionary()
        XCTAssertEqual(dict["id"] as? String, "AABB-CCDD")
    }

    func testPeripheralSnapshotHasNameKey() {
        let snapshot = makePeripheralSnapshot(name: "HeartMonitor")
        let dict = snapshot.toDictionary()
        XCTAssertEqual(dict["name"] as? String, "HeartMonitor")
    }

    func testPeripheralSnapshotNameIsNilWhenNotProvided() {
        let snapshot = makePeripheralSnapshot(name: nil)
        let dict = snapshot.toDictionary()
        // The dict stores nil as Any, so the value is present but nil
        XCTAssertTrue(dict.keys.contains("name"), "name key must always be present")
        XCTAssertNil(dict["name"] as? String)
    }

    func testPeripheralSnapshotHasRssi() {
        let snapshot = makePeripheralSnapshot(rssi: -72)
        let dict = snapshot.toDictionary()
        XCTAssertEqual(dict["rssi"] as? Int, -72)
    }

    func testPeripheralSnapshotHasMtu() {
        let snapshot = makePeripheralSnapshot(mtu: 185)
        let dict = snapshot.toDictionary()
        XCTAssertEqual(dict["mtu"] as? Int, 185)
    }

    func testPeripheralSnapshotIsConnectableTrue() {
        let snapshot = makePeripheralSnapshot(isConnectable: true)
        let dict = snapshot.toDictionary()
        XCTAssertEqual(dict["isConnectable"] as? Bool, true)
    }

    func testPeripheralSnapshotIsConnectableNilWhenNotSet() {
        let snapshot = makePeripheralSnapshot(isConnectable: nil)
        let dict = snapshot.toDictionary()
        XCTAssertTrue(dict.keys.contains("isConnectable"))
        XCTAssertNil(dict["isConnectable"] as? Bool)
    }

    func testPeripheralSnapshotServiceUuidsArePresent() {
        let uuids = ["180D", "180F"]
        let snapshot = makePeripheralSnapshot(serviceUuids: uuids)
        let dict = snapshot.toDictionary()
        XCTAssertEqual(dict["serviceUuids"] as? [String], uuids)
    }

    func testPeripheralSnapshotEmptyServiceUuids() {
        let snapshot = makePeripheralSnapshot(serviceUuids: [])
        let dict = snapshot.toDictionary()
        XCTAssertEqual((dict["serviceUuids"] as? [String])?.count, 0)
    }

    func testPeripheralSnapshotManufacturerDataBase64() {
        let b64 = Data([0x01, 0x02, 0x03]).base64EncodedString()
        let snapshot = makePeripheralSnapshot(manufacturerData: b64)
        let dict = snapshot.toDictionary()
        XCTAssertEqual(dict["manufacturerData"] as? String, b64)
    }

    func testPeripheralSnapshotManufacturerDataNilWhenAbsent() {
        let snapshot = makePeripheralSnapshot(manufacturerData: nil)
        let dict = snapshot.toDictionary()
        XCTAssertTrue(dict.keys.contains("manufacturerData"))
        XCTAssertNil(dict["manufacturerData"] as? String)
    }

    // MARK: - CharacteristicSnapshot.toDictionary

    func testCharacteristicSnapshotHasRequiredKeys() {
        let snapshot = makeCharacteristicSnapshot()
        let dict = snapshot.toDictionary()
        let expected = ["deviceId", "serviceUuid", "uuid", "value",
                        "isNotifying", "isIndicatable", "isReadable",
                        "isWritableWithResponse", "isWritableWithoutResponse"]
        for key in expected {
            XCTAssertTrue(dict.keys.contains(key), "Missing key: \(key)")
        }
    }

    func testCharacteristicSnapshotDeviceId() {
        let snapshot = makeCharacteristicSnapshot(deviceId: "dev-99")
        XCTAssertEqual(snapshot.toDictionary()["deviceId"] as? String, "dev-99")
    }

    func testCharacteristicSnapshotServiceUuid() {
        let snapshot = makeCharacteristicSnapshot(serviceUuid: "180A")
        XCTAssertEqual(snapshot.toDictionary()["serviceUuid"] as? String, "180A")
    }

    func testCharacteristicSnapshotUuid() {
        let snapshot = makeCharacteristicSnapshot(uuid: "2A37")
        XCTAssertEqual(snapshot.toDictionary()["uuid"] as? String, "2A37")
    }

    func testCharacteristicSnapshotValueBase64() {
        let b64 = Data([0xDE, 0xAD]).base64EncodedString()
        let snapshot = makeCharacteristicSnapshot(value: b64)
        XCTAssertEqual(snapshot.toDictionary()["value"] as? String, b64)
    }

    func testCharacteristicSnapshotValueNil() {
        let snapshot = makeCharacteristicSnapshot(value: nil)
        let dict = snapshot.toDictionary()
        XCTAssertTrue(dict.keys.contains("value"))
        XCTAssertNil(dict["value"] as? String)
    }

    func testCharacteristicSnapshotIsNotifying() {
        let snapshot = makeCharacteristicSnapshot(isNotifying: true)
        XCTAssertEqual(snapshot.toDictionary()["isNotifying"] as? Bool, true)
    }

    func testCharacteristicSnapshotIsNotNotifying() {
        let snapshot = makeCharacteristicSnapshot(isNotifying: false)
        XCTAssertEqual(snapshot.toDictionary()["isNotifying"] as? Bool, false)
    }

    func testCharacteristicSnapshotIsReadable() {
        let snapshot = makeCharacteristicSnapshot(isReadable: true)
        XCTAssertEqual(snapshot.toDictionary()["isReadable"] as? Bool, true)
    }

    func testCharacteristicSnapshotIsIndicatable() {
        let snapshot = makeCharacteristicSnapshot(isIndicatable: true)
        XCTAssertEqual(snapshot.toDictionary()["isIndicatable"] as? Bool, true)
    }

    func testCharacteristicSnapshotIsWritableWithResponse() {
        let snapshot = makeCharacteristicSnapshot(isWritableWithResponse: true)
        XCTAssertEqual(snapshot.toDictionary()["isWritableWithResponse"] as? Bool, true)
    }

    func testCharacteristicSnapshotIsWritableWithoutResponse() {
        let snapshot = makeCharacteristicSnapshot(isWritableWithoutResponse: true)
        XCTAssertEqual(snapshot.toDictionary()["isWritableWithoutResponse"] as? Bool, true)
    }

    func testCharacteristicSnapshotAllPropertiesFalseByDefault() {
        let snapshot = makeCharacteristicSnapshot()
        let dict = snapshot.toDictionary()
        XCTAssertEqual(dict["isIndicatable"] as? Bool, false)
        XCTAssertEqual(dict["isReadable"] as? Bool, false)
        XCTAssertEqual(dict["isWritableWithResponse"] as? Bool, false)
        XCTAssertEqual(dict["isWritableWithoutResponse"] as? Bool, false)
    }

    // MARK: - ScanResultSnapshot.toDictionary

    func testScanResultSnapshotHasId() {
        let snapshot = makeScanResultSnapshot(id: "scan-id-1")
        XCTAssertEqual(snapshot.toDictionary()["id"] as? String, "scan-id-1")
    }

    func testScanResultSnapshotHasName() {
        let snapshot = makeScanResultSnapshot(name: "Beacon")
        XCTAssertEqual(snapshot.toDictionary()["name"] as? String, "Beacon")
    }

    func testScanResultSnapshotNameNilWhenAbsent() {
        let snapshot = makeScanResultSnapshot(name: nil)
        let dict = snapshot.toDictionary()
        XCTAssertTrue(dict.keys.contains("name"))
        XCTAssertNil(dict["name"] as? String)
    }

    func testScanResultSnapshotHasRssi() {
        let snapshot = makeScanResultSnapshot(rssi: -55)
        XCTAssertEqual(snapshot.toDictionary()["rssi"] as? Int, -55)
    }

    func testScanResultSnapshotServiceUuids() {
        let uuids = ["180D", "1800"]
        let snapshot = makeScanResultSnapshot(serviceUuids: uuids)
        XCTAssertEqual(snapshot.toDictionary()["serviceUuids"] as? [String], uuids)
    }

    func testScanResultSnapshotEmptyServiceUuids() {
        let snapshot = makeScanResultSnapshot(serviceUuids: [])
        XCTAssertEqual((snapshot.toDictionary()["serviceUuids"] as? [String])?.count, 0)
    }

    func testScanResultSnapshotManufacturerData() {
        let b64 = Data([0xAB, 0xCD]).base64EncodedString()
        let snapshot = makeScanResultSnapshot(manufacturerData: b64)
        XCTAssertEqual(snapshot.toDictionary()["manufacturerData"] as? String, b64)
    }

    func testScanResultSnapshotManufacturerDataNil() {
        let snapshot = makeScanResultSnapshot(manufacturerData: nil)
        let dict = snapshot.toDictionary()
        XCTAssertTrue(dict.keys.contains("manufacturerData"))
        XCTAssertNil(dict["manufacturerData"] as? String)
    }

    // MARK: - EventSerializer.stateString

    func testStateStringUnknown() {
        XCTAssertEqual(EventSerializer.stateString(from: .unknown), "Unknown")
    }

    func testStateStringResetting() {
        XCTAssertEqual(EventSerializer.stateString(from: .resetting), "Resetting")
    }

    func testStateStringUnsupported() {
        XCTAssertEqual(EventSerializer.stateString(from: .unsupported), "Unsupported")
    }

    func testStateStringUnauthorized() {
        XCTAssertEqual(EventSerializer.stateString(from: .unauthorized), "Unauthorized")
    }

    func testStateStringPoweredOff() {
        XCTAssertEqual(EventSerializer.stateString(from: .poweredOff), "PoweredOff")
    }

    func testStateStringPoweredOn() {
        XCTAssertEqual(EventSerializer.stateString(from: .poweredOn), "PoweredOn")
    }

    // MARK: - Helpers

    private func makePeripheralSnapshot(
        id: String = "test-id",
        name: String? = "TestDevice",
        rssi: Int = -70,
        mtu: Int = 185,
        isConnectable: Bool? = true,
        serviceUuids: [String] = [],
        manufacturerData: String? = nil
    ) -> PeripheralSnapshot {
        return PeripheralSnapshot(
            id: id,
            name: name,
            rssi: rssi,
            mtu: mtu,
            isConnectable: isConnectable,
            serviceUuids: serviceUuids,
            manufacturerData: manufacturerData
        )
    }

    private func makeCharacteristicSnapshot(
        deviceId: String = "dev-1",
        serviceUuid: String = "180A",
        uuid: String = "2A37",
        value: String? = nil,
        isNotifying: Bool = false,
        isIndicatable: Bool = false,
        isReadable: Bool = false,
        isWritableWithResponse: Bool = false,
        isWritableWithoutResponse: Bool = false
    ) -> CharacteristicSnapshot {
        return CharacteristicSnapshot(
            deviceId: deviceId,
            serviceUuid: serviceUuid,
            uuid: uuid,
            value: value,
            isNotifying: isNotifying,
            isIndicatable: isIndicatable,
            isReadable: isReadable,
            isWritableWithResponse: isWritableWithResponse,
            isWritableWithoutResponse: isWritableWithoutResponse
        )
    }

    private func makeScanResultSnapshot(
        id: String = "scan-id",
        name: String? = "Scanner",
        rssi: Int = -65,
        serviceUuids: [String] = [],
        manufacturerData: String? = nil
    ) -> ScanResultSnapshot {
        return ScanResultSnapshot(
            id: id,
            name: name,
            rssi: rssi,
            serviceUuids: serviceUuids,
            manufacturerData: manufacturerData
        )
    }
}
