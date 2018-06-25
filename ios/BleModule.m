#import "BleModule.h"
#import "BleClient-Swift.h"

typedef void (^DataParser)(NSDictionary<NSNumber *, id> * result);

@interface BleModule ()
@property(nonatomic) ManagerWrapper* wrapper;
@property(nonatomic, copy, readonly) DataParser(^resultHandler)(RCTResponseSenderBlock);
@end

@implementation BleModule

@synthesize methodQueue = _methodQueue;

RCT_EXPORT_MODULE(BleClientManager);

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

- (instancetype)init
{
    self = [super init];
    if (self) {
        _wrapper = [[ManagerWrapper alloc] init];
        _resultHandler = ^DataParser(RCTResponseSenderBlock callback) {
            return ^void(NSDictionary<NSNumber *, id> * result) {
                callback(@[
                           result[@(ResultKeyError)],
                           result[@(ResultKeyData)],
                           result[@(ResultKeyPromiseId)]
                           ]);
            };
        };
        
    }
    return self;
}

RCT_EXPORT_METHOD(createCentralClient:(NSDictionary<NSString *, id> *)options callback:(RCTResponseSenderBlock)callback) {
    [_wrapper createCentralManagerWithQueue:_methodQueue options:options callback:self.resultHandler(callback)];
}

RCT_EXPORT_METHOD(destroyCentralClient:(NSNumber *)managerId) {
    [_wrapper destroyCentralManagerWithId:managerId.intValue];
}

// MARK: - Transactions

RCT_EXPORT_METHOD(cancelPromise:(NSNumber *)centralManagerId promiseId:(NSString*)promiseId) {
    [_wrapper cancelPromiseWithCentralManagerId:centralManagerId.intValue promiseId:promiseId];
}

// MARK: - Buffers 

RCT_EXPORT_METHOD(actionOnBuffer:(NSNumber *)centralManagerId
                  bufferId:(NSNumber *)bufferId
                  options:(NSDictionary *)options
                  cancelOptions:(NSDictionary *)cancelOptions
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper actionOnBufferWithCentralManagerId:centralManagerId.intValue id:bufferId.intValue options:options cancelOptions:cancelOptions callback:self.resultHandler(callback)];
}

RCT_EXPORT_METHOD(stopBuffer:(NSNumber *)centralManagerId
                  bufferId:(NSNumber *)bufferId
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper stopBufferWithCentralManagerId:centralManagerId.intValue id:bufferId.intValue callback:self.resultHandler(callback)];
}

// Mark: Monitoring state ----------------------------------------------------------------------------------------------

RCT_EXPORT_METHOD(state:(NSNumber *)centralManagerId callback:(RCTResponseSenderBlock)callback) {
    [_wrapper stateWithCentralManagerId:centralManagerId.intValue callback:self.resultHandler(callback)];
}

RCT_EXPORT_METHOD(monitorState:(NSNumber *)centralManagerId callback:(RCTResponseSenderBlock)callback) {
    [_wrapper monitorStateWithCentralManagerId:centralManagerId.intValue callback:self.resultHandler(callback)];
}

// MARK: - State restoration

RCT_EXPORT_METHOD(monitorRestoreState:(NSNumber *)centralManagerId callback:(RCTResponseSenderBlock)callback) {
    [_wrapper monitorRestoreStateWithCentralManagerId:centralManagerId.intValue callback:self.resultHandler(callback)];
}

// Mark: Scanning ------------------------------------------------------------------------------------------------------

RCT_EXPORT_METHOD(startDeviceScan:(NSNumber *)centralManagerId 
                  filteredUUIDs:(NSArray*)filteredUUIDs
                  options:(NSDictionary*)options
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper startDeviceScanWithCentralManagerId:centralManagerId.intValue filteredUUIDs:filteredUUIDs options:options callback:self.resultHandler(callback)];
}

// MARK: - Read RSSI

RCT_EXPORT_METHOD(readRSSIForDevice:(NSNumber *)centralManagerId
                  uuidString:(NSString*)uuidString
                  cancelOptions:(NSDictionary*)cancelOptions
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper readRSSIForDeviceWithCentralManagerId:centralManagerId.intValue uuidString:uuidString cancelOptions:cancelOptions callback:self.resultHandler(callback)];
}

// MARK: - MTU

RCT_EXPORT_METHOD(requestMTUForDevice:(NSNumber *)centralManagerId
                  uuidString:(NSString*)uuidString
                  mtu:(NSInteger)mtu
                  cancelOptions:(NSDictionary*)cancelOptions
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper requestMTUForDeviceWithCentralManagerId:centralManagerId.intValue uuidString:uuidString mtu:mtu cancelOptions:cancelOptions callback:self.resultHandler(callback)];
}

