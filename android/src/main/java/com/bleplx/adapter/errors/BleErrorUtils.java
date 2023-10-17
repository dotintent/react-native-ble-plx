package com.bleplx.adapter.errors;


import androidx.annotation.NonNull;

public class BleErrorUtils {

  public static BleError cancelled() {
    return new BleError(BleErrorCode.OperationCancelled, null, null);
  }

  static public BleError invalidIdentifiers(@NonNull String... identifiers) {
    StringBuilder identifiersJoined = new StringBuilder();
    for (String identifier : identifiers) {
      identifiersJoined.append(identifier).append(", ");
    }

    BleError bleError = new BleError(BleErrorCode.InvalidIdentifiers, null, null);
    bleError.internalMessage = identifiersJoined.toString();
    return bleError;
  }

  static public BleError deviceNotFound(String uuid) {
    BleError bleError = new BleError(BleErrorCode.DeviceNotFound, null, null);
    bleError.deviceID = uuid;
    return bleError;
  }

  static public BleError deviceNotConnected(String uuid) {
    BleError bleError = new BleError(BleErrorCode.DeviceNotConnected, null, null);
    bleError.deviceID = uuid;
    return bleError;
  }

  static public BleError characteristicNotFound(String uuid) {
    BleError bleError = new BleError(BleErrorCode.CharacteristicNotFound, null, null);
    bleError.characteristicUUID = uuid;
    return bleError;
  }

  static public BleError invalidWriteDataForCharacteristic(String data, String uuid) {
    BleError bleError = new BleError(BleErrorCode.CharacteristicInvalidDataFormat, null, null);
    bleError.characteristicUUID = uuid;
    bleError.internalMessage = data;
    return bleError;
  }

  static public BleError descriptorNotFound(String uuid) {
    BleError bleError = new BleError(BleErrorCode.DescriptorNotFound, null, null);
    bleError.descriptorUUID = uuid;
    return bleError;
  }

  static public BleError invalidWriteDataForDescriptor(String data, String uuid) {
    BleError bleError = new BleError(BleErrorCode.DescriptorInvalidDataFormat, null, null);
    bleError.descriptorUUID = uuid;
    bleError.internalMessage = data;
    return bleError;
  }

  static public BleError descriptorWriteNotAllowed(String uuid) {
    BleError bleError = new BleError(BleErrorCode.DescriptorWriteNotAllowed, null, null);
    bleError.descriptorUUID = uuid;
    return bleError;
  }

  static public BleError serviceNotFound(String uuid) {
    BleError bleError = new BleError(BleErrorCode.ServiceNotFound, null, null);
    bleError.serviceUUID = uuid;
    return bleError;
  }

  static public BleError cannotMonitorCharacteristic(String reason, String deviceID, String serviceUUID, String characteristicUUID) {
    BleError bleError = new BleError(BleErrorCode.CharacteristicNotifyChangeFailed, reason, null);
    bleError.deviceID = deviceID;
    bleError.serviceUUID = serviceUUID;
    bleError.characteristicUUID = characteristicUUID;
    return bleError;
  }

  public static BleError deviceServicesNotDiscovered(String deviceID) {
    BleError bleError = new BleError(BleErrorCode.ServicesNotDiscovered, null, null);
    bleError.deviceID = deviceID;
    return bleError;
  }
}
