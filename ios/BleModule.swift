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
  
  // TODO: add timeout mechanism
  
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
    peripheralWithIdentifier(deviceIdentifier)
      .flatMap { $0.connect() }
      .subscribe(onNext: { peripheral in
          resolve(NSNumber(bool: true))
        }, onError: { error in
          let bleError = error as? BluetoothError ?? BluetoothError.BluetoothUnsupported
          reject("Connection Error", "Couldn't connect to peripheral: \(deviceIdentifier)", bleError.error)
      });
  }
  
  @objc
  func closeConnection(deviceIdentifier: String,
                       callback: RCTResponseSenderBlock) {
    
  }
  
  @objc
  func discoverServices(deviceIdentifier: String,
                        resolver resolve: RCTPromiseResolveBlock,
                        rejecter reject: RCTPromiseRejectBlock) {
    // TODO: Timeouts? Cancel dicrovery??
    peripheralWithIdentifier(deviceIdentifier)
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
                           resolver resolve: RCTPromiseResolveBlock,
                           rejecter reject: RCTPromiseRejectBlock) {
    
      characteristicForPeripherial(deviceIdentifier, serviceIdentifier: serviceIdentifier, characteristicIdentifier: characteristicIdentifier)
        .subscribeNext { characteristic in
            // TODO Return some information if write is success or error
            // TODO: convert using UTF
            guard let data = valueBase64.dataUsingEncoding(0) else { return }
          characteristic.writeValue(data, type: .WithResponse)
                      .subscribe { event in
                        switch(event) {
                        case .Next:
                          break;
                        case .Completed:
                          resolve(NSNumber(bool: true))
                          break;
                        case let .Error(error):
                          self.callRecectWithError(reject, error: error)
                          break;
                        }
                      }
          }
    
  }
  
  @objc
  func readCharacteristic(deviceIdentifier: String, characteristicIdentifier: String) {
    
  }
  
  @objc
  func setNotification(deviceIdentifier: String, characteristicIdentifier: String, enable: Bool) {
  
  }
  
  func callRecectWithError(reject: RCTPromiseRejectBlock, error: ErrorType) {
    reject("Erro", "Message", error.toNSError())
  }

}