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
