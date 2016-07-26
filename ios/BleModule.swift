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

@objc(BleClientManager)
class BleClientManager : RCTEventEmitter {

  private var manager : BluetoothManager!
  private var connectedDevices = Dictionary<String, Peripheral>()
  
  // TODO: add timeout mechanism

  // Disposables
  private var scanSubscription = SerialDisposable()
  private var connectingDevices = DisposableMap()
  private var operationsInProgress = DisposableMap()

  // MARK: Public interface

  // React functions --------------------------

  /// Module name
  override class func moduleName() -> String {
    return "BleClientManager"
  }

  /// Global variables visible by user of BLE module
  override func constantsToExport() -> [String : AnyObject]! {
    var dictionary = [String:AnyObject]()
    for event in BleEvent.supportedEvents {
      dictionary[event.name] = event.id
    }
    return dictionary
  }

  /// List of all supported events to which user can register
  override func supportedEvents() -> [String]! {
    return BleEvent.supportedEvents.map { $0.id }
  }

  // Initialization ---------------------------

  @objc
  func createClient() {
    manager = BluetoothManager(queue: dispatch_get_main_queue())
  }

  @objc
  func destroyClient() {
    scanSubscription.disposable = NopDisposable.instance
    manager = nil
  }

  // Event observations -----------------------

  override func startObserving() {
    print("Start Observing")
  }

  override func stopObserving() {
    print("Stop Observing")
  }

  // Discovery --------------------------------

  @objc
  func scanBleDevices(filteredUUIDs: [String]?) {
    var uuids: [CBUUID]? = nil
    if let filteredUUIDs = filteredUUIDs {
      guard let cbuuids = filteredUUIDs.toCBUUIDS() else {
        self.dispatchEvent(.scan, value: BleError.invalidUUIDs(filteredUUIDs).toJSResult)
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
        self.dispatchEvent(.scan, value: errorType.bleError.toJSResult)
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

    var peripheral: Peripheral? = nil
    guard let nsuuid = NSUUID(UUIDString: deviceIdentifier) else {
      BleError.invalidUUID(deviceIdentifier).callReject(reject)
      return
    }

    let connectionDisp = manager.retrievePeripheralsWithIdentifiers([nsuuid])
      .flatMap { devices -> Observable<Peripheral> in
        guard let device = devices.first else {
          return Observable.error(BleError.peripheralNotFound(deviceIdentifier))
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
          error.bleError.callReject(reject)
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
                       resolver resolve: RCTPromiseResolveBlock,
                       rejecter reject: RCTPromiseRejectBlock) {
    if let device = connectedDevices[deviceIdentifier] {
      _ = device.cancelConnection()
        .subscribe(
          onNext: nil,
          onError: { error in
            error.bleError.callReject(reject)
          },
          onCompleted: {
            resolve(deviceIdentifier)
          },
          onDisposed: {
            self.connectedDevices[deviceIdentifier] = nil
          }
      );
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
      BleError.peripheralNotConnected(deviceIdentifier).callReject(reject)
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
      BleError.peripheralNotConnected(deviceIdentifier).callReject(reject)
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
  func detailsForCharacteristic(deviceIdentifier: String,
                                serviceIdentifier: String,
                                characteristicIdentifier: String,
                                resolver resolve: RCTPromiseResolveBlock,
                                rejecter reject: RCTPromiseRejectBlock) {
    
    guard let device = connectedDevices[deviceIdentifier] else {
      BleError.peripheralNotConnected(deviceIdentifier).callReject(reject)
      return
    }
    
    let service = device.services?.filter {
      serviceIdentifier.caseInsensitiveCompare($0.UUID.UUIDString) == .OrderedSame
    }.first
    
    guard let characteristic = (service?.characteristics?
        .filter { characteristicIdentifier.caseInsensitiveCompare($0.UUID.UUIDString) == .OrderedSame }
        .first)
    else {
      BleError.characteristicNotFound(characteristicIdentifier).callReject(reject)
      return
    }
    
    var result =  Dictionary<String, AnyObject>()
    result["isWritable"] = characteristic.properties.contains(.Write)
    result["isReadable"] = characteristic.properties.contains(.Read)
    result["isNotifiable"] = characteristic.properties.contains(.Notify)
    result["uuid"] = characteristic.UUID.UUIDString
    
    resolve(result)
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
        guard let data = NSData(base64EncodedString: valueBase64, options: .IgnoreUnknownCharacters) else {
          return Observable.error(BleError.invalidWriteDataForCharacteristic(characteristicIdentifier, data: valueBase64))
        }
        return characteristic.writeValue(data, type: .WithResponse)
      }
      .subscribe(
        onNext: nil,
        onError: { error in
          error.bleError.callReject(reject)
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
        onNext: { characteristic in
          valueBase64 = characteristic.value?.base64EncodedStringWithOptions(.EncodingEndLineWithCarriageReturn)
        },
        onError: { error in
          error.bleError.callReject(reject)
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

  private func dispatchEvent(type: BleEvent, value: AnyObject) {
      sendEventWithName(type.id, body: value)
  }

  private func characteristicObservable(deviceIdentifier: String,
                                        serviceIdentifier: String,
                                        characteristicIdentifier: String) -> Observable<Characteristic> {
    return Observable.deferred {
      guard let device = self.connectedDevices[deviceIdentifier] else {
        return Observable.error(BleError.peripheralNotConnected(deviceIdentifier))
      }

      let characteristics = device.services?
        .filter { serviceIdentifier.caseInsensitiveCompare($0.UUID.UUIDString) == .OrderedSame }
        .flatMap { $0.characteristics ?? [] }
        .filter { characteristicIdentifier.caseInsensitiveCompare($0.UUID.UUIDString) == .OrderedSame } ?? []

      if characteristics.isEmpty {
        return Observable.error(BleError.characteristicNotFound(characteristicIdentifier))
      }

      return Observable.from(Observable.just(characteristics))
    }
  }
}