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
                callback(@[result[@(ResultKeyError)], result[@(ResultKeyData)]]);
            };
        };
        
    }
    return self;
}

RCT_EXPORT_METHOD(createCentralClient:(NSDictionary<NSString *, id> *)options callback:(RCTResponseSenderBlock)callback) {
    [_wrapper createCentralManagerWithQueue:_methodQueue options:options callback:self.resultHandler(callback)];
}

RCT_EXPORT_METHOD(destroyCentralClient:(nonnull NSNumber *)managerId) {
    [_wrapper destroyCentralManagerWithId:managerId.intValue];
}

// MARK: - Transactions

RCT_EXPORT_METHOD(cancelPromise:(nonnull NSNumber *)centralManagerId promiseId:(nonnull NSString*)promiseId) {
    [_wrapper cancelPromiseWithCentralManagerId:centralManagerId.intValue promiseId:promiseId];
}

// MARK: - Buffers 

RCT_EXPORT_METHOD(actionOnBuffer:(nonnull NSNumber *)centralManagerId
                  bufferId:(nonnull NSNumber *)bufferId
                  options:(NSDictionary *)options
                  cancelOptions:(NSDictionary *)cancelOptions
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper actionOnBufferWithCentralManagerId:centralManagerId.intValue id:bufferId.intValue options:options cancelOptions:cancelOptions callback:self.resultHandler(callback)];
}

RCT_EXPORT_METHOD(stopBuffer:(nonnull NSNumber *)centralManagerId
                  bufferId:(nonnull NSNumber *)bufferId
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper stopBufferWithCentralManagerId:centralManagerId.intValue id:bufferId.intValue callback:self.resultHandler(callback)];
}

// Mark: Monitoring state ----------------------------------------------------------------------------------------------

RCT_EXPORT_METHOD(getState:(nonnull NSNumber *)centralManagerId callback:(RCTResponseSenderBlock)callback) {
    [_wrapper getStateWithCentralManagerId:centralManagerId.intValue callback:self.resultHandler(callback)];
}

RCT_EXPORT_METHOD(monitorState:(nonnull NSNumber *)centralManagerId options:(NSDictionary *)options callback:(RCTResponseSenderBlock)callback) {
    [_wrapper monitorStateWithCentralManagerId:centralManagerId.intValue options:options callback:self.resultHandler(callback)];
}

// MARK: - State restoration

RCT_EXPORT_METHOD(monitorRestoreState:(nonnull NSNumber *)centralManagerId callback:(RCTResponseSenderBlock)callback) {
    [_wrapper monitorRestoreStateWithCentralManagerId:centralManagerId.intValue callback:self.resultHandler(callback)];
}

// Mark: Scanning ------------------------------------------------------------------------------------------------------

RCT_EXPORT_METHOD(scanForPeripherals:(nonnull NSNumber *)centralManagerId 
                  filteredUUIDs:(NSArray*)filteredUUIDs
                  options:(NSDictionary*)options
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper scanForPeripheralsWithCentralManagerId:centralManagerId.intValue filteredUUIDs:filteredUUIDs options:options callback:self.resultHandler(callback)];
}

// MARK: - Read RSSI

RCT_EXPORT_METHOD(readRSSIForPeripheral:(nonnull NSNumber *)centralManagerId
                  peripheralId:(nonnull NSString*)uuidString
                  cancelOptions:(NSDictionary*)cancelOptions
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper readRSSIForPeripheralWithCentralManagerId:centralManagerId.intValue uuidString:uuidString cancelOptions:cancelOptions callback:self.resultHandler(callback)];
}

// MARK: - MTU

RCT_EXPORT_METHOD(requestMTUForPeripheral:(nonnull NSNumber *)centralManagerId
                  peripheralId:(nonnull NSString*)uuidString
                  mtu:(NSInteger)mtu
                  cancelOptions:(NSDictionary*)cancelOptions
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper requestMTUForPeripheralWithCentralManagerId:centralManagerId.intValue uuidString:uuidString mtu:mtu cancelOptions:cancelOptions callback:self.resultHandler(callback)];
}

