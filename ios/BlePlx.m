//
//  BleClient.m
//  BleClient
//
//  Created by Przemysław Lenart on 27/07/16.
//  Copyright © 2016 Polidea. All rights reserved.
//

#import "BlePlx.h"
#import "BlePlx-Swift.h"


@interface BlePlx () <BleClientManagerDelegate>
@property(nonatomic) BleClientManager* manager;
@end

@implementation BlePlx
{
    bool hasListeners;
}

@synthesize methodQueue = _methodQueue;

RCT_EXPORT_MODULE();


- (void)dispatchEvent:(NSString * _Nonnull)name value:(id _Nonnull)value {
    if (hasListeners) {
        [self sendEventWithName:name body:value];
    }
}

- (void)startObserving {
    hasListeners = YES;
}

- (void)stopObserving {
    hasListeners = NO;
}

- (NSArray<NSString *> *)supportedEvents {
    return BleEvent.events;
}

- (NSDictionary<NSString *,id> *)constantsToExport {
    NSMutableDictionary* consts = [NSMutableDictionary new];
    for (NSString* event in BleEvent.events) {
        [consts setValue:event forKey:event];
    }
    return consts;
}

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

RCT_EXPORT_METHOD(createClient:(NSString*)restoreIdentifierKey) {
    _manager = [BleAdapterFactory getNewAdapterWithQueue:self.methodQueue
                                    restoreIdentifierKey:restoreIdentifierKey];
    _manager.delegate = self;
}

RCT_EXPORT_METHOD(destroyClient) {
    [_manager invalidate];
    _manager = nil;
}

- (void)invalidate {
    [self destroyClient];
}

// Mark: Monitoring state ----------------------------------------------------------------------------------------------

RCT_EXPORT_METHOD(   enable:(NSString*)transactionId
                   resolver:(RCTPromiseResolveBlock)resolve
                   rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager enable:transactionId
             resolve:resolve
              reject:reject];
}

RCT_EXPORT_METHOD(   disable:(NSString*)transactionId
                    resolver:(RCTPromiseResolveBlock)resolve
                    rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager disable:transactionId
              resolve:resolve
               reject:reject];
}

RCT_EXPORT_METHOD(   state:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager state:resolve
             reject:reject];
}

// Mark: Scanning ------------------------------------------------------------------------------------------------------

RCT_EXPORT_METHOD(startDeviceScan:(NSArray*)filteredUUIDs
                          options:(NSDictionary*)options) {
    [_manager startDeviceScan:filteredUUIDs options:options];
}

RCT_EXPORT_METHOD(stopDeviceScan) {
    [_manager stopDeviceScan];
}

RCT_EXPORT_METHOD(requestConnectionPriorityForDevice:(NSString*)deviceIdentifier
                                  connectionPriority:(NSInteger)connectionPriority
                                       transactionId:(NSString*)transactionId
                                            resolver:(RCTPromiseResolveBlock)resolve
                                            rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager requestConnectionPriorityForDevice:deviceIdentifier
                              connectionPriority:connectionPriority
                                   transactionId:transactionId
                                         resolve:resolve
                                          reject:reject];
}

RCT_EXPORT_METHOD(readRSSIForDevice:(NSString*)deviceIdentifier
                      transactionId:(NSString*)transactionId
                           resolver:(RCTPromiseResolveBlock)resolve
                           rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager readRSSIForDevice:deviceIdentifier
                  transactionId:transactionId
                        resolve:resolve
                         reject:reject];
}

RCT_EXPORT_METHOD(requestMTUForDevice:(NSString*)deviceIdentifier
                                  mtu:(NSInteger)mtu
                        transactionId:(NSString*)transactionId
                             resolver:(RCTPromiseResolveBlock)resolve
                             rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager requestMTUForDevice:deviceIdentifier
                              mtu:mtu
                    transactionId:transactionId
                          resolve:resolve
                           reject:reject];
}

// Mark: Device management ---------------------------------------------------------------------------------------------

RCT_EXPORT_METHOD(devices:(NSArray<NSString*>*)deviceIdentifiers
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager devices:deviceIdentifiers
              resolve:resolve
               reject:reject];
}

RCT_EXPORT_METHOD(connectedDevices:(NSArray<NSString*>*)serviceUUIDs
                          resolver:(RCTPromiseResolveBlock)resolve
                          rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager connectedDevices:serviceUUIDs
                       resolve:resolve
                        reject:reject];
}

