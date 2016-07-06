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

@objc(BleClientManager)
class BleClientManager : NSObject {
  
  var bridge: RCTBridge!
  
  private var manager : BluetoothManager!
  private var scanSubscription: Disposable?
  private var scheduler: ConcurrentDispatchQueueScheduler!
  
  @objc
  func createClient() {
    manager = BluetoothManager(queue: dispatch_get_main_queue())
    let timerQueue = dispatch_queue_create("com.polidea.rxbluetoothkit.timer", nil)
    scheduler = ConcurrentDispatchQueueScheduler(queue: timerQueue)
  }
  
  @objc
  func scanBleDevices(callback: RCTResponseSenderBlock) {
    
    scanSubscription = manager.rx_state
      .timeout(4.0, scheduler: scheduler)
      .take(1)
      .flatMap { _ in self.manager.scanForPeripherals(nil, options:nil) }
      .subscribeOn(MainScheduler.instance)
      .subscribe(onNext: {
        let result =  [
          "name": $0.advertisementData.localName != nil ? $0.advertisementData.localName! : "Undefined Name",
          "identifier" : $0.peripheral.identifier.UUIDString
        ]
        self.bridge.eventDispatcher().sendDeviceEventWithName("TEST_EVENT", body: result)
        
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
    manager
      .retrievePeripheralsWithIdentifiers([NSUUID(UUIDBytes: deviceIdentifier)])
      .subscribeOn(MainScheduler.instance)
      .timeout(4.0, scheduler: scheduler)
      .subscribe(onNext: { peripheral in
          // TODO: establish connection with peripheral
          resolve(NSNumber(bool: true))
        }, onError: { error in
          
      }).dispose() // TODO: store subscription and cancell it later?
    
    
  }
  
  
  @objc
  func writeCharacteristic(deviceIdentifier: String, characteristicIdentifier: String, valueBase64: String) {
    
  }
  
  @objc
  func readCharacteristic(deviceIdentifier: String, characteristicIdentifier: String) {
    
  }

}