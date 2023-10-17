package com.bleplx.adapter.errors;


public enum BleErrorCode {

  UnknownError(0),
  BluetoothManagerDestroyed(1),
  OperationCancelled(2),
  OperationTimedOut(3),
  OperationStartFailed(4),
  InvalidIdentifiers(5),

  BluetoothUnsupported(100),
  BluetoothUnauthorized(101),
  BluetoothPoweredOff(102),
  BluetoothInUnknownState(103),
  BluetoothResetting(104),
  BluetoothStateChangeFailed(105),

  DeviceConnectionFailed(200),
  DeviceDisconnected(201),
  DeviceRSSIReadFailed(202),
  DeviceAlreadyConnected(203),
  DeviceNotFound(204),
  DeviceNotConnected(205),
  DeviceMTUChangeFailed(206),

  ServicesDiscoveryFailed(300),
  IncludedServicesDiscoveryFailed(301),
  ServiceNotFound(302),
  ServicesNotDiscovered(303),

  CharacteristicsDiscoveryFailed(400),
  CharacteristicWriteFailed(401),
  CharacteristicReadFailed(402),
  CharacteristicNotifyChangeFailed(403),
  CharacteristicNotFound(404),
  CharacteristicsNotDiscovered(405),
  CharacteristicInvalidDataFormat(406),

  DescriptorsDiscoveryFailed(500),
  DescriptorWriteFailed(501),
  DescriptorReadFailed(502),
  DescriptorNotFound(503),
  DescriptorsNotDiscovered(504),
  DescriptorInvalidDataFormat(505),
  DescriptorWriteNotAllowed(506),

  ScanStartFailed(600),
  LocationServicesDisabled(601);

  public final int code;

  BleErrorCode(int code) {
    this.code = code;
  }
}
