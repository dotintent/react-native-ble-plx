'use strict';

import { NativeModules, NativeEventEmitter} from 'react-native';
const BleModule = NativeModules.BleClientManager;

export default class BleManager {
  constructor() {
    BleModule.createClient();
    this.eventEmitter = new NativeEventEmitter(BleModule)
  }

  destroy() {
    BleModule.destroyClient();
  }

  // Scanning...

  startDeviceScan(uuids, listener) {
    this.stopDeviceScan()
    const scanListener = ([error, scannedDevice]) => {
      listener(error, scannedDevice)
    };
    this._scanEventSubscription = this.eventEmitter.addListener(BleModule.ScanEvent, scanListener);
    BleModule.scanBleDevices(uuids);
  }

  stopDeviceScan() {
    if (this._scanEventSubscription) {
      this._scanEventSubscription.remove()
      delete this._scanEventSubscription
    }
    BleModule.stopScanBleDevices();
  }

  // Handling connections

  async connectToDevice(identifier) {
    var connectedIdentifier = await BleModule.establishConnection(identifier);
    return connectedIdentifier;
  }

  async closeConnection(identifier) {
    var closedIdentifier = await BleModule.closeConnection(identifier);
    return closedIdentifier;
  }

  async serviceIdsForDevice(deviceIdentifier) {
    try {
      var services = await BleModule.serviceIdsForDevice(deviceIdentifier);
      return services;
    } catch(e) {
      console.log(e);
    }
    return nil;
  }

  async characteristicIdsForDevice(deviceIdentifier, serviceIdentifier) {
    try {
      var characteristics = await BleModule.characteristicIdsForDevice(deviceIdentifier, serviceIdentifier);
      return characteristics;
    } catch(e) {
      console.log(e);
    }
    return nil;
  }

  async characteristicDetails(deviceIdentifier, serviceIdentifier, characteristicIdentifier) {
    var characteristicDetails = await BleModule.detailsForCharacteristic(deviceIdentifier, serviceIdentifier, characteristicIdentifier);
    return characteristicDetails;
  }

  async writeCharacteristic(deviceId, serviceId, characteristicId, base64Value, transactionId) {  
    const writtenValue = await BleModule.writeCharacteristic(deviceId, serviceId, characteristicId, base64Value, transactionId);
    return writtenValue
  }

  async notifyCharacteristic(deviceId, serviceId, characteristicId, notify, transactionId) {
    const notified = await BleModule.notifyCharacteristic(deviceId, serviceId, characteristicId, notify, transactionId);
    return notified
  }

  async readCharacteristic(deviceId, serviceId, characteristicId, transactionId) {
    const bytes = await BleModule.readCharacteristic(deviceId, serviceId, characteristicId, transactionId);
    return bytes
  }

  async monitorCharacteristic(deviceId, serviceId, characteristicId, transactionId, listener) {
    const monitorListener = ([error, deviceId2, serviceId2, characteristicId2, valueBase64]) => {
      if (deviceId !== deviceId2 || serviceId !== serviceId2 || characteristicId !== characteristicId2) return
      listener(valueBase64)
    };

    const subscription = this.eventEmitter.addListener(BleModule.NotifyEvent, monitorListener);
    await BleModule.monitorCharacteristic(deviceId, serviceId, characteristicId, transactionId);

    subscription.remove()
  }

  cancelCharacteristicOperation(transactionId) {
    BleModule.cancelCharacteristicOperation(transactionId)
  }
}
