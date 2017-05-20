// @flow
'use strict'

import { BleManager } from './BleManager'
import { Characteristic } from './Characteristic'
import { Service } from './Service'
import type { NativeDevice } from './BleModule'
import type { DeviceId, Base64, UUID, Subscription, TransactionId, ConnectionOptions } from './TypeDefinition'

/**
 * Device instance which can be retrieved only by calling 
 * {@link #BleManager#startDeviceScan|bleManager.startDeviceScan()}.
 */
export class Device implements NativeDevice {
  /**
   * Internal BLE Manager handle
   * @private
   */
  _manager: BleManager

  /**
   * Device identifier: MAC address on Android and UUID on iOS.
   */
  id: DeviceId

  /**
   * Device name if present
   */
  name: ?string

  /**
   * Current Received Signal Strength Indication of device
   */
  rssi: ?number

  // Advertisement

  /**
   * Device's custom manufacturer data. Its format is defined by manufacturer.
   */
  manufacturerData: ?Base64

  /**
   * Map of service UUIDs (as keys) with associated data (as values).
   */
  serviceData: ?{ [uuid: UUID]: Base64 }

  /**
   * List of available services visible during scanning.
   */
  serviceUUIDs: ?Array<UUID>

  /**
   * Transmission power level of device.
   */
  txPowerLevel: ?number

  /**
   * List of solicited service UUIDs.
   */
  solicitedServiceUUIDs: ?Array<UUID>

  /**
   * Is device connectable. [iOS only]
   */
  isConnectable: ?boolean

  /**
   * List of overflow service UUIDs. [iOS only]
   */
  overflowServiceUUIDs: ?Array<UUID>

  /**
   * Private constructor used to create {@link Device} object.
   * 
   * @param {NativeDevice} nativeDevice Native device properties
   * @param {BleManager} manager {@link BleManager} handle
   * @private
   */
  constructor(nativeDevice: NativeDevice, manager: BleManager) {
    // $FlowFixMe Should be fixed in flow 0.46
    Object.assign(this, nativeDevice, { _manager: manager })
  }

  /**
   * {@link #BleManager#connectToDevice|bleManager.connectToDevice()} with partially filled arguments.
   * 
   * @param {?ConnectionOptions} options Platform specific options for connection establishment. Not used currently.
   * @returns {Promise<Device>} Connected {@link Device} object if successful.
   */
  connect(options: ?ConnectionOptions): Promise<Device> {
    return this._manager.connectToDevice(this.id, options)
  }

  /**
   * {@link #BleManager#cancelDeviceConnection|bleManager.cancelDeviceConnection()} with partially filled arguments.
   * 
   * @returns {Promise<Device>} Returns closed {@link Device} when operation is successful.
   */
  cancelConnection(): Promise<Device> {
    return this._manager.cancelDeviceConnection(this.id)
  }

  /**
   * {@link #BleManager#isDeviceConnected|bleManager.isDeviceConnected()} with partially filled arguments.
   * 
   * @returns {Promise<boolean>} Promise which emits `true` if device is connected, and `false` otherwise.
   */
  isConnected(): Promise<boolean> {
    return this._manager.isDeviceConnected(this.id)
  }

  /**
   * {@link #BleManager#onDeviceDisconnected|bleManager.onDeviceDisconnected()} with partially filled arguments.
   * 
   * @param {function(error: ?Error, device: Device)} listener callback returning error as a reason of disconnection
   *                                                           if available and {@link Device} object.
   * @returns {Subscription} Subscription on which `remove()` function can be called to unsubscribe.
   */
  onDisconnected(listener: (error: ?Error, device: Device) => void): Subscription {
    return this._manager.onDeviceDisconnected(this.id, listener)
  }

  /**
   * {@link #BleManager#discoverAllServicesAndCharacteristicsForDevice|bleManager.discoverAllServicesAndCharacteristicsForDevice()} with partially filled arguments.
   * 
   * @returns {Promise<Device>} Promise which emits {@link Device} object if all available services and 
   * characteristics have been discovered.
   */
  discoverAllServicesAndCharacteristics(): Promise<Device> {
    return this._manager.discoverAllServicesAndCharacteristicsForDevice(this.id)
  }

  /**
   * {@link #BleManager#servicesForDevice|bleManager.servicesForDevice()} with partially filled arguments.
   * 
   * @returns {Promise<Service[]>} Promise which emits array of {@link Service} objects which are discovered by this
   * device.
   */
  services(): Promise<Service[]> {
    return this._manager.servicesForDevice(this.id)
  }