RCT_EXPORT_METHOD(getMTUForPeripheral:(nonnull NSNumber *)centralManagerId
                  peripheralId:(nonnull NSString*)uuidString
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper getMTUForPeripheralWithCentralManagerId:centralManagerId.intValue uuidString:uuidString callback:self.resultHandler(callback)];
}

RCT_EXPORT_METHOD(monitorMTUForPeripheral:(nonnull NSNumber *)centralManagerId
                  peripheralId:(nonnull NSString*)uuidString
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper monitorMTUForPeripheralWithCentralManagerId:centralManagerId.intValue uuidString:uuidString callback:self.resultHandler(callback)];
}

// MARK: - Device managment

RCT_EXPORT_METHOD(getPeripherals:(nonnull NSNumber *)centralManagerId 
                  deviceIdentifiers:(NSArray<NSString*> *)deviceIdentifiers
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper getPeripheralsWithCentralManagerId:centralManagerId.intValue deviceIdentifiers:deviceIdentifiers callback:self.resultHandler(callback)];
}

RCT_EXPORT_METHOD(getConnectedPeripherals:(nonnull NSNumber *)centralManagerId
                  serviceUuids:(NSArray<NSString*> *)serviceUuids
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper getConnectedPeripheralsWithCentralManagerId:centralManagerId.intValue serviceUUIDs:serviceUuids callback:self.resultHandler(callback)];
}

// MARK: - Connection managment

RCT_EXPORT_METHOD(connectToPeripheral:(nonnull NSNumber *)centralManagerId 
                  peripheralId:(nonnull NSString*)peripheralUUID
                  options:(NSDictionary<NSString*, id> *)options
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper connectToPeripheralWithCentralManagerId:centralManagerId.intValue uuidString:peripheralUUID options:options callback:self.resultHandler(callback)];
}

RCT_EXPORT_METHOD(cancelPeripheralConnection:(nonnull NSNumber *)centralManagerId
                  peripheralId:(nonnull NSString*)peripheralUUID
                  cancelOptions:(NSDictionary<NSString*, id> *)cancelOptions
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper cancelPeripheralConnectionWithCentralManagerId:centralManagerId.intValue uuidString:peripheralUUID cancelOptions:cancelOptions callback:self.resultHandler(callback)];
}

RCT_EXPORT_METHOD(isPeripheralConnected:(nonnull NSNumber *)centralManagerId
                  peripheralId:(nonnull NSString*)peripheralUUID
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper isPeripheralConnectedWithCentralManagerId:centralManagerId.intValue uuidString:peripheralUUID callback:self.resultHandler(callback)];
}

RCT_EXPORT_METHOD(monitorDisconnection:(nonnull NSNumber *)centralManagerId callback:(RCTResponseSenderBlock)callback) {
    [_wrapper monitorDisconnectionWithCentralManagerId:centralManagerId.intValue callback:self.resultHandler(callback)];
}

// MARK: - Peripheral name

RCT_EXPORT_METHOD(getNameForPeripheral:(nonnull NSNumber *)centralManagerId
                  peripheralId:(nonnull NSString*)peripheralUUID
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper getNameForPeripheralWithCentralManagerId:centralManagerId.intValue uuidString:peripheralUUID callback:self.resultHandler(callback)];
}

RCT_EXPORT_METHOD(monitorPeripheralName:(nonnull NSNumber *)centralManagerId
                  peripheralId:(nonnull NSString*)peripheralUUID
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper monitorPeripheralNameWithCentralManagerId:centralManagerId.intValue uuidString:peripheralUUID callback:self.resultHandler(callback)];
}

// MARK: - Discovery

RCT_EXPORT_METHOD(discoverAllServicesAndCharacteristicsForPeripheral:(nonnull NSNumber *)centralManagerId
                  peripheralId:(nonnull NSString*)peripheralUUID
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper discoverAllServicesAndCharacteristicsForPeripheralWithCentralManagerId:centralManagerId.intValue uuidString:peripheralUUID callback:self.resultHandler(callback)];
}

// MARK: - Service and characteristic getters

RCT_EXPORT_METHOD(getServiceForPeripheral:(nonnull NSNumber *)centralManagerId
                  peripheralId:(nonnull NSString*)peripheralUUID
                  serviceUUID:(nonnull NSString*)serviceUUID
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper getServiceForPeripheralWithCentralManagerId:centralManagerId.intValue uuidString:peripheralUUID serviceUUIDString:serviceUUID callback:self.resultHandler(callback)];
}

