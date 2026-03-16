//
//  BlePlx.mm
//  react-native-ble-plx
//
//  TurboModule entry point — ObjC++ bridge to Swift implementation
//

#import <React/RCTLog.h>
#import <React/RCTUtils.h>
#import <NativeBlePlxSpec/NativeBlePlxSpec.h>

// Auto-generated Swift bridge header
#if __has_include("react_native_ble_plx-Swift.h")
#import "react_native_ble_plx-Swift.h"
#else
#import <react_native_ble_plx/react_native_ble_plx-Swift.h>
#endif

@interface BlePlx : NativeBlePlxSpecBase <NativeBlePlxSpec, BLEEventEmitter>
@end

@implementation BlePlx {
    BLEModuleImpl *_impl;
}

RCT_EXPORT_MODULE(NativeBlePlx)

- (instancetype)init {
    self = [super init];
    if (self) {
        _impl = [[BLEModuleImpl alloc] initWithEventEmitter:self];
    }
    return self;
}

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

- (void)dealloc {
    [_impl invalidate];
}

// MARK: - Lifecycle

- (void)createClient:(NSString * _Nullable)restoreStateIdentifier
             resolve:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject {
    [_impl createClientWithRestoreStateIdentifier:restoreStateIdentifier resolve:resolve reject:reject];
}

- (void)destroyClient:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject {
    [_impl destroyClientWithResolve:resolve reject:reject];
}

// MARK: - State

- (void)state:(RCTPromiseResolveBlock)resolve
       reject:(RCTPromiseRejectBlock)reject {
    [_impl stateWithResolve:resolve reject:reject];
}

// MARK: - Scanning

- (void)startDeviceScan:(NSArray * _Nullable)uuids
                options:(JS::NativeBlePlx::SpecStartDeviceScanOptions &)options {
    NSMutableDictionary *optionsDict = [NSMutableDictionary dictionary];
    {
        if (options.scanMode().has_value()) {
            optionsDict[@"scanMode"] = @(options.scanMode().value());
        }
        if (options.callbackType().has_value()) {
            optionsDict[@"callbackType"] = @(options.callbackType().value());
        }
        if (options.legacyScan().has_value()) {
            optionsDict[@"legacyScan"] = @(options.legacyScan().value());
        }
        if (options.allowDuplicates().has_value()) {
            optionsDict[@"allowDuplicates"] = @(options.allowDuplicates().value());
        }
    }
    [_impl startDeviceScanWithUuids:uuids options:optionsDict];
}

- (void)stopDeviceScan:(RCTPromiseResolveBlock)resolve
                reject:(RCTPromiseRejectBlock)reject {
    [_impl stopDeviceScanWithResolve:resolve reject:reject];
}

// MARK: - Connection

- (void)connectToDevice:(NSString *)deviceId
                options:(JS::NativeBlePlx::SpecConnectToDeviceOptions &)options
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject {
    NSMutableDictionary *optionsDict = [NSMutableDictionary dictionary];
    if (options.autoConnect().has_value()) {
        optionsDict[@"autoConnect"] = @(options.autoConnect().value());
    }
    if (options.timeout().has_value()) {
        optionsDict[@"timeout"] = @(options.timeout().value());
    }
    if (options.retries().has_value()) {
        optionsDict[@"retries"] = @(options.retries().value());
    }
    if (options.retryDelay().has_value()) {
        optionsDict[@"retryDelay"] = @(options.retryDelay().value());
    }
    if (options.requestMtu().has_value()) {
        optionsDict[@"requestMtu"] = @(options.requestMtu().value());
    }
    [_impl connectToDeviceWithDeviceId:deviceId options:optionsDict resolve:resolve reject:reject];
}

- (void)cancelDeviceConnection:(NSString *)deviceId
                       resolve:(RCTPromiseResolveBlock)resolve
                        reject:(RCTPromiseRejectBlock)reject {
    [_impl cancelDeviceConnectionWithDeviceId:deviceId resolve:resolve reject:reject];
}

- (void)isDeviceConnected:(NSString *)deviceId
                  resolve:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject {
    [_impl isDeviceConnectedWithDeviceId:deviceId resolve:resolve reject:reject];
}

// MARK: - Discovery

- (void)discoverAllServicesAndCharacteristics:(NSString *)deviceId
                                transactionId:(NSString * _Nullable)transactionId
                                      resolve:(RCTPromiseResolveBlock)resolve
                                       reject:(RCTPromiseRejectBlock)reject {
    [_impl discoverAllServicesAndCharacteristicsWithDeviceId:deviceId transactionId:transactionId resolve:resolve reject:reject];
}

// MARK: - Read/Write

