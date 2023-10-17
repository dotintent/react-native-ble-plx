package com.bleplx.adapter;

import com.bleplx.adapter.errors.BleError;

import java.util.List;

public interface BleAdapter {

  void createClient(String restoreStateIdentifier,
                    OnEventCallback<String> onAdapterStateChangeCallback,
                    OnEventCallback<Integer> onStateRestored);

  void destroyClient();

  void enable(
    String transactionId,
    OnSuccessCallback<Void> onSuccessCallback,
    OnErrorCallback onErrorCallback);

  void disable(
    String transactionId,
    OnSuccessCallback<Void> onSuccessCallback,
    OnErrorCallback onErrorCallback);

  String getCurrentState();

  void startDeviceScan(
    String[] filteredUUIDs,
    int scanMode,
    int callbackType,
    boolean legacyScan,
    OnEventCallback<ScanResult> onEventCallback,
    OnErrorCallback onErrorCallback);

  void stopDeviceScan();

  void requestConnectionPriorityForDevice(
    String deviceIdentifier,
    int connectionPriority,
    String transactionId,
    OnSuccessCallback<Device> onSuccessCallback,
    OnErrorCallback onErrorCallback);

  void readRSSIForDevice(
    String deviceIdentifier,
    String transactionId,
    OnSuccessCallback<Device> onSuccessCallback,
    OnErrorCallback onErrorCallback);

  void requestMTUForDevice(
    String deviceIdentifier,
    int mtu,
    String transactionId,
    OnSuccessCallback<Device> onSuccessCallback,
    OnErrorCallback onErrorCallback);

  void getKnownDevices(
    String[] deviceIdentifiers,
    OnSuccessCallback<Device[]> onSuccessCallback,
    OnErrorCallback onErrorCallback);

  void getConnectedDevices(
    String[] serviceUUIDs,
    OnSuccessCallback<Device[]> onSuccessCallback,
    OnErrorCallback onErrorCallback);

  void connectToDevice(
    String deviceIdentifier,
    ConnectionOptions connectionOptions,
    OnSuccessCallback<Device> onSuccessCallback,
    OnEventCallback<ConnectionState> onConnectionStateChangedCallback,
    OnErrorCallback onErrorCallback);

  void cancelDeviceConnection(
    String deviceIdentifier,
    OnSuccessCallback<Device> onSuccessCallback,
    OnErrorCallback onErrorCallback);

  void isDeviceConnected(
    String deviceIdentifier,
    OnSuccessCallback<Boolean> onSuccessCallback,
    OnErrorCallback onErrorCallback);

  void discoverAllServicesAndCharacteristicsForDevice(
    String deviceIdentifier,
    String transactionId,
    OnSuccessCallback<Device> onSuccessCallback,
    OnErrorCallback onErrorCallback);

  List<Service> getServicesForDevice(
    String deviceIdentifier) throws BleError;

  List<Characteristic> getCharacteristicsForDevice(
    String deviceIdentifier,
    String serviceUUID) throws BleError;

  List<Characteristic> getCharacteristicsForService(
    int serviceIdentifier) throws BleError;

  List<Descriptor> descriptorsForDevice(
    String deviceIdentifier,
    String serviceUUID,
    String characteristicUUID) throws BleError;

  List<Descriptor> descriptorsForService(
    int serviceIdentifier,
    String characteristicUUID) throws BleError;

  List<Descriptor> descriptorsForCharacteristic(
    int characteristicIdentifier) throws BleError;


  void readCharacteristicForDevice(
    String deviceIdentifier,
    String serviceUUID,
    String characteristicUUID,
    String transactionId,
    OnSuccessCallback<Characteristic> onSuccessCallback,
    OnErrorCallback onErrorCallback);

  void readCharacteristicForService(
    int serviceIdentifier,
    String characteristicUUID,
    String transactionId,
    OnSuccessCallback<Characteristic> onSuccessCallback,
    OnErrorCallback onErrorCallback);

  void readCharacteristic(
    int characteristicIdentifer,
    String transactionId,
    OnSuccessCallback<Characteristic> onSuccessCallback,
    OnErrorCallback onErrorCallback);

  void writeCharacteristicForDevice(
    String deviceIdentifier,
    String serviceUUID,
    String characteristicUUID,
    String valueBase64,
    boolean withResponse,
    String transactionId,
    OnSuccessCallback<Characteristic> onSuccessCallback,
    OnErrorCallback onErrorCallback);

  void writeCharacteristicForService(
    int serviceIdentifier,
    String characteristicUUID,
    String valueBase64,
    boolean withResponse,
    String transactionId,
    OnSuccessCallback<Characteristic> onSuccessCallback,
    OnErrorCallback onErrorCallback);

  void writeCharacteristic(
    int characteristicIdentifier,
    String valueBase64,
    boolean withResponse,
    String transactionId,
    OnSuccessCallback<Characteristic> onSuccessCallback,
    OnErrorCallback onErrorCallback);

  void monitorCharacteristicForDevice(
    String deviceIdentifier,
    String serviceUUID,
    String characteristicUUID,
    String transactionId,
    OnEventCallback<Characteristic> onEventCallback,
    OnErrorCallback onErrorCallback);

  void monitorCharacteristicForService(
    int serviceIdentifier,
    String characteristicUUID,
    String transactionId,
    OnEventCallback<Characteristic> onEventCallback,
    OnErrorCallback onErrorCallback);

  void monitorCharacteristic(
    int characteristicIdentifier,
    String transactionId,
    OnEventCallback<Characteristic> onEventCallback,
    OnErrorCallback onErrorCallback);

  void readDescriptorForDevice(
    final String deviceId,
    final String serviceUUID,
    final String characteristicUUID,
    final String descriptorUUID,
    final String transactionId,
    OnSuccessCallback<Descriptor> successCallback,
    OnErrorCallback errorCallback);

  void readDescriptorForService(
    final int serviceIdentifier,
    final String characteristicUUID,
    final String descriptorUUID,
    final String transactionId,
    OnSuccessCallback<Descriptor> successCallback,
    OnErrorCallback errorCallback);

  void readDescriptorForCharacteristic(
    final int characteristicIdentifier,
    final String descriptorUUID,
    final String transactionId,
    OnSuccessCallback<Descriptor> successCallback,
    OnErrorCallback errorCallback);

  void readDescriptor(
    final int descriptorIdentifier,
    final String transactionId,
    OnSuccessCallback<Descriptor> onSuccessCallback,
    OnErrorCallback onErrorCallback);

  void writeDescriptorForDevice(
    final String deviceId,
    final String serviceUUID,
    final String characteristicUUID,
    final String descriptorUUID,
    final String valueBase64,
    final String transactionId,
    OnSuccessCallback<Descriptor> successCallback,
    OnErrorCallback errorCallback);

  void writeDescriptorForService(
    final int serviceIdentifier,
    final String characteristicUUID,
    final String descriptorUUID,
    final String valueBase64,
    final String transactionId,
    OnSuccessCallback<Descriptor> successCallback,
    OnErrorCallback errorCallback);

  void writeDescriptorForCharacteristic(
    final int characteristicIdentifier,
    final String descriptorUUID,
    final String valueBase64,
    final String transactionId,
    OnSuccessCallback<Descriptor> successCallback,
    OnErrorCallback errorCallback);

  void writeDescriptor(
    final int descriptorIdentifier,
    final String valueBase64,
    final String transactionId,
    OnSuccessCallback<Descriptor> successCallback,
    OnErrorCallback errorCallback);

  void cancelTransaction(String transactionId);

  void setLogLevel(String logLevel);

  String getLogLevel();
}