RCT_EXPORT_METHOD(getServicesForPeripheral:(nonnull NSNumber *)centralManagerId
                  peripheralId:(nonnull NSString*)peripheralUUID
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper getServicesForPeripheralWithCentralManagerId:centralManagerId.intValue uuidString:peripheralUUID callback:self.resultHandler(callback)];
}

RCT_EXPORT_METHOD(getCharacteristicForServiceByUUID:(nonnull NSNumber *)centralManagerId
                  peripheralId:(nonnull NSString*)peripheralUUID
                  serviceUUID:(nonnull NSString*)serviceUUID
                  characteristicUUID:(nonnull NSString*)characteristicUUID
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper getCharacteristicForServiceByUUIDWithCentralManagerId:centralManagerId.intValue uuidString:peripheralUUID serviceUUIDString:serviceUUID characteristicUUIDString:characteristicUUID callback:self.resultHandler(callback)];
}

RCT_EXPORT_METHOD(getCharacteristicForService:(nonnull NSNumber *)centralManagerId
                  serviceId:(nonnull NSNumber*)serviceId
                  characteristicUUID:(nonnull NSString *)characteristicUUID
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper getCharacteristicForServiceWithCentralManagerId:centralManagerId.intValue serviceId:serviceId.intValue characteristicUUIDString:characteristicUUID callback:self.resultHandler(callback)];
}

RCT_EXPORT_METHOD(getCharacteristicsForService:(nonnull NSNumber *)centralManagerId
                  serviceId:(nonnull NSNumber*)serviceId
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper getCharacteristicsForServiceWithCentralManagerId:centralManagerId.intValue serviceId:serviceId.intValue callback:self.resultHandler(callback)];
}

// MARK: - Reading

RCT_EXPORT_METHOD(readBase64CharacteristicValue:(nonnull NSNumber *)centralManagerId
                  characteristicId:(nonnull NSNumber *)characteristicId
                  cancelOptions:(NSDictionary *)cancelOptions
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper readBase64CharacteristicValueWithCentralManagerId:centralManagerId.intValue
                                               characteristicId:characteristicId.intValue
                                                  cancelOptions:cancelOptions
                                                       callback:self.resultHandler(callback)];
}

// MARK: - Writing

RCT_EXPORT_METHOD(writeBase64CharacteristicValue:(nonnull NSNumber *)centralManagerId
                  characteristicId:(nonnull NSNumber *)characteristicId
                  valueBase64:(nonnull NSString *)valueBase64
                  reponse:(BOOL)response
                  cancelOptions:(NSDictionary *)cancelOptions
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper writeBase64CharacteristicValueWithCentralManagerId:centralManagerId.intValue
                                                characteristicId:characteristicId.intValue
                                                     valueBase64:valueBase64 
                                                        response:response
                                                   cancelOptions:cancelOptions
                                                        callback:self.resultHandler(callback)];
}

// MARK: - Monitoring

RCT_EXPORT_METHOD(monitorBase64CharacteristicValue:(nonnull NSNumber *)centralManagerId
                  characteristicId:(nonnull NSNumber *)characteristicId
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper monitorBase64CharacteristicValueWithCentralManagerId:centralManagerId.intValue
                                                  characteristicId:characteristicId.intValue
                                                          callback:self.resultHandler(callback)];
}

RCT_EXPORT_METHOD(isCharacteristicNotifying:(nonnull NSNumber *)centralManagerId
                  characteristicId:(nonnull NSNumber *)characteristicId
                  callback:(RCTResponseSenderBlock)callback) {
    [_wrapper isCharacteristicNotifyingWithCentralManagerId:centralManagerId.intValue
                                           characteristicId:characteristicId.intValue
                                                   callback:self.resultHandler(callback)];
}

// MARK: - Utils

RCT_EXPORT_METHOD(setLogLevel:(nonnull NSString *)logLevel) {
    [_wrapper setLogLevel:logLevel];
}

RCT_EXPORT_METHOD(getLogLevel:(RCTResponseSenderBlock)callback) {
    [_wrapper getLogLevel:self.resultHandler(callback)];
}

@end