// Mark: Connection management -----------------------------------------------------------------------------------------

RCT_EXPORT_METHOD(connectToDevice:(NSString*)deviceIdentifier
                          options:(NSDictionary*)options
                         resolver:(RCTPromiseResolveBlock)resolve
                         rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager connectToDevice:deviceIdentifier
                      options:options
                      resolve:resolve
                       reject:reject];
}

RCT_EXPORT_METHOD(cancelDeviceConnection:(NSString*)deviceIdentifier
                                resolver:(RCTPromiseResolveBlock)resolve
                                rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager cancelDeviceConnection:deviceIdentifier
                             resolve:resolve
                              reject:reject];
}

RCT_EXPORT_METHOD(isDeviceConnected:(NSString*)deviceIdentifier
                           resolver:(RCTPromiseResolveBlock)resolve
                           rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager isDeviceConnected:deviceIdentifier
                        resolve:resolve
                         reject:reject];
}

// Mark: Discovery -----------------------------------------------------------------------------------------------------

RCT_EXPORT_METHOD(discoverAllServicesAndCharacteristicsForDevice:(NSString*)deviceIdentifier
                                                   transactionId:(NSString*)transactionId
                                                        resolver:(RCTPromiseResolveBlock)resolve
                                                        rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager discoverAllServicesAndCharacteristicsForDevice:deviceIdentifier
                                               transactionId:transactionId
                                                     resolve:resolve
                                                      reject:reject];
}

// Mark: Service and characteristic getters ----------------------------------------------------------------------------

RCT_EXPORT_METHOD(servicesForDevice:(NSString*)deviceIdentifier
                           resolver:(RCTPromiseResolveBlock)resolve
                           rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager servicesForDevice:deviceIdentifier
                        resolve:resolve
                         reject:reject];
}

RCT_EXPORT_METHOD(characteristicsForDevice:(NSString*)deviceIdentifier
                               serviceUUID:(NSString*)serviceUUID
                                  resolver:(RCTPromiseResolveBlock)resolve
                                  rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager characteristicsForDevice:deviceIdentifier
                           serviceUUID:serviceUUID
                               resolve:resolve
                                reject:reject];
}

RCT_EXPORT_METHOD(characteristicsForService:(nonnull NSNumber*)serviceIdentifier
                                   resolver:(RCTPromiseResolveBlock)resolve
                                   rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager characteristicsForService:serviceIdentifier.doubleValue
                                resolve:resolve
                                 reject:reject];
}

RCT_EXPORT_METHOD(descriptorsForDevice:(NSString*)deviceIdentifier
                           serviceUUID:(NSString*)serviceUUID
                    characteristicUUID:(NSString*)characteristicUUID
                              resolver:(RCTPromiseResolveBlock)resolve
                              rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager descriptorsForDevice:deviceIdentifier
                       serviceUUID:serviceUUID
                characteristicUUID:characteristicUUID
                           resolve:resolve
                            reject:reject];
}

RCT_EXPORT_METHOD(descriptorsForService:(nonnull NSNumber*)serviceIdentifier
                     characteristicUUID:(NSString*)characteristicUUID
                               resolver:(RCTPromiseResolveBlock)resolve
                               rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager descriptorsForService:serviceIdentifier.doubleValue
                 characteristicUUID:characteristicUUID
                            resolve:resolve
                             reject:reject];
}

RCT_EXPORT_METHOD(descriptorsForCharacteristic:(nonnull NSNumber*)characteristicIdentifier
                                      resolver:(RCTPromiseResolveBlock)resolve
                                      rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager descriptorsForCharacteristic:characteristicIdentifier.doubleValue
                                   resolve:resolve
                                    reject:reject];
}

// Mark: Characteristics operations ------------------------------------------------------------------------------------

RCT_EXPORT_METHOD(readCharacteristicForDevice:(NSString*)deviceIdentifier
                                  serviceUUID:(NSString*)serviceUUID
                           characteristicUUID:(NSString*)characteristicUUID
                                transactionId:(NSString*)transactionId
                                     resolver:(RCTPromiseResolveBlock)resolve
                                     rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager readCharacteristicForDevice:deviceIdentifier
                              serviceUUID:serviceUUID
                       characteristicUUID:characteristicUUID
                            transactionId:transactionId
                                  resolve:resolve
                                   reject:reject];
}

