// @flow
'use strict'

import type { BleManager } from './BleManager'
import type { NativeDescriptor } from './BleModule'
import type { DeviceId, Identifier, UUID, TransactionId, Base64 } from './TypeDefinition'

/**
 * Descriptor object.
 */
export class Descriptor implements NativeDescriptor {
  /**
   * Internal BLE Manager handle
   * @private
   */
  _manager: BleManager
  /**
   * Descriptor unique identifier
   */
  id: Identifier
  /**
   * Descriptor UUID
   */
  uuid: UUID
  /**
   * Characteristic's ID to which descriptor belongs
   */
  characteristicID: Identifier
  /**
   * Characteristic's UUID to which descriptor belongs
   */
  characteristicUUID: UUID
  /**
   * Service's ID to which descriptor belongs
   */
  serviceID: Identifier
  /**
   * Service's UUID to which descriptor belongs
   */
  serviceUUID: UUID
  /**
   * Device's ID to which descriptor belongs
   */
  deviceID: DeviceId
  /**
   * Descriptor value if present
   */
  value: ?Base64

  /**
   * Private constructor used to create instance of {@link Descriptor}.
   * @param {NativeDescriptor} nativeDescriptor NativeDescriptor
   * @param {BleManager} manager BleManager
   * @private
   */
  constructor(nativeDescriptor: NativeDescriptor, manager: BleManager) {
    Object.assign(this, nativeDescriptor, { _manager: manager })
  }

  /**
   * {@link #blemanagerreaddescriptorfordevice|bleManager.readDescriptorForDevice()} with partially filled arguments.
   *
   * @param {?TransactionId} transactionId optional `transactionId` which can be used in
   * {@link #blemanagercanceltransaction|cancelTransaction()} function.
   * @returns {Promise<Descriptor>} Promise which emits first {@link Descriptor} object matching specified
   * UUID paths. Latest value of {@link Descriptor} will be stored inside returned object.
   */
  async read(transactionId: ?TransactionId): Promise<Descriptor> {
    return this._manager._readDescriptor(this.id, transactionId)
  }

  /**
   * {@link #blemanagerwritedescriptorfordevice|bleManager.writeDescriptorForDevice()} with partially filled arguments.
   *
   * @param {Base64} valueBase64 Value to be set coded in Base64
   * @param {?TransactionId} transactionId Transaction handle used to cancel operation
   * @returns {Promise<Descriptor>} Descriptor which saved passed value.
   */
  async write(valueBase64: Base64, transactionId: ?TransactionId): Promise<Descriptor> {
    return this._manager._writeDescriptor(this.id, valueBase64, transactionId)
  }
}
