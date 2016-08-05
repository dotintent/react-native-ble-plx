//
//  BleClient.m
//  BleClient
//
//  Created by Przemysław Lenart on 27/07/16.
//  Copyright © 2016 Polidea. All rights reserved.
//

#import "BleClient.h"
@import BleClientManager;

@interface BleModule () <BleClientManagerDelegate>
@property(nonatomic) BleClientManager* manager;
@end

@implementation BleModule

RCT_EXPORT_MODULE(BleClientManager);

- (void)dispatchEvent:(NSString * _Nonnull)name value:(id _Nonnull)value {
    [self sendEventWithName:name body:value];
}

- (NSArray<NSString *> *)supportedEvents {
    // TODO: More generic
    return @[@"BleClientManagerScanEvent", @"BleClientManagerNotifyEvent"];
}

- (NSDictionary<NSString *,id> *)constantsToExport {
    // TODO: More generic
    return @{@"ScanEvent": @"BleClientManagerScanEvent", @"NotifyEvent" : @"BleClientManagerNotifyEvent"};
}

RCT_EXPORT_METHOD(createClient) {
    // TODO: Method queue
    _manager = [[BleClientManager alloc] initWithQueue:dispatch_get_main_queue()];
    _manager.delegate = self;
}

RCT_EXPORT_METHOD(destroyClient) {
    _manager = nil;
}

RCT_EXPORT_METHOD(scanBleDevices:(NSArray*)filteredUUIDs) {
    [_manager scanBleDevices:filteredUUIDs];
}

RCT_EXPORT_METHOD(stopScanBleDevices) {
    [_manager stopScanBleDevices];
}

RCT_EXPORT_METHOD(establishConnection:(NSString*)deviceIdentifier
                             resolver:(RCTPromiseResolveBlock)resolve
                             rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager establishConnection:deviceIdentifier resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(closeConnection:(NSString*)deviceIdentifier
                         resolver:(RCTPromiseResolveBlock)resolve
                         rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager closeConnection:deviceIdentifier resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(serviceIdsForDevice:(NSString*)deviceIdentifier
                             resolver:(RCTPromiseResolveBlock)resolve
                             rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager serviceIdsForDevice:deviceIdentifier resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(characteristicIdsForDevice:(NSString*)deviceIdentifier
                           serviceIdentifier:(NSString*)serviceIdentifier
                                    resolver:(RCTPromiseResolveBlock)resolve
                                    rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager characteristicIdsForDevice:deviceIdentifier
                       serviceIdentifier:serviceIdentifier
                                 resolve:resolve
                                  reject:reject];
}

RCT_EXPORT_METHOD(detailsForCharacteristic:(NSString*)deviceIdentifier
                         serviceIdentifier:(NSString*)serviceIdentifier
                  characteristicIdentifier:(NSString*)characteristicIdentifier
                                  resolver:(RCTPromiseResolveBlock)resolve
                                  rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager detailsForCharacteristic:deviceIdentifier
                     serviceIdentifier:serviceIdentifier
              characteristicIdentifier:characteristicIdentifier
                               resolve:resolve
                                reject:reject];
}

RCT_EXPORT_METHOD(     writeCharacteristic:(NSString*)deviceIdentifier
                         serviceIdentifier:(NSString*)serviceIdentifier
                  characteristicIdentifier:(NSString*)characteristicIdentifier
                               valueBase64:(NSString*)valueBase64
                             transactionId:(NSString*)transactionId
                                  resolver:(RCTPromiseResolveBlock)resolve
                                  rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager writeCharacteristic:deviceIdentifier
                serviceIdentifier:serviceIdentifier
         characteristicIdentifier:characteristicIdentifier
                      valueBase64:valueBase64
                    transactionId:transactionId
                          resolve:resolve
                           reject:reject];
}

RCT_EXPORT_METHOD(      readCharacteristic:(NSString*)deviceIdentifier
                         serviceIdentifier:(NSString*)serviceIdentifier
                  characteristicIdentifier:(NSString*)characteristicIdentifier
                             transactionId:(NSString*)transactionId
                                  resolver:(RCTPromiseResolveBlock)resolve
                                  rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager readCharacteristic:deviceIdentifier
               serviceIdentifier:serviceIdentifier
        characteristicIdentifier:characteristicIdentifier
                   transactionId:transactionId
                         resolve:resolve
                          reject:reject];
}

RCT_EXPORT_METHOD(    notifyCharacteristic:(NSString*)deviceIdentifier
                         serviceIdentifier:(NSString*)serviceIdentifier
                  characteristicIdentifier:(NSString*)characteristicIdentifier
                                    notify:(BOOL)notify
                             transactionId:(NSString*)transactionId
                                  resolver:(RCTPromiseResolveBlock)resolve
                                  rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager notifyCharacteristic:deviceIdentifier
                 serviceIdentifier:serviceIdentifier
          characteristicIdentifier:characteristicIdentifier
                            notify:notify
                     transactionId:transactionId
                           resolve:resolve
                            reject:reject];
}

RCT_EXPORT_METHOD(    monitorCharacteristic:(NSString*)deviceIdentifier
                          serviceIdentifier:(NSString*)serviceIdentifier
                   characteristicIdentifier:(NSString*)characteristicIdentifier
                              transactionId:(NSString*)transactionId
                                   resolver:(RCTPromiseResolveBlock)resolve
                                   rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager monitorCharacteristic:deviceIdentifier
                  serviceIdentifier:serviceIdentifier
           characteristicIdentifier:characteristicIdentifier
                      transactionId:transactionId
                            resolve:resolve
                             reject:reject];
}

RCT_EXPORT_METHOD(cancelCharacteristicOperation:(NSString*)transactionId) {
    [_manager cancelCharacteristicOperation:transactionId];
}

@end
