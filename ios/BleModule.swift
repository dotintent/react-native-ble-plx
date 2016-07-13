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

@objc(BleClientManager)
class BleClientManager : NSObject {
  
  class func moduleName() -> String {
    return "BleClientManager"
  }
  
  @objc
  var methodQueue: dispatch_queue_t!
  
  var bridge: RCTBridge!
  
  private var manager : BluetoothManager!
  private var scanSubscription: Disposable?
  private var scheduler: ConcurrentDispatchQueueScheduler!
  
  private var connectingDevices = Dictionary<String, Disposable>()
  private var writeTransactions = Dictionary<String, Disposable>()
  private var readTransactions = Dictionary<String, Disposable>()
  
  // TODO: add timeout mechanism
  
  func generateTransactionId() -> String {
      let transactionId = NSUUID().UUIDString
      return transactionId
  }
  
  @objc
  func createClient() {
    manager = BluetoothManager(queue: methodQueue) // We are using method queue created for this react module
    let timerQueue = dispatch_queue_create("com.polidea.rxbluetoothkit.timer", nil)
    scheduler = ConcurrentDispatchQueueScheduler(queue: timerQueue)
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
  
  func serviceForPeripherial(deviceIdentifier: String, serviceIdentifier: String) -> Observable<Service> {
      return peripheralWithIdentifier(deviceIdentifier).flatMap {
        Observable.from($0.discoverServices([CBUUID(string: serviceIdentifier)]))
    }
  }
  
  func characteristicForPeripherial(deviceIdentifier: String, serviceIdentifier: String, characteristicIdentifier: String) -> Observable<Characteristic> {
      return serviceForPeripherial(deviceIdentifier, serviceIdentifier: serviceIdentifier).flatMap {
        Observable.from($0.discoverCharacteristics([CBUUID(string: characteristicIdentifier)]))
      }
  }
  
  @objc
  func scanBleDevices(callback: RCTResponseSenderBlock) {
    
    scanSubscription = manager.rx_state
      .filter { $0 == .PoweredOn }
      .doOnNext { print("\($0.rawValue)") }
      .take(1)
      .flatMap { _ in self.manager.scanForPeripherals(nil) }
      .subscribe(onNext: {
        let result =  [
          "name": $0.advertisementData.localName != nil ? $0.advertisementData.localName! : "Undefined Name",
          "identifier" : $0.peripheral.identifier.UUIDString
        ]
        self.bridge.eventDispatcher().sendDeviceEventWithName("SCAN_RESULT", body: result)
        
        }, onError: { error in
      })
  }
  
  @objc
  func stopScanBleDevices() {
    scanSubscription?.dispose();
  }
  
  @objc
  func establishConnection(deviceIdentifier: String,
                           resolver resolve: RCTPromiseResolveBlock,
                           rejecter reject: RCTPromiseRejectBlock) {
      // TODO: handle disposabe/tieout whatever
      // TODO: handle multiple concurent connections
      let connectionDisp = peripheralWithIdentifier(deviceIdentifier)
      .flatMap { $0.connect() }
      .subscribe(onNext: { peripheral in
          self.connectingDevices.removeValueForKey(deviceIdentifier)
          resolve(NSNumber(bool: true))
        }, onError: { error in
          self.connectingDevices.removeValueForKey(deviceIdentifier)
          let bleError = error as? BluetoothError ?? BluetoothError.BluetoothUnsupported
          reject("Connection Error", "Couldn't connect to peripheral: \(deviceIdentifier)", bleError.error)
      });
    
      self.connectingDevices[deviceIdentifier] = connectionDisp
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
  func discoverServices(deviceIdentifier: String,
                        resolver resolve: RCTPromiseResolveBlock,
                        rejecter reject: RCTPromiseRejectBlock) {
    // TODO: Timeouts? Cancel dicrovery??
    _ = peripheralWithIdentifier(deviceIdentifier)
      .flatMap { Observable.from($0.discoverServices(nil)) }
      .flatMap { $0.discoverCharacteristics(nil) }
      .subscribe { event in
        switch (event) {
        case .Next:
          break
        case .Completed:
          resolve(nil)
        case let .Error(error):
          self.callRecectWithError(reject, error: error)
        }
      }
  }
  
  @objc
  func writeCharacteristic(deviceIdentifier: String,
                           serviceIdentifier: String,
                           characteristicIdentifier: String,
                           valueBase64: String,
                           transactionCallback: RCTResponseSenderBlock,
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
      let transactionId = generateTransactionId()
      self.writeTransactions[transactionId] = writeDisp
      transactionCallback([NSNull(), transactionId])
  }
  
  @objc
  func cancelWriteCharacteristic(transactionId: String) -> Bool {
      guard let writeDisp = self.writeTransactions[transactionId] else { return false }
      writeDisp.dispose()
      return true;
  }
  
  @objc
  func readCharacteristic(deviceIdentifier: String,
                          serviceIdentifier: String,
                          characteristicIdentifier: String,
                          transactionCallback: RCTResponseSenderBlock,
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
    
      let transactionId = generateTransactionId()
      self.readTransactions[transactionId] = readDisp
      transactionCallback([NSNull(), transactionId])
  }
  
  @objc
  func cancelReadCharacteristic(transactionId: String) -> Bool {
      guard let readDisp = self.readTransactions[transactionId] else { return false }
      readDisp.dispose();
      return true;
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