// MARK: - Device managment

RCT_EXPORT_METHOD(devices:(NSNumber *)centralManagerId 
                  deviceIdentifiers:(NSArray<NSString*> *)deviceIdentifiers
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper devicesWithCentralManagerId:centralManagerId.intValue deviceIdentifiers:deviceIdentifiers callback:self.resultHandler(callback)];
}

RCT_EXPORT_METHOD(connectedDevices:(NSNumber *)centralManagerId
                  serviceUuids:(NSArray<NSString*> *)serviceUuids
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper connectedDevicesWithCentralManagerId:centralManagerId.intValue serviceUUIDs:serviceUuids callback:self.resultHandler(callback)];
}

// MARK: - Connection managment

RCT_EXPORT_METHOD(connectToDevice:(NSNumber *)centralManagerId 
                  deviceUUID:(NSString*)deviceUUID
                  options:(NSDictionary<NSString*, id> *)options
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper connectToDeviceWithCentralManagerId:centralManagerId.intValue uuidString:deviceUUID options:options callback:self.resultHandler(callback)];
}

RCT_EXPORT_METHOD(cancelDeviceConnection:(NSNumber *)centralManagerId
                  deviceUUID:(NSString*)deviceUUID
                  cancelOptions:(NSDictionary<NSString*, id> *)cancelOptions
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper cancelDeviceConnectionWithCentralManagerId:centralManagerId.intValue uuidString:deviceUUID cancelOptions:cancelOptions callback:self.resultHandler(callback)];
}

RCT_EXPORT_METHOD(isDeviceConnected:(NSNumber *)centralManagerId
                  deviceUUID:(NSString*)deviceUUID
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper isDeviceConnectedWithCentralManagerId:centralManagerId.intValue uuidString:deviceUUID callback:self.resultHandler(callback)];
}

RCT_EXPORT_METHOD(monitorDisconnection:(NSNumber *)centralManagerId callback:(RCTResponseSenderBlock)callback) {
    [_wrapper monitorDisconnectionWithCentralManagerId:centralManagerId.intValue callback:self.resultHandler(callback)];
}

// MARK: - Discovery

RCT_EXPORT_METHOD(discoverAllServicesAndCharacteristicsForDevice:(NSNumber *)centralManagerId
                  deviceUUID:(NSString*)deviceUUID
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper discoverAllServicesAndCharacteristicsForDeviceWithCentralManagerId:centralManagerId.intValue uuidString:deviceUUID callback:self.resultHandler(callback)];
}

// MARK: - Service and characteristic getters

RCT_EXPORT_METHOD(servicesForDevice:(NSNumber *)centralManagerId
                  deviceUUID:(NSString*)deviceUUID
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper servicesForDeviceWithCentralManagerId:centralManagerId.intValue uuidString:deviceUUID callback:self.resultHandler(callback)];
}

RCT_EXPORT_METHOD(characteristicsForDevice:(NSNumber *)centralManagerId
                  deviceUUID:(NSString*)deviceUUID
                  serviceUUID:(NSString*)serviceUUID
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper characteristicsForDeviceWithCentralManagerId:centralManagerId.intValue uuidString:deviceUUID serviceUUID:serviceUUID callback:self.resultHandler(callback)];
}

RCT_EXPORT_METHOD(characteristicsForService:(NSNumber *)centralManagerId
                  serviceId:(NSNumber *)serviceId
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper characteristicsForServiceWithCentralManagerId:centralManagerId.intValue serviceId:serviceId.intValue callback:self.resultHandler(callback)];
}

// MARK: - Reading

RCT_EXPORT_METHOD(readCharacteristicForPeripheral:(NSNumber *)centralManagerId
                  peripheralUUID:(NSString *)peripheralUUID
                  serviceUUID:(NSString *)serviceUUID
                  characteristicUUID:(NSString *)characteristicUUID
                  cancelOptions:(NSDictionary *)cancelOptions
                  callback:(RCTResponseSenderBlock)callback) {
    
    [_wrapper readCharacteristicForPeripheralWithCentralManagerId:centralManagerId.intValue 
                                             peripheralUuidString:peripheralUUID 
                                                serviceUUIDString:serviceUUID 
                                         characteristicUUIDString:characteristicUUID
                                                    cancelOptions:cancelOptions
                                                         callback:self.resultHandler(callback)];
}

