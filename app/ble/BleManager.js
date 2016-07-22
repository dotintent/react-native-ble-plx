'use strict';

import { NativeModules, DeviceEventEmitter} from 'react-native';
const BleModule = NativeModules.BleClientManager;

export default class BleManager {
  constructor() {
    BleModule.createClient();
    DeviceEventEmitter.addListener(BleModule.ScanEvent, this._scanEvent.bind(this))
  }

  destroy() {
    BleModule.destroyClient();
  }

  startDeviceScan(uuids, listener) {
    console.log("Start device scan");
    this._scanEventListener = listener;
    BleModule.scanBleDevices(uuids);
  }

  stopDeviceScan() {
    console.log("Stop device scan");
    BleModule.stopScanBleDevices();
    delete this._scanEventListener;
  }

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

  async writeCharacteristic(deviceId, serviceId, characteristicsId, base64Value, transactionId) {
    console.log("Write characteristic: " + characteristicId + " in service: " + serviceId + " for device: " + deviceId + ". transactionId: " + transactionId);
    try {
      var writeSuccessful = await BleModule.writeCharacteristic(deviceId, serviceId, characteristicId, base64Value, transactionId);
      if(writeSuccessful) {
        console.log("Successfull write with transactionId: " + transactionId);
        return transactionId;
      }
    } catch(e) {
      console.log(e);
    }
    console.log("Failed write with transactionId: " + transactionId);
    return nil;
  }

  async readCharacteristic(deviceId, serviceId, characteristicId, transactionId) {
    console.log("Read characteristic: " + characteristicId + " in service: " + serviceId + " for device: " + deviceId + ". transactionId: " + transactionId);
    try {
      var readSuccessfulValue = await BleModule.readCharacteristic(deviceId, serviceId, characteristicId, transactionId);
      if(readSuccessfulValue) {
        console.log("Succecssful read with transactionId: " + transactionId + " and value: " + readSuccessfulValue);
        return readSuccessfulValue;
      }
    } catch(e) {
      console.log(e);
    }
    console.log("Failed read with transactionId: " + transactionId);
    return nil;
  }

  cancelCharacteristicOperation(transactionId) {
    BleModule.cancelCharacteristicOperation(transactionId)
  }

  // Private API

  _scanEvent([error, scannedDevice]) {
    if (this._scanEventListener) {
      this._scanEventListener(error, scannedDevice)
    }
  }
}
