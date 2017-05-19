// @flow
'use strict'

import { BleManager } from './BleManager'
import { Characteristic } from './Characteristic'
import type { NativeService } from './BleModule'
import type { DeviceId, Base64, UUID, Subscription, TransactionId } from './TypeDefinition'

/**
 * Service object.
 */
export class Service implements NativeService {
  // Internal handle to BLE Manager
  _manager: BleManager
  /**
   * Service UUID
   */
  uuid: UUID
  /**
   * Device's ID to which service belongs
   */
  deviceID: DeviceId
  /**
   * Value indicating whether the type of service is primary or secondary.
   */
  isPrimary: boolean

  /**
   * Private constructor used to create {@link Service} object.
   * 
   * @param {NativeService} nativeService NativeService properties to be copied.
   * @param {BleManager} manager Current BleManager instance.
   */
  constructor(nativeService: NativeService, manager: BleManager) {
    // $FlowFixMe Should be fixed in flow 0.46
    Object.assign(this, nativeService, { _manager: manager })
  }

  /**
   * {@link BleManager#characteristicsForDevice} with partially filled arguments.
   * 
   * @returns {Promise<Array<Characteristic>>} Promise which emits array of {@link Characteristic} objects which are 
   * discovered for this service.
   */
  characteristics(): Promise<Array<Characteristic>> {
    return this._manager.characteristicsForDevice(this.deviceID, this.uuid)
  }

  /**
   * {@link BleManager#readCharacteristicForDevice} with partially filled arguments.
   * 
   * @param {UUID} characteristicUUID {@link Characteristic} UUID.
   * @param {?TransactionId} transactionId optional `transactionId` which can be used in 
   * {@link BleManager#cancelTransaction} function.
   * @returns {Promise<Characteristic>} Promise which emits first {@link Characteristic} object matching specified 
   * UUID path. Latest value of {@link Characteristic} will be stored inside returned object.
   */
  readCharacteristic(characteristicUUID: UUID, transactionId: ?TransactionId): Promise<Characteristic> {
    return this._manager.readCharacteristicForDevice(this.deviceID, this.uuid, characteristicUUID, transactionId)
  }

  /**
   * {@link BleManager#writeCharacteristicWithResponseForDevice} with partially filled arguments.
   * 
   * @param {UUID} characteristicUUID {@link Characteristic} UUID.
   * @param {Base64} valueBase64 Value in Base64 format.
   * @param {?TransactionId} transactionId optional `transactionId` which can be used in 
   * {@link BleManager#cancelTransaction} function.
   * @returns {Promise<Characteristic>} Promise which emits first {@link Characteristic} object matching specified 
   * UUID path. Latest value of characteristic may not be stored inside returned object.
   */
  writeCharacteristicWithResponse(
    characteristicUUID: UUID,
    valueBase64: Base64,
    transactionId: ?TransactionId
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
     * {@link BleManager#writeCharacteristicWithoutResponseForDevice} with partially filled arguments.
     * 
     * @param {UUID} characteristicUUID {@link Characteristic} UUID.
     * @param {Base64} valueBase64 Value in Base64 format.
     * @param {?TransactionId} transactionId optional `transactionId` which can be used in 
     * {@link BleManager#cancelTransaction} function.
     * @returns {Promise<Characteristic>} Promise which emits first {@link Characteristic} object matching specified 
     * UUID path. Latest value of characteristic may not be stored inside returned object.
     */
  writeCharacteristicWithoutResponse(
    characteristicUUID: UUID,
    valueBase64: Base64,
    transactionId: ?TransactionId
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
     * {@link BleManager#monitorCharacteristicForDevice} with partially filled arguments.
     * 
     * @param {UUID} characteristicUUID - {@link Characteristic} UUID.
     * @param {function(error: ?Error, characteristic: ?Characteristic)} listener callback which emits 
     * {@link Characteristic} objects with modified value for each notification.
     * @param {?TransactionId} transactionId optional `transactionId` which can be used in 
     * {@link BleManager#cancelTransaction} function.
     * @returns {Subscription} Subscription on which `remove()` function can be called to unsubscribe.
     */
  monitorCharacteristic(
    characteristicUUID: UUID,
    listener: (error: ?Error, characteristic: ?Characteristic) => void,
    transactionId: ?TransactionId
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
