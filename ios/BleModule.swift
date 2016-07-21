//
//  BleModule.swift
//  EmptyProject
//
//  Created by Konrad Rodzik on 7/4/16.
//

import Foundation
import CoreBluetooth
import RxBluetoothKit
import RxSwift

protocol CustomErrorConvertible {
  var error: NSError { get }
}

// TODO: better error handling
extension BluetoothError : CustomErrorConvertible {
  public var error: NSError {
    var code : Int
    switch self {
    case .BluetoothInUnknownState:
        code = 12
    default:
        code = 123
    }
    return NSError(domain: "BluetoothError", code: code, userInfo: ["description" : self.description])
  }
}

// TODO: Handle all types of error types
extension ErrorType {
  func toNSError() -> NSError {
    return (self as? BluetoothError ?? BluetoothError.BluetoothUnsupported).error
  }
}

// All events dispatched by BleClientManager
enum BleClientEvent: String {
  case scan = "ScanEvent"

  func name() -> String {
    return rawValue
  }
  func id() -> String {
    return "BleClientManager" + rawValue
  }
}

class DisposableMap {
  private var disposables = Dictionary<String, Disposable>()

  func replaceDisposable(key: String, disposable: Disposable?) {
    disposables[key]?.dispose()
    disposables[key] = disposable
  }

  func removeDisposable(key: String) {
    replaceDisposable(key, disposable: nil)
  }
}

@objc(BleClientManager)
class BleClientManager : NSObject {
  
  @objc
  var methodQueue: dispatch_queue_t!
  var bridge: RCTBridge!
  
  private var manager : BluetoothManager!
  private var connectedDevices = Dictionary<String, Peripheral>()
  
  // TODO: add timeout mechanism

  // Disposables
  private var scanSubscription = SerialDisposable()
  private var connectingDevices = DisposableMap()
  private var operationsInProgress = DisposableMap()

  // MARK: Public interface

  class func moduleName() -> String {
    return "BleClientManager"
  }

  @objc
  var constantsToExport : NSDictionary {
    let dictionary = NSMutableDictionary()
    let addEvent = { (event: BleClientEvent) in
      dictionary.setObject(event.id(), forKey: event.name())
    }
    addEvent(.scan)
    return dictionary
  }

  @objc
  func createClient() {
    manager = BluetoothManager(queue: methodQueue)
  }

  @objc
  func destroyClient() {
    scanSubscription.disposable = NopDisposable.instance
    manager = nil
  }


  // Discovery --------------------------------

  @objc
  func scanBleDevices(filteredUUIDs: [String]?) {
    var uuids: [CBUUID]? = nil
    if let filteredUUIDs = filteredUUIDs {
      guard let cbuuids = filteredUUIDs.toCBUUIDS() else {
        self.dispatchEvent(.scan, value: [self.error("Scan error", message: "Invalid UUID were passed as an argument", code: 0)])
        return
      }
      uuids = cbuuids
    }

    scanSubscription.disposable = manager.rx_state
      .filter { $0 == .PoweredOn }
      .take(1)
      .flatMap { _ in self.manager.scanForPeripherals(uuids) }
      .subscribe(onNext: { scannedPeripheral in
        let peripheral = [
          "uuid": scannedPeripheral.peripheral.identifier.UUIDString,
          "name": scannedPeripheral.advertisementData.localName ?? NSNull(),
          "rssi": scannedPeripheral.RSSI
        ]
        self.dispatchEvent(.scan, value: [NSNull(), peripheral])
      }, onError: { errorType in
        // TODO: Check error
        self.dispatchEvent(.scan, value: [self.error("Scan error", message: "Error occurred during scanning", code: 0)])
      })
  }
  
  @objc
  func stopScanBleDevices() {
    scanSubscription.disposable = NopDisposable.instance
  }

  // Connections state --------------------------------

  @objc
  func establishConnection(deviceIdentifier: String,
                           resolver resolve: RCTPromiseResolveBlock,
                           rejecter reject: RCTPromiseRejectBlock) {
    // TODO: handle disposabe/tieout whatever
    // TODO: handle multiple concurent connections
    var peripheral: Peripheral? = nil
    guard let nsuuid = NSUUID(UUIDString: deviceIdentifier) else {
      // TODO: Error
      callRejectWithError(reject, error: BluetoothError.BluetoothUnsupported.toNSError())
      return
    }

    let connectionDisp = manager.retrievePeripheralsWithIdentifiers([nsuuid])
      .flatMap { devices -> Observable<Peripheral> in
        guard let device = devices.first else {
          // TODO: Error
          return Observable.error(BluetoothError.BluetoothUnsupported)
        }
        return Observable.just(device)
      }
      .flatMap { $0.connect() }
      .doOnNext { peripheral = $0 }
      .flatMap { Observable.from($0.discoverServices(nil)) }
      .flatMap { Observable.from($0.discoverCharacteristics(nil))}
      .subscribe(
        onNext: nil,
        onError: { error in
          peripheral?.cancelConnection()
          self.callRejectWithError(reject, error: error)
        },
        onCompleted: {
          self.connectedDevices[deviceIdentifier] = peripheral
          resolve(deviceIdentifier)
        },
        onDisposed: {
          self.connectingDevices.removeDisposable(deviceIdentifier)
        }
      );

    connectingDevices.replaceDisposable(deviceIdentifier, disposable: connectionDisp)
  }

