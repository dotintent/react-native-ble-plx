//
//  BleModuleBridge.m
//  EmptyProject
//
//  Created by Konrad Rodzik on 7/4/16.
//  Copyright © 2016 Facebook. All rights reserved.
//

#import <Foundation/Foundation.h>

#import "RCTBridgeModule.h"

@interface RCT_EXTERN_MODULE(BleClientManager, NSObject)

RCT_EXTERN_METHOD(createClient)
RCT_EXTERN_METHOD(destroyClient)

RCT_EXTERN_METHOD(scanBleDevices:(NSArray*)filteredUUIDs)
RCT_EXTERN_METHOD(stopScanBleDevices)

RCT_EXTERN_METHOD(establishConnection:(NSString*)deviceIdentifier
                             resolver:(RCTPromiseResolveBlock)resolve
                             rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(closeConnection:(NSString*)deviceIdentifier
                         resolver:(RCTPromiseResolveBlock)resolve
                         rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(serviceIdsForDevice:(NSString*)deviceIdentifier
                           resolver:(RCTPromiseResolveBlock)resolve
                           rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(characteristicIdsForDevice:(NSString*)deviceIdentifier
                         serviceIdentifier:(NSString*)serviceIdentifier
                                  resolver:(RCTPromiseResolveBlock)resolve
                                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(detailsForCharacteristic:(NSString*)deviceIdentifier
                         serviceIdentifier:(NSString*)serviceIdentifier
                  characteristicIdentifier:(NSString*)characteristicIdentifier
                                  resolver:(RCTPromiseResolveBlock)resolve
                                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(     writeCharacteristic:(NSString*)deviceIdentifier
                         serviceIdentifier:(NSString*)serviceIdentifier
                  characteristicIdentifier:(NSString*)characteristicIdentifier
                               valueBase64:(NSString*)valueBase64
                             transactionId:(NSString*)transactionId
                                  resolver:(RCTPromiseResolveBlock)resolve
                                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(      readCharacteristic:(NSString*)deviceIdentifier
                         serviceIdentifier:(NSString*)serviceIdentifier
                  characteristicIdentifier:(NSString*)characteristicIdentifier
                             transactionId:(NSString*)transactionId
                                  resolver:(RCTPromiseResolveBlock)resolve
                                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(cancelCharacteristicOperation:(NSString*)transactionId)

@end