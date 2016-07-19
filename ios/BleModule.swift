//
//  BleModule.swift
//  EmptyProject
//
//  Created by Konrad Rodzik on 7/4/16.
//  Copyright © 2016 Facebook. All rights reserved.
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

class TransactionDisposables {
  private var transactions = Dictionary<String, Disposable>()
  
  private func disposeOld(key: String) {
    if let disposable = self.transactions[key] {
      disposable.dispose()
    }
  }
  
  subscript(index: String) -> Disposable? {
    get {
      return self.transactions[index]
    }
    
    set(newValue) {
      disposeOld(index)
      self.transactions[index] = newValue
    }
  }
}

// Main BLE module
@objc(BleClientManager)
class BleClientManager : NSObject {

  class func moduleName() -> String {
    return "BleClientManager"
  }
  
  @objc
  var methodQueue: dispatch_queue_t!
  var bridge: RCTBridge!
  
  private var manager : BluetoothManager!
  private var scheduler: ConcurrentDispatchQueueScheduler!
  
  private var connectingDevices = TransactionDisposables()
  private var writeTransactions = TransactionDisposables()
  private var readTransactions = TransactionDisposables()
  
  private let disposeBag = DisposeBag()
  
  // TODO: add timeout mechanism

  // Scanning
  private var scanSubscription = SerialDisposable()

  // MARK: Public interface

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
    // We are using method queue created for this react module
    manager = BluetoothManager(queue: methodQueue)
    let timerQueue = dispatch_queue_create("com.polidea.rxbluetoothkit.timer", nil)
    scheduler = ConcurrentDispatchQueueScheduler(queue: timerQueue)
  }

  @objc
  func destroyClient() {
    scanSubscription.disposable = NopDisposable.instance
    scheduler = nil
    manager = nil
  }

  @objc
  func scanBleDevices() {
    // TODO: Specify UUIDs?
    scanSubscription.disposable = manager.rx_state
      .filter { $0 == .PoweredOn }
      .take(1)
      .flatMap { _ in self.manager.scanForPeripherals(nil) }
      .subscribe(onNext: { scannedPeripheral in
        let peripheral = [
          "uuid": scannedPeripheral.peripheral.identifier.UUIDString,
          "name": scannedPeripheral.advertisementData.localName ?? NSNull(),
          "rssi": scannedPeripheral.RSSI
        ]
        self.dispatchEvent(.scan, value: [NSNull(), peripheral])
      }, onError: { errorType in
        // TODO: Error type??
        self.dispatchEvent(.scan, value: [self.error("Scan error", message: "Error occurred during scanning", code: 0)])
      })
  }
  
  @objc
  func stopScanBleDevices() {
    scanSubscription.disposable = NopDisposable.instance
  }

  // MARK: Private interface

  func dispatchEvent(type: BleClientEvent, value: AnyObject) {
    if (bridge.valid) {
      bridge.eventDispatcher().sendDeviceEventWithName(type.id(), body: value)
    }
  }

  func error(name: String, message: String, code: Int) -> NSDictionary {
    return [
      "name": name,
      "message": message,
      "code": code
    ]
  }

  func peripheralWithIdentifier(uuid: String) -> Observable<Peripheral> {
    // TODO: Define error
    guard let uuid = NSUUID(UUIDString: uuid) else { return Observable.error(BluetoothError.BluetoothUnsupported) }
    return manager.retrievePeripheralsWithIdentifiers([uuid])
      .flatMap { (peripherals: [Peripheral]) -> Observable<Peripheral> in
        guard let peripheral = peripherals.first else {
          // TODO: Define error
          return Observable.error(BluetoothError.BluetoothUnsupported);
        }
        return Observable.just(peripheral)
      }
  }
  
  private func serviceForPeripherial(deviceIdentifier: String, serviceIdentifier: String) -> Observable<Service> {
      return peripheralWithIdentifier(deviceIdentifier).flatMap {
        Observable.from($0.discoverServices([CBUUID(string: serviceIdentifier)]))
    }
  }
  
  private func characteristicForPeripherial(deviceIdentifier: String, serviceIdentifier: String, characteristicIdentifier: String) -> Observable<Characteristic> {
      return serviceForPeripherial(deviceIdentifier, serviceIdentifier: serviceIdentifier).flatMap {
        Observable.from($0.discoverCharacteristics([CBUUID(string: characteristicIdentifier)]))
      }
  }
  
  private func monitorDisconnectionOfPeripheral(peripheral: Peripheral) {
    manager.monitorPeripheralDisconnection(peripheral)
      .subscribeNext { (peripheral) in
        NSLog("Peripherial Disconnected \(peripheral)")
      }.addDisposableTo(disposeBag)
  }
  

  @objc
  func establishConnection(deviceIdentifier: String,
                           resolver resolve: RCTPromiseResolveBlock,
                           rejecter reject: RCTPromiseRejectBlock) {
    // TODO: handle disposabe/tieout whatever
    // TODO: handle multiple concurent connections
    let connectionDisp = peripheralWithIdentifier(deviceIdentifier)
    .flatMap { $0.connect() }
    .flatMap { Observable.from($0.discoverServices(nil)) }
    .flatMap { Observable.from($0.discoverCharacteristics(nil))}
    .subscribe(onNext: {_ in}, onError: { error in
//      self.connectingDevices[deviceIdentifier] = nil;
      let bleError = error as? BluetoothError ?? BluetoothError.BluetoothUnsupported
      reject("Connection Error", "Couldn't connect to peripheral: \(deviceIdentifier)", bleError.error)
      self.callRecectWithError(reject, error: error)
      }, onCompleted: { peripheral in
//        self.connectingDevices[deviceIdentifier] = nil;
        resolve(NSNumber(bool: true))
      });
    
    self.connectingDevices[deviceIdentifier] = connectionDisp;
  }
  
  @objc
  func closeConnection(deviceIdentifier: String,
                       callback: RCTResponseSenderBlock) {
      _ = peripheralWithIdentifier(deviceIdentifier)
        .flatMap{ $0.cancelConnection() }
        .subscribe { event in
          switch(event) {
          case .Next:
            break;
          case .Completed:
            callback([NSNull(), NSNumber(bool: true)])
            break;
          case let .Error(error):
            callback([error.toNSError(), NSNumber(bool: true)])
            break;
          }
        }
  }
  
  @objc
  func servicesForDevice(deviceIdentifier: String,
                         resolver resolve: RCTPromiseResolveBlock,
                         rejecter reject: RCTPromiseRejectBlock) {
    _ = peripheralWithIdentifier(deviceIdentifier)
    .flatMap{ $0.discoverServices(nil) }
//      .flatMap{ peripherial in return Observable.just(peripherial.services ?? []) }
      .debug()
    .map { (services: [Service]) -> [String] in
      services.map { $0.UUID.UUIDString }
    }
    .toPromise()
    .subscribe(resolve: { services in
      resolve(services)
    },
    reject: {
      self.callRecectWithError(reject, error: $0)
    })
  }
  
