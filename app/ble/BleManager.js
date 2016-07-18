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

  startDeviceScan(listener) {
    console.log("Start device scan");
    this._scanEventListener = listener;
    BleModule.scanBleDevices();
  }

  stopDeviceScan() {
    console.log("Stop device scan");
    BleModule.stopScanBleDevices();
    delete this._scanEventListener;
  }

  async connectToDevice(identifier) {
    console.log("Connecting to device: " + identifier)
    try {
      var isConnected = await BleModule.establishConnection(identifier)
      if(isConnected) {
        console.log("Connected to device: " + identifier);
        return true;
      }
    } catch (e) {
      console.log(e);
    }
    console.log("Couldn't connect to device: " + identifier);
    return false;
  }

  // TODO: add disconnect method

  async discoverServices(identifier) {
    console.log("Discovering services and characteristics for device: " + identifier);
    try {
      var isDiscovered = await BleModule.discoverServices(identifier)
      if(isDiscovered) {
        console.log("Discovered services and characteristics for device: " + identifier);
        return true;
      }
    } catch(e) {
      console.log(e);
    }
    console.log("Couldn't discover services and characteristics for device: " + identifier);
    return false;
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

  // Private API

  _scanEvent([error, scannedDevice]) {
    if (this._scanEventListener) {
      this._scanEventListener(error, scannedDevice)
    }
  }
}
