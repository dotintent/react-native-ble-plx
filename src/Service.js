// @flow
'use strict'

import type { BleManager } from './BleManager'
import type { BleError } from './BleError'
import type { Characteristic } from './Characteristic'
import type { Descriptor } from './Descriptor'
import type { NativeService } from './BleModule'
import type {
  DeviceId,
  Identifier,
  Base64,
  UUID,
  Subscription,
  TransactionId,
  CharacteristicSubscriptionType
} from './TypeDefinition'
import { isIOS } from './Utils'

/**
 * Service object.
 */
export class Service implements NativeService {
  /**
   * Internal BLE Manager handle
   * @private
   */
  _manager: BleManager
  /**
   * Service unique identifier
   */
  id: Identifier
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
   * @private
   * @ignore
   */
  constructor(nativeService: NativeService, manager: BleManager) {
    Object.assign(this, nativeService)
    Object.defineProperty(this, '_manager', { value: manager, enumerable: false })
  }

  /**
   * {@link #blemanagercharacteristicsfordevice|bleManager.characteristicsForDevice()} with partially filled arguments.
   *
   * @returns {Promise<Array<Characteristic>>} Promise which emits array of {@link Characteristic} objects which are
   * discovered for this service.
   */
  characteristics(): Promise<Array<Characteristic>> {
    return this._manager._characteristicsForService(this.id)
  }

  /**
   * {@link #blemanagerdescriptorsfordevice|bleManager.descriptorsForDevice()} with partially filled arguments.
   *
   * @param {UUID} characteristicUUID {@link Characteristic} UUID.
   * @returns {Promise<Array<Descriptor>>} Promise which emits array of {@link Descriptor} objects which are
   * discovered for this {@link Service} in specified {@link Characteristic}.
   */
  descriptorsForCharacteristic(characteristicUUID: UUID): Promise<Array<Descriptor>> {
    return this._manager._descriptorsForService(this.id, characteristicUUID)
  }

  /**
   * {@link #blemanagerreadcharacteristicfordevice|bleManager.readCharacteristicForDevice()} with partially filled arguments.
   *
   * @param {UUID} characteristicUUID {@link Characteristic} UUID.
   * @param {?TransactionId} transactionId optional `transactionId` which can be used in
   * {@link #blemanagercanceltransaction|bleManager.cancelTransaction()} function.
   * @returns {Promise<Characteristic>} Promise which emits first {@link Characteristic} object matching specified
   * UUID path. Latest value of {@link Characteristic} will be stored inside returned object.
   */
  readCharacteristic(characteristicUUID: UUID, transactionId: ?TransactionId): Promise<Characteristic> {
    return this._manager._readCharacteristicForService(this.id, characteristicUUID, transactionId)
  }

  /**
   * {@link #blemanagerwritecharacteristicwithresponsefordevice|bleManager.writeCharacteristicWithResponseForDevice()} with partially filled arguments.
   *
   * @param {UUID} characteristicUUID {@link Characteristic} UUID.
   * @param {Base64} valueBase64 Value in Base64 format.
   * @param {?TransactionId} transactionId optional `transactionId` which can be used in
   * {@link #blemanagercanceltransaction|bleManager.cancelTransaction()} function.
   * @returns {Promise<Characteristic>} Promise which emits first {@link Characteristic} object matching specified
   * UUID path. Latest value of characteristic may not be stored inside returned object.
   */
  writeCharacteristicWithResponse(
    characteristicUUID: UUID,
    valueBase64: Base64,
    transactionId: ?TransactionId
  ): Promise<Characteristic> {
    return this._manager._writeCharacteristicWithResponseForService(
      this.id,
      characteristicUUID,
      valueBase64,
      transactionId
    )
  }