RCT_EXPORT_METHOD(readCharacteristicForService:(NSNumber *)centralManagerId
                  serviceId:(NSNumber *)serviceId
                  characteristicUUID:(NSString *)characteristicUUID
                  cancelOptions:(NSDictionary *)cancelOptions
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper readCharacteristicForServiceWithCentralManagerId:centralManagerId.intValue
                                                     serviceId:serviceId.intValue
                                      characteristicUUIDString:characteristicUUID 
                                                 cancelOptions:cancelOptions
                                                      callback:self.resultHandler(callback)];
}

RCT_EXPORT_METHOD(readCharacteristic:(NSNumber *)centralManagerId
                  characteristicId:(NSNumber *)characteristicId
                  cancelOptions:(NSDictionary *)cancelOptions
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper readCharacteristicWithCentralManagerId:centralManagerId.intValue
                                    characteristicId:characteristicId.intValue
                                       cancelOptions:cancelOptions
                                            callback:self.resultHandler(callback)];
}

// MARK: - Writing

RCT_EXPORT_METHOD(writeCharacteristicForDevice:(NSNumber *)centralManagerId
                  deviceUUID:(NSString *)deviceUUID
                  serviceUUID:(NSString *)serviceUUID
                  characteristicUUID:(NSString *)characteristicUUID
                  valueBase64:(NSString *)valueBase64
                  reponse:(BOOL)response
                  cancelOptions:(NSDictionary *)cancelOptions
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper writeCharacteristicForDeviceWithCentralManagerId:centralManagerId.intValue
                                          peripheralUUIDString:deviceUUID
                                             serviceUUIDString:serviceUUID
                                      characteristicUUIDString:characteristicUUID
                                                   valueBase64:valueBase64
                                                      response:response
                                                 cancelOptions:cancelOptions
                                                      callback:self.resultHandler(callback)];
}

RCT_EXPORT_METHOD(writeCharacteristicForService:(NSNumber *)centralManagerId
                  serviceId:(NSNumber *)serviceId
                  characteristicUUID:(NSString *)characteristicUUID
                  valueBase64:(NSString *)valueBase64
                  reponse:(BOOL)response
                  cancelOptions:(NSDictionary *)cancelOptions
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper writeCharacteristicForServiceWithCentralManagerId:centralManagerId.intValue
                                                      serviceId:serviceId.intValue
                                       characteristicUUIDString:characteristicUUID
                                                    valueBase64:valueBase64
                                                       response:response
                                                  cancelOptions:cancelOptions
                                                       callback:self.resultHandler(callback)];
}

RCT_EXPORT_METHOD(writeCharacteristic:(NSNumber *)centralManagerId
                  characteristicId:(NSNumber *)characteristicId
                  valueBase64:(NSString *)valueBase64
                  reponse:(BOOL)response
                  cancelOptions:(NSDictionary *)cancelOptions
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper writeCharacteristicWithCentralManagerId:centralManagerId.intValue
                                     characteristicId:characteristicId.intValue
                                          valueBase64:valueBase64 
                                             response:response
                                        cancelOptions:cancelOptions
                                             callback:self.resultHandler(callback)];
}

// MARK: - Monitoring

RCT_EXPORT_METHOD(monitorCharacteristicForDevice:(NSNumber *)centralManagerId
                  peripheralUUID:(NSString *)peripheralUUID
                  serviceUUID:(NSString *)serviceUUID
                  characteristicUUID:(NSString *)characteristicUUID
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper monitorCharacteristicForDeviceWithCentralManagerId:centralManagerId.intValue
                                            peripheralUUIDString:peripheralUUID
                                               serviceUUIDString:serviceUUID
                                        characteristicUUIDString:characteristicUUID
                                                        callback:self.resultHandler(callback)];
}

RCT_EXPORT_METHOD(monitorCharacteristicForService:(NSNumber *)centralManagerId
                  serviceId:(NSNumber *)serviceId
                  characteristicUUID:(NSString *)characteristicUUID
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper monitorCharacteristicForServiceWithCentralManagerId:centralManagerId.intValue
                                                        serviceId:serviceId.intValue
                                         characteristicUUIDString:characteristicUUID
                                                         callback:self.resultHandler(callback)];
}

RCT_EXPORT_METHOD(monitorCharacteristic:(NSNumber *)centralManagerId
                  characteristicId:(NSNumber *)characteristicId
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper monitorCharacteristicWithCentralManagerId:centralManagerId.intValue
                                       characteristicId:characteristicId.intValue
                                               callback:self.resultHandler(callback)];
}

@end
