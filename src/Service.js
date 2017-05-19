// @flow
'use strict'

import BleManager from './BleManager'
import Characteristic from './Characteristic'
import type { Subscription } from './BleManager'

/**
 * Internal class describing Service format which
 * is exchanged between native modules and react native.
 * 
 * @access private
 * @class NativeService
 */
class NativeService {
  uuid: string
  deviceID: string
  isPrimary: boolean
}

/**
 * Service object.
 * 
 * @export
 * @class Service
 * @extends {NativeService}
 */
export default class Service extends NativeService {
  _manager: BleManager

  /**
     * Private {@link Service} constructor.
     * 
     * @param {NativeService} props - NativeService properties to be copied.
     * @param {BleManager} manager - Current BleManager instance.
     * @access private
     *
     * @memberOf Device
     */
  constructor(props: NativeService, manager: BleManager) {
    super()
    this._manager = manager

    /** @type {string} 
         *  @desc {@link Service} UUID. */
    this.uuid = props.uuid
    /** @type {string} 
         *  @desc {@link Device} ID who owns this {@link Service}. */
    this.deviceID = props.deviceID
    /** @type {boolean} 
         *  @desc True if service is primary. */
    this.isPrimary = props.isPrimary
  }

  /**
     * {@link BleManager.characteristicsForDevice} with partially filled arguments.
     * 
     * @returns {Promise<Characteristic[]>} - Promise which emits array of {@link Characteristic} objects which are 
     * discovered for this service.
     * 
     * @memberOf Service
     */
  async characteristics(): Promise<Characteristic[]> {
    return this._manager.characteristicsForDevice(this.deviceID, this.uuid)
  }

  /**
     * {@link BleManager.readCharacteristicForDevice} with partially filled arguments.
     * 
     * @param {string} characteristicUUID - {@link Characteristic} UUID.
     * @param {?string} transactionId - optional `transactionId` which can be used in {@link cancelTransaction} function.
     * @returns {Promise<Characteristic>} - Promise which emits first {@link Characteristic} object matching specified 
     * UUID path. Latest value of {@link Characteristic} will be stored inside returned object.
     * 
     * @memberOf Service
     */
  async readCharacteristic(characteristicUUID: string, transactionId: ?string): Promise<Characteristic> {
    return this._manager.readCharacteristicForDevice(this.deviceID, this.uuid, characteristicUUID, transactionId)
  }

  /**
     * {@link BleManager.writeCharacteristicWithResponseForDevice} with partially filled arguments.
     * 
     * @param {string} characteristicUUID - {@link Characteristic} UUID.
     * @param {string} valueBase64 - Value in Base64 format.
     * @param {?string} transactionId - optional `transactionId` which can be used in {@link cancelTransaction} function.
     * @returns {Promise<Characteristic>} - Promise which emits first {@link Characteristic} object matching specified 
     * UUID path. Latest value of characteristic may not be stored inside returned object.
     * 
     * @memberOf Service
     */
  async writeCharacteristicWithResponse(
    characteristicUUID: string,
    valueBase64: string,
    transactionId: ?string
  ): Promise<Characteristic> {
    return this._manager.writeCharacteristicWithResponseForDevice(
      this.deviceID,
      this.uuid,
      characteristicUUID,
      valueBase64,
      transactionId
    )
  }

  /**
     * {@link BleManager.writeCharacteristicWithoutResponseForDevice} with partially filled arguments.
     * 
     * @param {string} characteristicUUID - {@link Characteristic} UUID.
     * @param {string} valueBase64 - Value in Base64 format.
     * @param {?string} transactionId - optional `transactionId` which can be used in {@link cancelTransaction} function.
     * @returns {Promise<Characteristic>} - Promise which emits first {@link Characteristic} object matching specified 
     * UUID path. Latest value of characteristic may not be stored inside returned object.
     * 
     * @memberOf Service
     */
  async writeCharacteristicWithoutResponse(
    characteristicUUID: string,
    valueBase64: string,
    transactionId: ?string
  ): Promise<Characteristic> {
    return this._manager.writeCharacteristicWithoutResponseForDevice(
      this.deviceID,
      this.uuid,
      characteristicUUID,
      valueBase64,
      transactionId
    )
  }

  /**
     * {@link BleManager.monitorCharacteristicForDevice} with partially filled arguments.
     * 
     * @param {string} characteristicUUID - {@link Characteristic} UUID.
     * @param {function(error: ?Error, characteristic: ?Characteristic)} listener - callback which emits 
     * {@link Characteristic} objects with modified value for each notification.
     * @param {?string} transactionId - optional `transactionId` which can be used in {@link cancelTransaction} function.
     * @returns {Subscription} Subscription on which `remove()` function can be called to unsubscribe.
     * 
     * @memberOf Service
     */
  monitorCharacteristic(
    characteristicUUID: string,
    listener: (error: ?Error, characteristic: ?Characteristic) => void,
    transactionId: ?string
  ): Subscription {
    return this._manager.monitorCharacteristicForDevice(
      this.deviceID,
      this.uuid,
      characteristicUUID,
      listener,
      transactionId
    )
  }
}
