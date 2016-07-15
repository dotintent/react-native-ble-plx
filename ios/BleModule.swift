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

  // MARK: Private interface

  func dispatchEvent(type: BleClientEvent, value: AnyObject) {
      bridge.eventDispatcher().sendDeviceEventWithName(type.id(), body: value)
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
  func stopScanBleDevices() {
    scanSubscription.disposable = NopDisposable.instance
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
                           resolver resolve: RCTPromiseResolveBlock,
                           rejecter reject: RCTPromiseRejectBlock) {
    
      _ = characteristicForPeripherial(deviceIdentifier, serviceIdentifier: serviceIdentifier, characteristicIdentifier: characteristicIdentifier)
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
  }
  
  @objc
  func readCharacteristic(deviceIdentifier: String,
                          serviceIdentifier: String,
                          characteristicIdentifier: String,
                          resolver resolve: RCTPromiseResolveBlock,
                          rejecter reject: RCTPromiseRejectBlock) {
      _ = characteristicForPeripherial(deviceIdentifier, serviceIdentifier: serviceIdentifier, characteristicIdentifier: characteristicIdentifier)
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
  }
  
  @objc
  func setNotification(deviceIdentifier: String, characteristicIdentifier: String, enable: Bool) {
  
  }
  
  func callRecectWithError(reject: RCTPromiseRejectBlock, error: ErrorType) {
    reject("Error", "Message", error.toNSError())
  }

}