RCT_EXPORT_METHOD(readCharacteristicForService:(nonnull NSNumber*)serviceIdentifier
                            characteristicUUID:(NSString*)characteristicUUID
                                 transactionId:(NSString*)transactionId
                                      resolver:(RCTPromiseResolveBlock)resolve
                                      rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager readCharacteristicForService:serviceIdentifier.doubleValue
                        characteristicUUID:characteristicUUID
                             transactionId:transactionId
                                   resolve:resolve
                                    reject:reject];
}

RCT_EXPORT_METHOD(readCharacteristic:(nonnull NSNumber*)characteristicIdentifier
                       transactionId:(NSString*)transactionId
                            resolver:(RCTPromiseResolveBlock)resolve
                            rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager readCharacteristic:characteristicIdentifier.doubleValue
                   transactionId:transactionId
                         resolve:resolve
                          reject:reject];
}

RCT_EXPORT_METHOD(writeCharacteristicForDevice:(NSString*)deviceIdentifier
                                   serviceUUID:(NSString*)serviceUUID
                            characteristicUUID:(NSString*)characteristicUUID
                                   valueBase64:(NSString*)valueBase64
                                  withResponse:(BOOL)response
                                 transactionId:(NSString*)transactionId
                                      resolver:(RCTPromiseResolveBlock)resolve
                                      rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager writeCharacteristicForDevice:deviceIdentifier
                               serviceUUID:serviceUUID
                        characteristicUUID:characteristicUUID
                               valueBase64:valueBase64
                                  response:response
                             transactionId:transactionId
                                   resolve:resolve
                                    reject:reject];
}

RCT_EXPORT_METHOD(writeCharacteristicForService:(nonnull NSNumber*)serviceIdentifier
                             characteristicUUID:(NSString*)characteristicUUID
                                    valueBase64:(NSString*)valueBase64
                                   withResponse:(BOOL)response
                                  transactionId:(NSString*)transactionId
                                       resolver:(RCTPromiseResolveBlock)resolve
                                       rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager writeCharacteristicForService:serviceIdentifier.doubleValue
                         characteristicUUID:characteristicUUID
                                valueBase64:valueBase64
                                   response:response
                              transactionId:transactionId
                                    resolve:resolve
                                     reject:reject];
}

RCT_EXPORT_METHOD(writeCharacteristic:(nonnull NSNumber*)characteristicIdentifier
                          valueBase64:(NSString*)valueBase64
                         withResponse:(BOOL)response
                        transactionId:(NSString*)transactionId
                             resolver:(RCTPromiseResolveBlock)resolve
                             rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager writeCharacteristic:characteristicIdentifier.doubleValue
                      valueBase64:valueBase64
                         response:response
                    transactionId:transactionId
                          resolve:resolve
                           reject:reject];
}

RCT_EXPORT_METHOD(monitorCharacteristicForDevice:(NSString*)deviceIdentifier
                                     serviceUUID:(NSString*)serviceUUID
                              characteristicUUID:(NSString*)characteristicUUID
                                   transactionID:(NSString*)transactionId
                                        resolver:(RCTPromiseResolveBlock)resolve
                                        rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager monitorCharacteristicForDevice:deviceIdentifier
                                 serviceUUID:serviceUUID
                          characteristicUUID:characteristicUUID
                               transactionId:transactionId
                                     resolve:resolve
                                      reject:reject];
}

RCT_EXPORT_METHOD(monitorCharacteristicForService:(nonnull NSNumber*)serviceIdentifier
                               characteristicUUID:(NSString*)characteristicUUID
                                    transactionID:(NSString*)transactionId
                                         resolver:(RCTPromiseResolveBlock)resolve
                                         rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager monitorCharacteristicForService:serviceIdentifier.doubleValue
                           characteristicUUID:characteristicUUID
                                transactionId:transactionId
                                      resolve:resolve
                                       reject:reject];
}

RCT_EXPORT_METHOD(monitorCharacteristic:(nonnull NSNumber*)characteristicIdentifier
                          transactionID:(NSString*)transactionId
                               resolver:(RCTPromiseResolveBlock)resolve
                               rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager monitorCharacteristic:characteristicIdentifier.doubleValue
                      transactionId:transactionId
                            resolve:resolve
                             reject:reject];
}

// Mark: Characteristics operations ------------------------------------------------------------------------------------

