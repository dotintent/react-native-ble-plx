// @flow

export class BleError extends Error {
  errorCode: $Values<typeof BleErrorCode>
  attErrorCode: ?$Values<typeof BleATTErrorCode>
  iosErrorCode: ?$Values<typeof BleIOSErrorCode>
  iosMessage: ?string
  androidErrorCode: ?$Values<typeof BleAndroidErrorCode>
  androidMessage: ?string

  constructor(
    errorCode: $Values<typeof BleErrorCode>,
    attErrorCode: ?$Values<typeof BleATTErrorCode>,
    iosErrorCode: ?$Values<typeof BleIOSErrorCode>,
    iosMessage: ?string,
    androidErrorCode: ?$Values<typeof BleAndroidErrorCode>,
    androidMessage: ?string
  ) {
    super(BleErrorCodeDescription[errorCode])
    this.errorCode = errorCode
    this.attErrorCode = attErrorCode
    this.iosErrorCode = iosErrorCode
    this.iosMessage = iosMessage
    this.androidErrorCode = androidErrorCode
    this.androidMessage = androidMessage
  }
}

export const BleErrorCode = {
  // Implementation specific errors
  UnknownError: 0,
  BluetoothManagerDestroyed: 1,
  OperationCancelled: 2,
  OperationTimedOut: 3,
  OperationStartFailed: 4,
  InvalidUUIDs: 5,

  // Bluetooth global states
  BluetoothUnsupported: 100,
  BluetoothUnauthorized: 101,
  BluetoothPoweredOff: 102,
  BluetoothInUnknownState: 103,
  BluetoothResetting: 104,

  // Peripheral errors.
  DeviceConnectionFailed: 200,
  DeviceDisconnected: 201,
  DeviceRSSIReadFailed: 202,
  DeviceAlreadyConnected: 203,
  DeviceNotFound: 204,
  DeviceNotConnected: 205,

  // Services
  ServicesDiscoveryFailed: 300,
  IncludedServicesDiscoveryFailed: 301,
  ServiceNotFound: 302,

  // Characteristics
  CharacteristicsDiscoveryFailed: 400,
  CharacteristicWriteFailed: 401,
  CharacteristicReadFailed: 402,
  CharacteristicNotifyChangeFailed: 403,
  CharacteristicNotFound: 404,
  CharacteristicInvalidDataFormat: 405,

  // Descriptors
  DescriptorsDiscoveryFailed: 500,
  DescriptorWriteFailed: 501,
  DescriptorReadFailed: 502,
  DescriptorNotFound: 503,
  DescriptorInvalidDataFormat: 504,

  // Scanning errors.
  ScanStartFailed: 600
}