- (void)readCharacteristic:(NSString *)deviceId
               serviceUuid:(NSString *)serviceUuid
        characteristicUuid:(NSString *)characteristicUuid
             transactionId:(NSString * _Nullable)transactionId
                   resolve:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject {
    [_impl readCharacteristicWithDeviceId:deviceId serviceUuid:serviceUuid characteristicUuid:characteristicUuid transactionId:transactionId resolve:resolve reject:reject];
}

- (void)writeCharacteristic:(NSString *)deviceId
                serviceUuid:(NSString *)serviceUuid
         characteristicUuid:(NSString *)characteristicUuid
                      value:(NSString *)value
               withResponse:(BOOL)withResponse
              transactionId:(NSString * _Nullable)transactionId
                    resolve:(RCTPromiseResolveBlock)resolve
                     reject:(RCTPromiseRejectBlock)reject {
    [_impl writeCharacteristicWithDeviceId:deviceId serviceUuid:serviceUuid characteristicUuid:characteristicUuid value:value withResponse:withResponse transactionId:transactionId resolve:resolve reject:reject];
}

// MARK: - Monitor

- (void)monitorCharacteristic:(NSString *)deviceId
                  serviceUuid:(NSString *)serviceUuid
           characteristicUuid:(NSString *)characteristicUuid
             subscriptionType:(NSString * _Nullable)subscriptionType
                transactionId:(NSString * _Nullable)transactionId {
    [_impl monitorCharacteristicWithDeviceId:deviceId serviceUuid:serviceUuid characteristicUuid:characteristicUuid subscriptionType:subscriptionType transactionId:transactionId];
}

// MARK: - MTU

- (void)getMtu:(NSString *)deviceId
       resolve:(RCTPromiseResolveBlock)resolve
        reject:(RCTPromiseRejectBlock)reject {
    [_impl getMtuWithDeviceId:deviceId resolve:resolve reject:reject];
}

- (void)requestMtu:(NSString *)deviceId
               mtu:(double)mtu
     transactionId:(NSString * _Nullable)transactionId
           resolve:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject {
    [_impl requestMtuWithDeviceId:deviceId mtu:(NSInteger)mtu transactionId:transactionId resolve:resolve reject:reject];
}

// MARK: - PHY

- (void)requestPhy:(NSString *)deviceId
             txPhy:(double)txPhy
             rxPhy:(double)rxPhy
           resolve:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject {
    [_impl requestPhyWithDeviceId:deviceId txPhy:(NSInteger)txPhy rxPhy:(NSInteger)rxPhy resolve:resolve reject:reject];
}

- (void)readPhy:(NSString *)deviceId
        resolve:(RCTPromiseResolveBlock)resolve
         reject:(RCTPromiseRejectBlock)reject {
    [_impl readPhyWithDeviceId:deviceId resolve:resolve reject:reject];
}

// MARK: - Connection Priority

- (void)requestConnectionPriority:(NSString *)deviceId
                         priority:(double)priority
                          resolve:(RCTPromiseResolveBlock)resolve
                           reject:(RCTPromiseRejectBlock)reject {
    [_impl requestConnectionPriorityWithDeviceId:deviceId priority:(NSInteger)priority resolve:resolve reject:reject];
}

// MARK: - L2CAP

- (void)openL2CAPChannel:(NSString *)deviceId
                      psm:(double)psm
                  resolve:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject {
    [_impl openL2CAPChannelWithDeviceId:deviceId psm:(NSInteger)psm resolve:resolve reject:reject];
}

- (void)writeL2CAPChannel:(double)channelId
                      data:(NSString *)data
                   resolve:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject {
    [_impl writeL2CAPChannelWithChannelId:(NSInteger)channelId data:data resolve:resolve reject:reject];
}

- (void)closeL2CAPChannel:(double)channelId
                   resolve:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject {
    [_impl closeL2CAPChannelWithChannelId:(NSInteger)channelId resolve:resolve reject:reject];
}

// MARK: - Bonding

- (void)getBondedDevices:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject {
    [_impl getBondedDevicesWithResolve:resolve reject:reject];
}

// MARK: - Authorization

- (void)getAuthorizationStatus:(RCTPromiseResolveBlock)resolve
                        reject:(RCTPromiseRejectBlock)reject {
    [_impl getAuthorizationStatusWithResolve:resolve reject:reject];
}

// MARK: - Cancellation

- (void)cancelTransaction:(NSString *)transactionId
                   resolve:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject {
    [_impl cancelTransactionWithTransactionId:transactionId resolve:resolve reject:reject];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
    return std::make_shared<facebook::react::NativeBlePlxSpecJSI>(params);
}

@end
