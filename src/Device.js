// @flow
'use strict'

import BleManager from './BleManager'
import Characteristic from './Characteristic'
import Service from './Service'
import type { Subscription, ConnectionOptions } from './BleManager'

/**
 * Internal class describing Device format which
 * is exchanged between native modules and react native.
 * 
 * @access private
 * @class NativeDevice
 */
class NativeDevice {
  id: string
  name: ?string
  rssi: ?number

  // Advertisement
  manufacturerData: ?string
  serviceUUIDs: ?(string[])
  txPowerLevel: ?number
  solicitedServiceUUIDs: ?(string[])
  isConnectable: ?boolean
  overflowServiceUUIDs: ?(string[])
  serviceData: ?{ [service: string]: string }
}

/**
 * Device object.
 * 
 * @export
 * @class Device
 * @extends {NativeDevice}
 */
export default class Device extends NativeDevice {
  _manager: BleManager

  /**
     * Private {@link Device} constructor.
     * 
     * @param {NativeDevice} props - NativeDevice properties to be copied.
     * @param {BleManager} manager - Current BleManager instance.
     * @access private
     *
     * @memberOf Device
     */
  constructor(props: NativeDevice, manager: BleManager) {
    super()
    this._manager = manager
    /** @type {string} 
         *  @desc Device identifier. */
    this.id = props.id
    /** @type {?string} 
         *  @desc Device name, may be `null`. */
    this.name = props.name
    /** @type {?number} 
         *  @desc Device Received Signal Strength Indication value, may be `null`. */
    this.rssi = props.rssi
    /** @type {?string} 
         *  @desc Device Manufacturer Data in Base64 format, may be `null`. */
    this.manufacturerData = props.manufacturerData
    /** @type {?string[]} 
         *  @desc UUIDs of advertised {@link Service}s, may be `null`. */
    this.serviceUUIDs = props.serviceUUIDs
    /** @type {?number} 
         *  @desc Transmitted power level, may be `null`. */
    this.txPowerLevel = props.txPowerLevel
    /** @type {?string[]} 
         *  @desc Solicited {@link Service} UUIDs, may be `null`. */
    this.solicitedServiceUUIDs = props.solicitedServiceUUIDs
    /** @type {?boolean} 
         *  @desc Is Device connectable (iOS only), may be `null`. */
    this.isConnectable = props.isConnectable
    /** @type {?string[]} 
         *  @desc Overflow {@link Service} UUIDs (iOS only), may be `null`. */
    this.overflowServiceUUIDs = props.overflowServiceUUIDs
    /** @type {?{[service:string]:string}} 
         *  @desc Data related to specific {@link Service}, may be `null`. */
    this.serviceData = props.serviceData
  }

  /**
     * {@link BleManager.connectToDevice} with partially filled arguments.
     * 
     * @param {?ConnectionOptions} options - Platform specific options for connection establishment. Not used currently.
     * @returns {Promise<Device>} Connected {@link Device} object if successful.
     *  
     * @memberOf Device
     */
  async connect(options: ?ConnectionOptions): Promise<Device> {
    return this._manager.connectToDevice(this.id, options)
  }

  /**
     * {@link BleManager.cancelDeviceConnection} with partially filled arguments.
     * 
     * @returns {Promise<Device>} Returns closed {@link Device} when operation is successful.
     * 
     * @memberOf Device
     */
  async cancelConnection(): Promise<Device> {
    return this._manager.cancelDeviceConnection(this.id)
  }

  /**
     * {@link BleManager.isDeviceConnected} with partially filled arguments.
     * 
     * @returns {Promise<boolean>} - Promise which emits `true` if device is connected, and `false` otherwise.
     * 
     * @memberOf Device
     */
  async isConnected(): Promise<boolean> {
    return this._manager.isDeviceConnected(this.id)
  }

  /**
     * {@link BleManager.onDeviceDisconnected} with partially filled arguments.
     * 
     * @param {function(error: ?Error, device: Device)} listener - callback returning error as a reason of disconnection 
     * if available and {@link Device} object.
     * @returns {Subscription} Subscription on which `remove()` function can be called to unsubscribe.
     * 
     * @memberOf Device
     */
  onDisconnected(listener: (error: ?Error, device: Device) => void): Subscription {
    return this._manager.onDeviceDisconnected(this.id, listener)
  }

  /**
     * {@link BleManager.discoverAllServicesAndCharacteristicsForDevice} with partially filled arguments.
     * 
     * @returns {Promise<Device>} - Promise which emits {@link Device} object if all available services and 
     * characteristics have been discovered.
     * 
     * @memberOf Device
     */
  async discoverAllServicesAndCharacteristics(): Promise<Device> {
    return this._manager.discoverAllServicesAndCharacteristicsForDevice(this.id)
  }