  /**
   * {@link #BleManager#characteristicsForDevice|bleManager.characteristicsForDevice()} with partially filled arguments.
   * 
   * @param {UUID} serviceUUID {@link Service} UUID.
   * @returns {Promise<Characteristic[]>} Promise which emits array of {@link Characteristic} objects which are 
   * discovered for a {@link Device} in specified {@link Service}.
   */
  characteristicsForService(serviceUUID: string): Promise<Characteristic[]> {
    return this._manager.characteristicsForDevice(this.id, serviceUUID)
  }

  /**
   * {@link #BleManager#readCharacteristicForDevice|bleManager.readCharacteristicForDevice()} with partially filled arguments.
   * 
   * @param {UUID} serviceUUID {@link Service} UUID.
   * @param {UUID} characteristicUUID {@link Characteristic} UUID.
   * @param {?TransactionId} transactionId optional `transactionId` which can be used in 
   * {@link #BleManager#cancelTransaction|bleManager.cancelTransaction()} function.
   * @returns {Promise<Characteristic>} Promise which emits first {@link Characteristic} object matching specified 
   * UUID paths. Latest value of {@link Characteristic} will be stored inside returned object.
   */
  readCharacteristicForService(
    serviceUUID: UUID,
    characteristicUUID: UUID,
    transactionId: ?TransactionId
  ): Promise<Characteristic> {
    return this._manager.readCharacteristicForDevice(this.id, serviceUUID, characteristicUUID, transactionId)
  }

  /**
   * {@link #BleManager#writeCharacteristicWithResponseForDevice|bleManager.writeCharacteristicWithResponseForDevice()} with partially filled arguments.
   * 
   * @param {UUID} serviceUUID {@link Service} UUID.
   * @param {UUID} characteristicUUID {@link Characteristic} UUID.
   * @param {Base64} valueBase64 Value in Base64 format.
   * @param {?TransactionId} transactionId optional `transactionId` which can be used in 
   * {@link #BleManager#cancelTransaction|bleManager.cancelTransaction()} function.
   * @returns {Promise<Characteristic>} Promise which emits first {@link Characteristic} object matching specified 
   * UUID paths. Latest value of characteristic may not be stored inside returned object.
   */
  writeCharacteristicWithResponseForService(
    serviceUUID: UUID,
    characteristicUUID: UUID,
    valueBase64: Base64,
    transactionId: ?TransactionId
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
   * {@link #BleManager#writeCharacteristicWithoutResponseForDevice|bleManager.writeCharacteristicWithoutResponseForDevice()} with partially filled arguments.
   * 
   * @param {UUID} serviceUUID {@link Service} UUID.
   * @param {UUID} characteristicUUID {@link Characteristic} UUID.
   * @param {Base64} valueBase64 Value in Base64 format.
   * @param {?TransactionId} transactionId optional `transactionId` which can be used in 
   * {@link #BleManager#cancelTransaction|bleManager.cancelTransaction()} function.
   * @returns {Promise<Characteristic>} Promise which emits first {@link Characteristic} object matching specified 
   * UUID paths. Latest value of characteristic may not be stored inside returned object.
   */
  writeCharacteristicWithoutResponseForService(
    serviceUUID: UUID,
    characteristicUUID: UUID,
    valueBase64: Base64,
    transactionId: ?TransactionId
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
   * {@link #BleManager#monitorCharacteristicForDevice|bleManager.monitorCharacteristicForDevice()} with partially filled arguments.
   * 
   * @param {UUID} serviceUUID {@link Service} UUID.
   * @param {UUID} characteristicUUID {@link Characteristic} UUID.
   * @param {function(error: ?Error, characteristic: ?Characteristic)} listener - callback which emits 
   * {@link Characteristic} objects with modified value for each notification.
   * @param {?TransactionId} transactionId optional `transactionId` which can be used in 
   * {@link #BleManager#cancelTransaction|bleManager.cancelTransaction()} function.
   * @returns {Subscription} Subscription on which `remove()` function can be called to unsubscribe.
   */
  monitorCharacteristicForService(
    serviceUUID: UUID,
    characteristicUUID: UUID,
    listener: (error: ?Error, characteristic: ?Characteristic) => void,
    transactionId: ?TransactionId
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
