// @flow
'use strict';

import { NativeModules, NativeEventEmitter } from 'react-native';
import Device from './Device';
import Service from './Service';
import Characteristic from './Characteristic';
import { fullUUID } from './Utils';

const BleModule = NativeModules.BleClientManager;

export type State =
  'Unknown'
  | 'Resetting'
  | 'Unsupported'
  | 'Unauthorized'
  | 'PoweredOff'
  | 'PoweredOn'

export type Subscription = {
  remove: () => void
}

export type ScanOptions = {
  allowDuplicates?: boolean,
  autoConnect?: boolean
}

export type ConnectionOptions = {
  // Not used for now
}

export default class BleManager {

  _scanEventSubscription: ?NativeEventEmitter
  _eventEmitter: NativeEventEmitter
  _uniqueId: number

  constructor() {
    BleModule.createClient();
    this._eventEmitter = new NativeEventEmitter(BleModule)
    this._uniqueId = 0
  }

  destroy() {
    BleModule.destroyClient();
  }

  _nextUniqueID(): string {
    this._uniqueId += 1
    return this._uniqueId.toString()
  }

  // Mark: Common --------------------------------------------------------------------------------------------------------

  cancelTransaction(transactionId: string) {
    BleModule.cancelTransaction(transactionId)
  }

  // Mark: Monitoring state ----------------------------------------------------------------------------------------------

  state(): State {
    return BleModule.state()
  }

  onStateChange(listener: (newState: State) => void): Subscription {
    const subscription = this._eventEmitter.addListener(BleModule.StateChangeEvent, listener);
    return subscription
  }

  // Mark: Scanning ------------------------------------------------------------------------------------------------------

  startDeviceScan(UUIDs: ?string[], options: ?ScanOptions, listener: (error: ?Error, scannedDevice: ?Device) => void) {
    this.stopDeviceScan()
    const scanListener = ([error, device]) => {
      listener(error, device ? new Device(device, this) : null)
    };
    this._scanEventSubscription = this._eventEmitter.addListener(BleModule.ScanEvent, scanListener);
    BleModule.startDeviceScan(UUIDs, options);
  }

  stopDeviceScan() {
    if (this._scanEventSubscription) {
      this._scanEventSubscription.remove()
      delete this._scanEventSubscription
    }
    BleModule.stopDeviceScan();
  }

  // Mark: Connection management -----------------------------------------------------------------------------------------

  async connectToDevice(deviceIdentifier: string, options: ?ConnectionOptions): Promise<Device> {
    const deviceProps = await BleModule.connectToDevice(deviceIdentifier, options);
    return new Device(deviceProps, this);
  }

  async cancelDeviceConnection(deviceIdentifier: string): Promise<Device> {
    const deviceProps = await BleModule.cancelDeviceConnection(deviceIdentifier);
    return new Device(deviceProps, this);
  }

  onDeviceDisconnected(deviceIdentifier: string, listener: (error: ?Error, device: ?Device) => void): Subscription {
    const disconnectionListener = ([error, device]) => {
      if (deviceIdentifier !== device.uuid) return
      listener(error, device)
    };

    const subscription = this._eventEmitter.addListener(BleModule.DisconnectionEvent, disconnectionListener);
    return subscription
  }

  async isDeviceConnected(deviceIdentifier: string): Promise<boolean> {
    return BleModule.isDeviceConnected(deviceIdentifier)
  }

  // Mark: Discovery -------------------------------------------------------------------------------------------------

  async discoverAllServicesAndCharacteristicsForDevice(identifier: string): Promise<Device> {
    const deviceProps = await BleModule.discoverAllServicesAndCharacteristicsForDevice(identifier)
    return new Device(deviceProps, this)
  }

  // Mark: Service and characteristic getters ------------------------------------------------------------------------

  async servicesForDevice(deviceIdentifier: string): Promise<Service[]> {
    const services = await BleModule.servicesForDevice(deviceIdentifier)
    return services.map((serviceProps) => { return new Service(serviceProps, this) })
  }

  async characteristicsForDevice(deviceIdentifier: string, serviceUUID: string): Promise<Characteristic[]> {
    const characteristics = await BleModule.characteristicsForDevice(deviceIdentifier, serviceUUID);
    return characteristics.map((characteristicProps) => { return new Characteristic(characteristicProps, this) });
  }

  // Mark: Characteristics operations --------------------------------------------------------------------------------

  async readCharacteristicForDevice(
    deviceIdentifier: string,
    serviceUUID: string,
    characteristicUUID: string,
    transactionId: ?string): Promise<Characteristic> {
    if (!transactionId) {
      transactionId = this._nextUniqueID()
    }

    const characteristicProps = await BleModule.readCharacteristicForDevice(deviceIdentifier,
      serviceUUID,
      characteristicUUID,
      transactionId);
    return new Characteristic(characteristicProps, this)
  }

  async writeCharacteristicWithResponseForDevice(deviceIdentifier: string,
    serviceUUID: string,
    characteristicUUID: string,
    base64Value: string,
    transactionId: ?string): Promise<Characteristic> {
    if (!transactionId) {
      transactionId = this._nextUniqueID()
    }

    const characteristicProps = await BleModule.writeCharacteristicForDevice(deviceIdentifier,
      serviceUUID,
      characteristicUUID,
      base64Value,
      true,
      transactionId);
    return new Characteristic(characteristicProps, this)
  }

  async writeCharacteristicWithoutResponseForDevice(deviceIdentifier: string,
    serviceUUID: string,
    characteristicUUID: string,
    base64Value: string,
    transactionId: ?string): Promise<Characteristic> {
    if (!transactionId) {
      transactionId = this._nextUniqueID()
    }

    const characteristicProps = await BleModule.writeCharacteristicForDevice(deviceIdentifier,
      serviceUUID,
      characteristicUUID,
      base64Value,
      false,
      transactionId);
    return new Characteristic(characteristicProps, this)
  }

  monitorCharacteristicForDevice(deviceIdentifier: string,
    serviceUUID: string,
    characteristicUUID: string,
    listener: (error: ?Error, characteristic: ?Characteristic) => void,
    transactionId: ?string): Subscription {
    if (!transactionId) {
      transactionId = this._nextUniqueID()
    }

    const monitorListener = ([error, characteristic, msgTransactionId]) => {
      if (transactionId !== msgTransactionId) return
      if (error) {
        listener(error, null)
        return
      }
      listener(null, new Characteristic(characteristic, this))
    };

    const subscription = this._eventEmitter.addListener(BleModule.ReadEvent, monitorListener);
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
