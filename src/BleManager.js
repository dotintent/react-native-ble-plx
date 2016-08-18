'use strict';

import { NativeModules, NativeEventEmitter} from 'react-native';
import Device from './Device';
import Service from './Service';
import Characteristic from './Characteristic';

const BleModule = NativeModules.BleClientManager;

export default class BleManager {
  constructor() {
    BleModule.createClient();
    this.eventEmitter = new NativeEventEmitter(BleModule)
    this.uniqueId = 0
  }

  destroy() {
    BleModule.destroyClient();
  }

  nextUniqueID() {
    this.uniqueId += 1
    return this.uniqueId.toString()
  }

  // Mark: Common --------------------------------------------------------------------------------------------------------

  cancelTransaction(transactionId) {
    BleModule.cancelTransaction(transactionId)
  }

  // Mark: Monitoring state ----------------------------------------------------------------------------------------------

  state() {
    return BleModule.state()
  }

  onStateChange(listener) {
    const subscription = this.eventEmitter.addListener(BleModule.StateChangeEvent, listener);
    return subscription
  }

  // Mark: Scanning ------------------------------------------------------------------------------------------------------

  startDeviceScan(uuids, options, listener) {
    this.stopDeviceScan()
    const scanListener = ([error, device]) => {
      listener(error, device ? new Device(device, this) : null)
    };
    this._scanEventSubscription = this.eventEmitter.addListener(BleModule.ScanEvent, scanListener);
    BleModule.startDeviceScan(uuids, options);
  }

  stopDeviceScan() {
    if (this._scanEventSubscription) {
      this._scanEventSubscription.remove()
      delete this._scanEventSubscription
    }
    BleModule.stopDeviceScan();
  }

  // Mark: Connection management -----------------------------------------------------------------------------------------

  async connectToDevice(deviceIdentifier, options) {
    const deviceProps = await BleModule.connectToDevice(deviceIdentifier, options);
    return new Device(deviceProps, this);
  }

  async cancelDeviceConnection(deviceIdentifier) {
    const deviceProps = await BleModule.cancelDeviceConnection(deviceIdentifier);
    return new Device(deviceProps, this);
  }

  onDeviceDisconnected(deviceIdentifier, listener) {
    const disconnectionListener = ([error, device]) => {
      if (deviceIdentifier !== device.uuid) return
      listener(error, device)
    };    

    const subscription = this.eventEmitter.addListener(BleModule.DisconnectionEvent, disconnectionListener);
    return subscription
  }

  isDeviceConnected(deviceIdentifier) {
    return BleModule.isDeviceConnected(deviceIdentifier)
  }

  // Mark: Discovery -------------------------------------------------------------------------------------------------

  async discoverAllServicesAndCharacteristicsForDevice(identifier) {
    const deviceProps = await BleModule.discoverAllServicesAndCharacteristicsForDevice(identifier)
    return new Device(deviceProps, this)
  }

  // Mark: Service and characteristic getters ------------------------------------------------------------------------

  async servicesForDevice(deviceIdentifier) {
    const services = await BleModule.servicesForDevice(deviceIdentifier)
    return services.map((serviceProps) => { return new Service(serviceProps, this) })
  }

  async characteristicsForDevice(deviceIdentifier, serviceUUID) {
    const characteristics = await BleModule.characteristicsForDevice(deviceIdentifier, serviceUUID);
    return characteristics.map((characteristicProps) => { return new Characteristic(characteristicProps, this)});
  }

  // Mark: Characteristics operations --------------------------------------------------------------------------------

  async readCharacteristicForDevice(deviceIdentifier, serviceUUID, characteristicUUID, transactionId) {
    if (!transactionId) {
      transactionId = this.nextUniqueID()
    }

    const characteristicProps = await BleModule.readCharacteristicForDevice(deviceIdentifier, serviceUUID, characteristicUUID, transactionId);
    return new Characteristic(characteristicProps, this)
  }

  async writeCharacteristicWithResponseForDevice(deviceIdentifier, serviceUUID, characteristicUUID, base64Value, transactionId) {
    if (!transactionId) {
      transactionId = this.nextUniqueID()
    }

    const characteristicProps = await BleModule.writeCharacteristicForDevice(deviceIdentifier, serviceUUID, characteristicUUID, base64Value, true, transactionId);
    return new Characteristic(characteristicProps, this)
  }

  async writeCharacteristicWithoutResponseForDevice(deviceIdentifier, serviceUUID, characteristicUUID, base64Value, transactionId) {
    if (!transactionId) {
      transactionId = this.nextUniqueID()
    }

    const characteristicProps = await BleModule.writeCharacteristicForDevice(deviceIdentifier, serviceUUID, characteristicUUID, base64Value, false, transactionId);
    return new Characteristic(characteristicProps, this)
  }

  monitorCharacteristicForDevice(deviceIdentifier, serviceUUID, characteristicUUID, listener, transactionId) {
    if (!transactionId) {
      transactionId = this.nextUniqueID()
    }

    const monitorListener = ([error, characteristic]) => {
      if (error) {
        listener(error, null)
        return
      }

      if (characteristic.deviceUUID.toUpperCase() !== deviceIdentifier.toUpperCase()   ||
          characteristic.serviceUUID.toUpperCase() !== serviceUUID.toUpperCase() || 
          characteristic.uuid.toUpperCase() !== characteristicUUID.toUpperCase()) return

      listener(null, new Characteristic(characteristic, this))
    };

    const subscription = this.eventEmitter.addListener(BleModule.ReadEvent, monitorListener);
    BleModule.monitorCharacteristicForDevice(deviceIdentifier, serviceUUID, characteristicUUID, transactionId)
      .then((finished) => {
        subscription.remove()
      }, (error) => {
        listener(error, null)
        subscription.remove()
      })

    return {
      remove: () => {
        BleModule.cancelTransaction(transactionId)
      }
    }
  }
}