//  @objc
//  func characteristicsForDevice(deviceIdentifier: String,
//                                serviceIdentifier: String,
//                                resolver resolve: RCTPromiseResolveBlock,
//                                rejecter reject: RCTPromiseRejectBlock) {
//    _ = peripheralWithIdentifier(deviceIdentifier)
//    .flatMap{ $0.discoverServices([CBUUID(string: deviceIdentifier)]) }
//    .flatMap{ $0.disco }
//    .map { (characteristics: [Characteristic]) -> [String] in
//      characteristics.map {
//        return $0.UUID.UUIDString
//      }
//    }
//    .toPromise()
//    .subscribe(resolve: { characteristics in
//      resolve(characteristics)
//    },
//    reject: {
//      self.callRecectWithError(reject, error: $0)
//    })
//  }
  
  @objc
  func discoverServices(deviceIdentifier: String,
                        resolver resolve: RCTPromiseResolveBlock,
                        rejecter reject: RCTPromiseRejectBlock) {
    // TODO: Timeouts? Cancel dicrovery??
    _ = peripheralWithIdentifier(deviceIdentifier)
      .flatMap { Observable.from($0.discoverServices(nil)) }
      .flatMap { Observable.from($0.discoverCharacteristics(nil))}
      .subscribe { event in
        switch (event) {
        case .Next:
          break
        case .Completed:
          resolve(NSNumber(bool: true))
        case let .Error(error):
          self.callRecectWithError(reject, error: error)
        }
      }
  }
  
  // TODO:
  
  @objc
  func writeCharacteristic(deviceIdentifier: String,
                           serviceIdentifier: String,
                           characteristicIdentifier: String,
                           valueBase64: String,
                           transactionId: String,
                           resolver resolve: RCTPromiseResolveBlock,
                           rejecter reject: RCTPromiseRejectBlock) {
    
      let writeDisp = characteristicForPeripherial(deviceIdentifier, serviceIdentifier: serviceIdentifier, characteristicIdentifier: characteristicIdentifier)
        .flatMap { (characteristic: Characteristic) -> Observable<Characteristic> in
          // TODO: convert using UTF
          // TODO: return diffrent error
          guard let data = valueBase64.dataUsingEncoding(0) else { return Observable.error(BluetoothError.BluetoothUnsupported) }
          return characteristic.writeValue(data, type: .WithResponse)
        }
        .toPromise()
        .subscribe(resolve: { characteristic in
            resolve(valueBase64)
          },
          reject: {
            self.callRecectWithError(reject, error: $0)
          })
    
        self.writeTransactions[transactionId] = writeDisp
  }
  
  @objc
  func cancelWriteCharacteristic(transactionId: String) -> Bool {
    if let _ = self.writeTransactions[transactionId] {
      self.writeTransactions[transactionId] = nil;
      return true;
    }
    return false;
  }
  
  @objc
  func readCharacteristic(deviceIdentifier: String,
                          serviceIdentifier: String,
                          characteristicIdentifier: String,
                          transactionId: String,
                          resolver resolve: RCTPromiseResolveBlock,
                          rejecter reject: RCTPromiseRejectBlock) {
      let readDisp = characteristicForPeripherial(deviceIdentifier, serviceIdentifier: serviceIdentifier, characteristicIdentifier: characteristicIdentifier)
        .flatMap { (characteristic: Characteristic) -> Observable<Characteristic> in
            characteristic.readValue()
        }
        .toPromise()
        .subscribe(resolve: { characteristic in
            guard let dataStr = NSString(data: characteristic.value!, encoding: NSUTF8StringEncoding) else { return self.callRecectWithError(reject, error: BluetoothError.BluetoothUnsupported) }
            resolve(dataStr)
        }, reject: {
            self.callRecectWithError(reject, error: $0)
        })
    
      self.readTransactions[transactionId] = readDisp
  }
  
  @objc
  func cancelReadCharacteristic(transactionId: String) -> Bool {
    if let _ = self.readTransactions[transactionId] {
      self.readTransactions[transactionId] = nil
      return true;
    }
    return false;
  }
  
  @objc
  func setNotification(deviceIdentifier: String,
                       serviceIdentifier: String,
                       characteristicIdentifier: String,
                       enable: Bool) {
  
  }
  
  func callRecectWithError(reject: RCTPromiseRejectBlock, error: ErrorType) {
    reject("Error", "Message", error.toNSError())
  }

}