const BleErrorCodeDescription = {
  // Implementation specific errors
  [BleErrorCode.UnknownError]: 'Unknown error occurred. This is probably a bug!',
  [BleErrorCode.BluetoothManagerDestroyed]: 'BleManager was destroyed',
  [BleErrorCode.OperationCancelled]: 'Operation was cancelled',
  [BleErrorCode.OperationTimedOut]: 'Operation timed out',
  [BleErrorCode.OperationStartFailed]: 'Operation was rejected',
  [BleErrorCode.InvalidUUIDs]: 'Invalid UUIDs were passed: {internalMessage}',

  // Bluetooth global states
  [BleErrorCode.BluetoothUnsupported]: 'BluetoothLE is unsupported on this device',
  [BleErrorCode.BluetoothUnauthorized]: 'Device is not authorized to use BluetoothLE',
  [BleErrorCode.BluetoothPoweredOff]: 'BluetoothLE is powered off',
  [BleErrorCode.BluetoothInUnknownState]: 'BluetoothLE is in unknown state',
  [BleErrorCode.BluetoothResetting]: 'BluetoothLE is resetting',

  // Peripheral errors.
  [BleErrorCode.DeviceConnectionFailed]: 'Device {deviceID} connection failed',
  [BleErrorCode.DeviceDisconnected]: 'Device {deviceID} was disconnected',
  [BleErrorCode.DeviceRSSIReadFailed]: 'RSSI read failed for device {deviceID}',
  [BleErrorCode.DeviceAlreadyConnected]: 'Device {deviceID} is already connected',
  [BleErrorCode.DeviceNotFound]: 'Device {deviceID} not found',
  [BleErrorCode.DeviceNotConnected]: 'Device {deviceID} is not connected',

  // Services
  [BleErrorCode.ServicesDiscoveryFailed]: 'Services discovery failed for device {deviceID}',
  [BleErrorCode.IncludedServicesDiscoveryFailed]:
    'Included services discovery failed for device {deviceID} and service: {serviceUUID}',
  [BleErrorCode.ServiceNotFound]: 'Service {serviceUUID} for device {deviceID} not found',

  // Characteristics
  [BleErrorCode.CharacteristicsDiscoveryFailed]:
    'Characteristic discovery failed for device {deviceID} and service {serviceUUID}',
  [BleErrorCode.CharacteristicWriteFailed]:
    'Characteristic {characteristicUUID} write failed for device {deviceID} and service {serviceUUID}',
  [BleErrorCode.CharacteristicReadFailed]:
    'Characteristic {characteristicUUID} read failed for device {deviceID} and service {serviceUUID}',
  [BleErrorCode.CharacteristicNotifyChangeFailed]:
    'Characteristic {characteristicUUID} notify change failed for device {deviceID} and service {serviceUUID}',
  [BleErrorCode.CharacteristicNotFound]: 'Characteristic {characteristicUUID} not found',
  [BleErrorCode.CharacteristicInvalidDataFormat]:
    'Cannot write to characteristic {characteristicUUID} with invalid data format: {internalMessage}',

  // Descriptors
  [BleErrorCode.DescriptorsDiscoveryFailed]:
    'Descriptor {descriptorUUID} discovery failed for device {deviceID}, service {serviceUUID} and characteristic {characteristicUUID}',
  [BleErrorCode.DescriptorWriteFailed]:
    'Descriptor {descriptorUUID} write failed for device {deviceID}, service {serviceUUID} and characteristic {characteristicUUID}',
  [BleErrorCode.DescriptorReadFailed]:
    'Descriptor {descriptorUUID} read failed for device {deviceID}, service {serviceUUID} and characteristic {characteristicUUID}',
  [BleErrorCode.DescriptorNotFound]: 'Descriptor {descriptorUUID} not found',
  [BleErrorCode.DescriptorInvalidDataFormat]:
    'Cannot write to descriptor {descriptorUUID} with invalid data format: {internalMessage}',

  // Scanning errors.
  [BleErrorCode.ScanStartFailed]: 'Cannot start device scanning'
}

export const BleATTErrorCode = {
  Success: 0,
  InvalidHandle: 1,
  ReadNotPermitted: 2,
  WriteNotPermitted: 3,
  InvalidPdu: 4,
  InsufficientAuthentication: 5,
  RequestNotSupported: 6,
  InvalidOffset: 7,
  InsufficientAuthorization: 8,
  PrepareQueueFull: 9,
  AttributeNotFound: 10,
  AttributeNotLong: 11,
  InsufficientEncryptionKeySize: 12,
  InvalidAttributeValueLength: 13,
  UnlikelyError: 14,
  InsufficientEncryption: 15,
  UnsupportedGroupType: 16,
  InsufficientResources: 17
}

export const BleIOSErrorCode = {
  Unknown: 0,
  InvalidParameters: 1,
  InvalidHandle: 2,
  NotConnected: 3,
  OutOfSpace: 4,
  OperationCancelled: 5,
  ConnectionTimeout: 6,
  PeripheralDisconnected: 7,
  UuidNotAllowed: 8,
  AlreadyAdvertising: 9,
  ConnectionFailed: 10,
  ConnectionLimitReached: 11
}

export const BleAndroidErrorCode = {
  IllegalParameter: 0x87,
  NoResources: 0x80,
  InternalError: 0x81,
  WrongState: 0x82,
  DbFull: 0x83,
  Busy: 0x84,
  Error: 0x85,
  CmdStarted: 0x86,
  Pending: 0x88,
  AuthFail: 0x89,
  More: 0x8a,
  InvalidCfg: 0x8b,
  ServiceStarted: 0x8c,
  Success: 0x00,
  EncrypedNoMitm: 0x8d,
  NotEncrypted: 0x8e,
  Congested: 0x8f
}