RCT_EXPORT_METHOD(readDescriptorForDevice:(NSString*)deviceIdentifier
                  serviceUUID:(NSString*)serviceUUID
                  characteristicUUID:(NSString*)characteristicUUID
                  descriptorUUID:(NSString*)descriptorUUID
                  transactionId:(NSString*)transactionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager readDescriptorForDevice:deviceIdentifier
                          serviceUUID:serviceUUID
                   characteristicUUID:characteristicUUID
                       descriptorUUID:descriptorUUID
                        transactionId:transactionId
                              resolve:resolve
                               reject:reject];
}

RCT_EXPORT_METHOD(readDescriptorForService:(nonnull NSNumber*)serviceIdentifier
                  characteristicUUID:(NSString*)characteristicUUID
                  descriptorUUID:(NSString*)descriptorUUID
                  transactionId:(NSString*)transactionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager readDescriptorForService:serviceIdentifier.doubleValue
                    characteristicUUID:characteristicUUID
                        descriptorUUID:descriptorUUID
                         transactionId:transactionId
                               resolve:resolve
                                reject:reject];
}


RCT_EXPORT_METHOD(readDescriptorForCharacteristic:(nonnull NSNumber*)characteristicIdentifier
                  descriptorUUID:(NSString*)descriptorUUID
                  transactionId:(NSString*)transactionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager readDescriptorForCharacteristic:characteristicIdentifier.doubleValue
                               descriptorUUID:descriptorUUID
                                transactionId:transactionId
                                      resolve:resolve
                                       reject:reject];
}

RCT_EXPORT_METHOD(readDescriptor:(nonnull NSNumber*)descriptorIdentifier
                  transactionId:(NSString*)transactionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager readDescriptor:descriptorIdentifier.doubleValue
               transactionId:transactionId
                     resolve:resolve
                      reject:reject];
}

RCT_EXPORT_METHOD(writeDescriptorForDevice:(NSString*)deviceIdentifier
                  serviceUUID:(NSString*)serviceUUID
                  characteristicUUID:(NSString*)characteristicUUID
                  descriptorUUID:(NSString*)descriptorUUID
                  valueBase64:(NSString*)valueBase64
                  transactionId:(NSString*)transactionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager writeDescriptorForDevice:deviceIdentifier
                           serviceUUID:serviceUUID
                    characteristicUUID:characteristicUUID
                        descriptorUUID:descriptorUUID
                           valueBase64:valueBase64
                         transactionId:transactionId
                               resolve:resolve
                                reject:reject];
}

RCT_EXPORT_METHOD(writeDescriptorForService:(nonnull NSNumber*)serviceIdentifier
                  characteristicUUID:(NSString*)characteristicUUID
                  descriptorUUID:(NSString*)descriptorUUID
                  valueBase64:(NSString*)valueBase64
                  transactionId:(NSString*)transactionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager writeDescriptorForService:serviceIdentifier.doubleValue
                     characteristicUUID:characteristicUUID
                         descriptorUUID:descriptorUUID
                            valueBase64:valueBase64
                          transactionId:transactionId
                                resolve:resolve
                                 reject:reject];
}

RCT_EXPORT_METHOD(writeDescriptorForCharacteristic:(nonnull NSNumber*)characteristicIdentifier
                  descriptorUUID:(NSString*)descriptorUUID
                  valueBase64:(NSString*)valueBase64
                  transactionId:(NSString*)transactionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager writeDescriptorForCharacteristic:characteristicIdentifier.doubleValue
                                descriptorUUID:descriptorUUID
                                   valueBase64:valueBase64
                                 transactionId:transactionId
                                       resolve:resolve
                                        reject:reject];
}

RCT_EXPORT_METHOD(writeDescriptor:(nonnull NSNumber*)descriptorIdentifier
                  valueBase64:(NSString*)valueBase64
                  transactionId:(NSString*)transactionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager writeDescriptor:descriptorIdentifier.doubleValue
                  valueBase64:valueBase64
                transactionId:transactionId
                      resolve:resolve
                       reject:reject];
}

// Mark: Other operations ----------------------------------------------------------------------------------------------

RCT_EXPORT_METHOD(cancelTransaction:(NSString*)transactionId) {
    [_manager cancelTransaction:transactionId];
}

RCT_EXPORT_METHOD(setLogLevel:(NSString*)logLevel) {
    [_manager setLogLevel:logLevel];
}

RCT_EXPORT_METHOD(logLevel:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [_manager logLevel:resolve
                reject:reject];
}

@end
