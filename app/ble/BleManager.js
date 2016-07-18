'use strict';

import { NativeModules, DeviceEventEmitter} from 'react-native';
const BleModule = NativeModules.BleClientManager;

export default class BleManager {
  constructor() {
    BleModule.createClient();
    DeviceEventEmitter.addListener(BleModule.ScanEvent, this._scanEvent.bind(this))
  }

  startPeripheralScan(listener) {
    console.log("Start peripheral scan");
    this._scanEventListener = listener;
    BleModule.scanBleDevices();
  }

  stopPeripheralScan() {
    console.log("Stop peripheral scan");
    BleModule.stopScanBleDevices();
    delete this._scanEventListener;
  }

  async connecToDevice(identifier) {
    console.log("Connecting to device: " + identifier)
    try {
      var isConnected = await BleModule.establishConnection(identifier)
      if(isConnected) {
        console.log("Connected to device: " + identifier);
        return true;
      } else {
        console.log("Couldn't connect to device: " + identifier);
        return false;
      }
    } catch (e) {
      console.log(e);
    }
    return false;
  }

  // Private API

  _scanEvent([error, scannedDevice]) {
    if (this._scanEventListener) {
      this._scanEventListener(error, scannedDevice)
    }
  }
}