  @objc
  func closeConnection(deviceIdentifier: String,
                       callback: RCTResponseSenderBlock) {
    if let device = connectedDevices[deviceIdentifier] {
      _ = device.cancelConnection()
        .subscribe(
          onNext: nil,
          onError: { callback([$0.toNSError(), deviceIdentifier]) },
          onCompleted: {
            self.connectedDevices[deviceIdentifier] = nil
            callback([NSNull(), deviceIdentifier])
          })
    } else {
      connectingDevices.removeDisposable(deviceIdentifier)
    }
  }

  // Services and characteristics -----------------------------------

  @objc
  func serviceIdsForDevice(deviceIdentifier: String,
                         resolver resolve: RCTPromiseResolveBlock,
                         rejecter reject: RCTPromiseRejectBlock) {
    guard let device = connectedDevices[deviceIdentifier] else {
      // TODO handle error
      self.callRejectWithError(reject, error: BluetoothError.BluetoothUnsupported.toNSError())
      return
    }

    let serviceUUIDs = device.services?.map { $0.UUID.UUIDString } ?? []
    resolve(serviceUUIDs)
  }

  @objc
  func characteristicIdsForDevice(deviceIdentifier: String,
                                serviceIdentifier: String,
                                resolver resolve: RCTPromiseResolveBlock,
                                rejecter reject: RCTPromiseRejectBlock) {
    guard let device = connectedDevices[deviceIdentifier] else {
      // TODO handle error
      self.callRejectWithError(reject, error: BluetoothError.BluetoothUnsupported.toNSError())
      return
    }

    let serviceUUIDs = device.services?.filter {
      serviceIdentifier.caseInsensitiveCompare($0.UUID.UUIDString) == .OrderedSame
    } ?? []

    let characteristicsUUIDs = serviceUUIDs
      .flatMap { $0.characteristics ?? [] }
      .map { $0.UUID.UUIDString }

    resolve(characteristicsUUIDs)
  }

  @objc
  func writeCharacteristic(deviceIdentifier: String,
                           serviceIdentifier: String,
                           characteristicIdentifier: String,
                           valueBase64: String,
                           transactionId: String,
                           resolver resolve: RCTPromiseResolveBlock,
                                    rejecter reject: RCTPromiseRejectBlock) {

   let writeDisp = characteristicObservable(deviceIdentifier,
                                            serviceIdentifier: serviceIdentifier,
                                            characteristicIdentifier: characteristicIdentifier)
      .flatMap { characteristic -> Observable<Characteristic> in
        // TODO: return diffrent error
        guard let data = NSData(base64EncodedString: valueBase64, options: .IgnoreUnknownCharacters) else {
          return Observable.error(BluetoothError.BluetoothUnsupported)
        }
        return characteristic.writeValue(data, type: .WithResponse)
      }
      .subscribe(
        onNext: nil,
        onError: { error in
          self.callRejectWithError(reject, error: error)
        },
        onCompleted: {
          resolve(valueBase64)
        },
        onDisposed: {
          self.operationsInProgress.removeDisposable(transactionId)
      })

    operationsInProgress.replaceDisposable(transactionId, disposable: writeDisp)
  }

  @objc
  func readCharacteristic(deviceIdentifier: String,
                          serviceIdentifier: String,
                          characteristicIdentifier: String,
                          transactionId: String,
                          resolver resolve: RCTPromiseResolveBlock,
                                   rejecter reject: RCTPromiseRejectBlock) {

    var valueBase64: String?
    let readDisp = characteristicObservable(deviceIdentifier,
                                            serviceIdentifier: serviceIdentifier,
                                            characteristicIdentifier: characteristicIdentifier)
      .flatMap { $0.readValue() }
      .subscribe(
        onNext: { (characteristic: Characteristic) in
          valueBase64 = characteristic.value?.base64EncodedStringWithOptions(.EncodingEndLineWithCarriageReturn)
        },
        onError: { error in
          self.callRejectWithError(reject, error: error)
        },
        onCompleted: {
          resolve(valueBase64 ?? "")
        },
        onDisposed: {
          self.operationsInProgress.removeDisposable(transactionId)
      })

    operationsInProgress.replaceDisposable(transactionId, disposable: readDisp)
  }

  // MARK: Private interface ------------------------------------------------------------------------------------------

  private func dispatchEvent(type: BleClientEvent, value: AnyObject) {
    if (bridge.valid) {
      bridge.eventDispatcher().sendDeviceEventWithName(type.id(), body: value)
    }
  }

  private func error(name: String, message: String, code: Int) -> NSDictionary {
    return [
      "name": name,
      "message": message,
      "code": code
    ]
  }

  private func callRejectWithError(reject: RCTPromiseRejectBlock, error: ErrorType) {
    reject("Error", "Message", error.toNSError())
  }

  private func characteristicObservable(deviceIdentifier: String,
                                        serviceIdentifier: String,
                                        characteristicIdentifier: String) -> Observable<Characteristic> {
    return Observable.deferred {
      guard let device = self.connectedDevices[deviceIdentifier] else {
        return Observable.error(BluetoothError.BluetoothUnsupported)
      }

      let characteristics = device.services?
        .filter { serviceIdentifier.caseInsensitiveCompare($0.UUID.UUIDString) == .OrderedSame }
        .flatMap { $0.characteristics ?? [] }
        .filter { characteristicIdentifier.caseInsensitiveCompare($0.UUID.UUIDString) == .OrderedSame } ?? []

      return Observable.from(Observable.just(characteristics))
    }
  }
}