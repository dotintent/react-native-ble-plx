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
    console.log("Start device scan");
    this.stopDeviceScan()
    const scanListener = ([error, scannedDevice]) => {
      listener(error, scannedDevice)
    };
    this._scanEventSubscription = this.eventEmitter.addListener(BleModule.ScanEvent, scanListener);
    BleModule.scanBleDevices(uuids);
  }

  stopDeviceScan() {
    console.log("Stop device scan");
    if (this._scanEventSubscription) {
      this._scanEventSubscription.remove()
      delete this._scanEventSubscription
    }
    BleModule.stopScanBleDevices();
  }

  // Handling connections

  async connectToDevice(identifier) {
    console.log("Connecting to device: " + identifier)
    var connectedIdentifier = await BleModule.establishConnection(identifier);
    return connectedIdentifier;
  }

  async closeConnection(identifier) {
    console.log("Closing connection to device: " + identifier)
    var closedIdentifier = await BleModule.closeConnection(identifier);
    return closedIdentifier;
  }

  async serviceIdsForDevice(deviceIdentifier) {
      var services = await BleModule.serviceIdsForDevice(deviceIdentifier);
      return services;
  }

  async characteristicIdsForDevice(deviceIdentifier, serviceIdentifier) {
      var characteristics = await BleModule.characteristicIdsForDevice(deviceIdentifier, serviceIdentifier);
      return characteristics;
  }

  async characteristicDetails(deviceIdentifier, serviceIdentifier, characteristicIdentifier) {
    var characteristicDetails = await BleModule.detailsForCharacteristic(deviceIdentifier, serviceIdentifier, characteristicIdentifier);
    return characteristicDetails;
  }

  async writeCharacteristic(deviceId, serviceId, characteristicsId, base64Value, transactionId) {  
    const writtenValue = await BleModule.writeCharacteristic(deviceId, serviceId, characteristicId, base64Value, transactionId);
    return writtenValue
  }

  async readCharacteristic(deviceId, serviceId, characteristicId, transactionId) {
    const bytes = BleModule.readCharacteristic(deviceId, serviceId, characteristicId, transactionId);
    return bytes
  }

  cancelCharacteristicOperation(transactionId) {
    BleModule.cancelCharacteristicOperation(transactionId)
  }
}