  /**
   * {@link #blemanagerwritecharacteristicwithoutresponsefordevice|bleManager.writeCharacteristicWithoutResponseForDevice()} with partially filled arguments.
   *
   * @param {UUID} characteristicUUID {@link Characteristic} UUID.
   * @param {Base64} valueBase64 Value in Base64 format.
   * @param {?TransactionId} transactionId optional `transactionId` which can be used in
   * {@link #blemanagercanceltransaction|bleManager.cancelTransaction()} function.
   * @returns {Promise<Characteristic>} Promise which emits first {@link Characteristic} object matching specified
   * UUID path. Latest value of characteristic may not be stored inside returned object.
   */
  writeCharacteristicWithoutResponse(
    characteristicUUID: UUID,
    valueBase64: Base64,
    transactionId: ?TransactionId
  ): Promise<Characteristic> {
    return this._manager._writeCharacteristicWithoutResponseForService(
      this.id,
      characteristicUUID,
      valueBase64,
      transactionId
    )
  }

  /**
   * {@link #blemanagermonitorcharacteristicfordevice|bleManager.monitorCharacteristicForDevice()} with partially filled arguments.
   *
   * @param {UUID} characteristicUUID - {@link Characteristic} UUID.
   * @param {function(error: ?BleError, characteristic: ?Characteristic)} listener callback which emits
   * {@link Characteristic} objects with modified value for each notification.
   * @param {?TransactionId} transactionId optional `transactionId` which can be used in
   * @param {?CharacteristicSubscriptionType} subscriptionType [android only] subscription type of the characteristic
   * {@link #blemanagercanceltransaction|bleManager.cancelTransaction()} function.
   * @returns {Subscription} Subscription on which `remove()` function can be called to unsubscribe.
   */
  monitorCharacteristic(
    characteristicUUID: UUID,
    listener: (error: ?BleError, characteristic: ?Characteristic) => void,
    transactionId: ?TransactionId,
    subscriptionType: ?CharacteristicSubscriptionType
  ): Subscription {
    const commonArgs = [this.id, characteristicUUID, listener, transactionId]
    const args = isIOS ? commonArgs : [...commonArgs, subscriptionType]

    return this._manager._monitorCharacteristicForService(...args)
  }

  /**
   * {@link #blemanagerreaddescriptorfordevice|bleManager.readDescriptorForDevice()} with partially filled arguments.
   *
   * @param {UUID} characteristicUUID {@link Characteristic} UUID.
   * @param {UUID} descriptorUUID {@link Descriptor} UUID.
   * @param {?TransactionId} transactionId optional `transactionId` which can be used in
   * {@link #blemanagercanceltransaction|cancelTransaction()} function.
   * @returns {Promise<Descriptor>} Promise which emits first {@link Descriptor} object matching specified
   * UUID paths. Latest value of {@link Descriptor} will be stored inside returned object.
   */
  async readDescriptorForCharacteristic(
    characteristicUUID: UUID,
    descriptorUUID: UUID,
    transactionId: ?TransactionId
  ): Promise<Descriptor> {
    return this._manager._readDescriptorForService(this.id, characteristicUUID, descriptorUUID, transactionId)
  }

  /**
   * {@link #blemanagerwritedescriptorfordevice|bleManager.writeDescriptorForDevice()} with partially filled arguments.
   *
   * @param {UUID} characteristicUUID Characteristic UUID
   * @param {UUID} descriptorUUID Descriptor UUID
   * @param {Base64} valueBase64 Value to be set coded in Base64
   * @param {?TransactionId} transactionId Transaction handle used to cancel operation
   * @returns {Promise<Descriptor>} Descriptor which saved passed value.
   */
  async writeDescriptorForCharacteristic(
    characteristicUUID: UUID,
    descriptorUUID: UUID,
    valueBase64: Base64,
    transactionId: ?TransactionId
  ): Promise<Descriptor> {
    return this._manager._writeDescriptorForService(
      this.id,
      characteristicUUID,
      descriptorUUID,
      valueBase64,
      transactionId
    )
  }
}