  /**
     * {@link BleManager.servicesForDevice} with partially filled arguments.
     * 
     * @returns {Promise<Service[]>} - Promise which emits array of {@link Service} objects which are discovered by this
     * device.
     * 
     * @memberOf Device
     */
  async services(): Promise<Service[]> {
    return this._manager.servicesForDevice(this.id)
  }

  /**
     * {@link BleManager.characteristicsForDevice} with partially filled arguments.
     * 
     * @param {string} serviceUUID - {@link Service} UUID.
     * @returns {Promise<Characteristic[]>} - Promise which emits array of {@link Characteristic} objects which are 
     * discovered for a {@link Device} in specified {@link Service}.
     * 
     * @memberOf Device
     */
  async characteristicsForService(serviceUUID: string): Promise<Characteristic[]> {
    return this._manager.characteristicsForDevice(this.id, serviceUUID)
  }

  /**
     * {@link BleManager.readCharacteristicForDevice} with partially filled arguments.
     * 
     * @param {string} serviceUUID - {@link Service} UUID.
     * @param {string} characteristicUUID - {@link Characteristic} UUID.
     * @param {?string} transactionId - optional `transactionId` which can be used in {@link cancelTransaction} function.
     * @returns {Promise<Characteristic>} - Promise which emits first {@link Characteristic} object matching specified 
     * UUID paths. Latest value of {@link Characteristic} will be stored inside returned object.
     * 
     * @memberOf Device
     */
  async readCharacteristicForService(
    serviceUUID: string,
    characteristicUUID: string,
    transactionId: ?string
  ): Promise<Characteristic> {
    return this._manager.readCharacteristicForDevice(this.id, serviceUUID, characteristicUUID, transactionId)
  }

  /**
     * {@link BleManager.writeCharacteristicWithResponseForDevice} with partially filled arguments.
     * 
     * @param {string} serviceUUID - {@link Service} UUID.
     * @param {string} characteristicUUID - {@link Characteristic} UUID.
     * @param {string} valueBase64 - Value in Base64 format.
     * @param {?string} transactionId - optional `transactionId` which can be used in {@link cancelTransaction} function.
     * @returns {Promise<Characteristic>} - Promise which emits first {@link Characteristic} object matching specified 
     * UUID paths. Latest value of characteristic may not be stored inside returned object.
     * 
     * @memberOf Device
     */
  async writeCharacteristicWithResponseForService(
    serviceUUID: string,
    characteristicUUID: string,
    valueBase64: string,
    transactionId: ?string
  ): Promise<Characteristic> {
    return this._manager.writeCharacteristicWithResponseForDevice(
      this.id,
      serviceUUID,
      characteristicUUID,
      valueBase64,
      transactionId
    )
  }

  /**
     * {@link BleManager.writeCharacteristicWithoutResponseForDevice} with partially filled arguments.
     * 
     * @param {string} serviceUUID - {@link Service} UUID.
     * @param {string} characteristicUUID - {@link Characteristic} UUID.
     * @param {string} valueBase64 - Value in Base64 format.
     * @param {?string} transactionId - optional `transactionId` which can be used in {@link cancelTransaction} function.
     * @returns {Promise<Characteristic>} - Promise which emits first {@link Characteristic} object matching specified 
     * UUID paths. Latest value of characteristic may not be stored inside returned object.
     * 
     * @memberOf Device
     */
  async writeCharacteristicWithoutResponseForService(
    serviceUUID: string,
    characteristicUUID: string,
    valueBase64: string,
    transactionId: ?string
  ): Promise<Characteristic> {
    return this._manager.writeCharacteristicWithoutResponseForDevice(
      this.id,
      serviceUUID,
      characteristicUUID,
      valueBase64,
      transactionId
    )
  }

  /**
     * {@link BleManager.monitorCharacteristicForDevice} with partially filled arguments.
     * 
     * @param {string} serviceUUID - {@link Service} UUID.
     * @param {string} characteristicUUID - {@link Characteristic} UUID.
     * @param {function(error: ?Error, characteristic: ?Characteristic)} listener - callback which emits 
     * {@link Characteristic} objects with modified value for each notification.
     * @param {?string} transactionId - optional `transactionId` which can be used in {@link cancelTransaction} function.
     * @returns {Subscription} Subscription on which `remove()` function can be called to unsubscribe.
     * 
     * @memberOf Device
     */
  monitorCharacteristicForService(
    serviceUUID: string,
    characteristicUUID: string,
    listener: (error: ?Error, characteristic: ?Characteristic) => void,
    transactionId: ?string
  ): Subscription {
    return this._manager.monitorCharacteristicForDevice(
      this.id,
      serviceUUID,
      characteristicUUID,
      listener,
      transactionId
    )
  }
}
