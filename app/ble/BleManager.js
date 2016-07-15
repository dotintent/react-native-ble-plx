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

  // Private API

  _scanEvent([error, scannedDevice]) {
    this._scanEventListener(error, scannedDevice)
  }
}
