// @flow
'use strict'

import type { BleManager } from './BleManager'
import type { BleError } from './BleError'
import type { Characteristic } from './Characteristic'
import type { Service } from './Service'
import type { Descriptor } from './Descriptor'
import { ConnectionPriority } from './TypeDefinition'
import type { NativeDevice } from './BleModule'
import type {
  DeviceId,
  Base64,
  UUID,
  Subscription,
  TransactionId,
  CharacteristicSubscriptionType,
  ConnectionOptions
} from './TypeDefinition'
import { isIOS } from './Utils'

/**
 * Device instance which can be retrieved only by calling
 * {@link #blemanagerstartdevicescan|bleManager.startDeviceScan()}.
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

  /**
   * Current Maximum Transmission Unit for this device. When device is not connected
   * default value of 23 is used.
   */
  mtu: number

  // Advertisement

  /**
   * Device's custom manufacturer data. Its format is defined by manufacturer.
   */
  manufacturerData: ?Base64

  /**
   * Raw device scan data. When you have specific advertiser data,
   * you can implement your own processing.
   */
  rawScanRecord: Base64

  /**
   * Map of service UUIDs (as keys) with associated data (as values).
   */
  serviceData: ?{ [uuid: UUID]: Base64 }

  /**
   * List of available services visible during scanning.
   */
  serviceUUIDs: ?Array<UUID>

  /**
   * User friendly name of device.
   */
  localName: ?string

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
    Object.assign(this, nativeDevice)
    Object.defineProperty(this, '_manager', { value: manager, enumerable: false })
  }

  /**
   * {@link #blemanagerrequestconnectionpriorityfordevice|bleManager.requestConnectionPriorityForDevice()} with partially filled arguments.
   *
   * @param {ConnectionPriority} connectionPriority: Connection priority.
   * @param {?TransactionId} transactionId Transaction handle used to cancel operation.
   * @returns {Promise<Device>} Connected device.
   */
  requestConnectionPriority(
    connectionPriority: $Values<typeof ConnectionPriority>,
    transactionId: ?TransactionId
  ): Promise<Device> {
    return this._manager.requestConnectionPriorityForDevice(this.id, connectionPriority, transactionId)
  }

  /**
   * {@link #blemanagerreadrssifordevice|bleManager.readRSSIForDevice()} with partially filled arguments.
   *
   * @param {?TransactionId} transactionId Transaction handle used to cancel operation.
   * @returns {Promise<Device>} This device with updated RSSI value.
   */
  readRSSI(transactionId: ?TransactionId): Promise<Device> {
    return this._manager.readRSSIForDevice(this.id, transactionId)
  }

  /**
   * {@link #blemanagerrequestmtufordevice|bleManager.requestMTUForDevice()} with partially filled arguments.
   *
   * @param {?TransactionId} transactionId Transaction handle used to cancel operation.
   * @returns {Promise<Device>} Device with updated MTU size. Default value is 23.
   */
  requestMTU(mtu: number, transactionId: ?TransactionId): Promise<Device> {
    return this._manager.requestMTUForDevice(this.id, mtu, transactionId)
  }

  /**
   * {@link #blemanagerconnecttodevice|bleManager.connectToDevice()} with partially filled arguments.
   *
   * @param {?ConnectionOptions} options Platform specific options for connection establishment. Not used currently.
   * @returns {Promise<Device>} Connected {@link Device} object if successful.
   */
  connect(options: ?ConnectionOptions): Promise<Device> {
    return this._manager.connectToDevice(this.id, options)
  }

  /**
   * {@link #blemanagercanceldeviceconnection|bleManager.cancelDeviceConnection()} with partially filled arguments.
   *
   * @returns {Promise<Device>} Returns closed {@link Device} when operation is successful.
   */
  cancelConnection(): Promise<Device> {
    return this._manager.cancelDeviceConnection(this.id)
  }

  /**
   * {@link #blemanagerisdeviceconnected|bleManager.isDeviceConnected()} with partially filled arguments.
   *
   * @returns {Promise<boolean>} Promise which emits `true` if device is connected, and `false` otherwise.
   */
  isConnected(): Promise<boolean> {
    return this._manager.isDeviceConnected(this.id)
  }

  /**
   * {@link #blemanagerondevicedisconnected|bleManager.onDeviceDisconnected()} with partially filled arguments.
   *
   * @param {function(error: ?BleError, device: Device)} listener callback returning error as a reason of disconnection
   * if available and {@link Device} object. If an error is null, that means the connection was terminated by
   * {@link #blemanagercanceldeviceconnection|bleManager.cancelDeviceConnection()} call.
   * @returns {Subscription} Subscription on which `remove()` function can be called to unsubscribe.
   */
  onDisconnected(listener: (error: ?BleError, device: Device) => void): Subscription {
    return this._manager.onDeviceDisconnected(this.id, listener)
  }

  /**
   * {@link #blemanagerdiscoverallservicesandcharacteristicsfordevice|bleManager.discoverAllServicesAndCharacteristicsForDevice()} with partially filled arguments.
   *
   * @param {?TransactionId} transactionId Transaction handle used to cancel operation
   * @returns {Promise<Device>} Promise which emits {@link Device} object if all available services and
   * characteristics have been discovered.
   */
  discoverAllServicesAndCharacteristics(transactionId: ?TransactionId): Promise<Device> {
    return this._manager.discoverAllServicesAndCharacteristicsForDevice(this.id, transactionId)
  }

  /**
   * {@link #blemanagerservicesfordevice|bleManager.servicesForDevice()} with partially filled arguments.
   *
   * @returns {Promise<Service[]>} Promise which emits array of {@link Service} objects which are discovered by this
   * device.
   */
  services(): Promise<Service[]> {
    return this._manager.servicesForDevice(this.id)
  }

  /**
   * {@link #blemanagercharacteristicsfordevice|bleManager.characteristicsForDevice()} with partially filled arguments.
   *
   * @param {UUID} serviceUUID {@link Service} UUID.
   * @returns {Promise<Characteristic[]>} Promise which emits array of {@link Characteristic} objects which are
   * discovered for a {@link Device} in specified {@link Service}.
   */
  characteristicsForService(serviceUUID: string): Promise<Characteristic[]> {
    return this._manager.characteristicsForDevice(this.id, serviceUUID)
  }

  /**
   * {@link #blemanagerdescriptorsfordevice|bleManager.descriptorsForDevice()} with partially filled arguments.
   *
   * @param {UUID} serviceUUID {@link Service} UUID.
   * @param {UUID} characteristicUUID {@link Characteristic} UUID.
   * @returns {Promise<Array<Descriptor>>} Promise which emits array of {@link Descriptor} objects which are
   * discovered for this {@link Characteristic}.
   */
  descriptorsForService(serviceUUID: UUID, characteristicUUID: UUID): Promise<Array<Descriptor>> {
    return this._manager.descriptorsForDevice(this.id, serviceUUID, characteristicUUID)
  }

  /**
   * {@link #blemanagerreadcharacteristicfordevice|bleManager.readCharacteristicForDevice()} with partially filled arguments.
   *
   * @param {UUID} serviceUUID {@link Service} UUID.
   * @param {UUID} characteristicUUID {@link Characteristic} UUID.
   * @param {?TransactionId} transactionId optional `transactionId` which can be used in
   * {@link #blemanagercanceltransaction|bleManager.cancelTransaction()} function.
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
   * {@link #blemanagerwritecharacteristicwithresponsefordevice|bleManager.writeCharacteristicWithResponseForDevice()} with partially filled arguments.
   *
   * @param {UUID} serviceUUID {@link Service} UUID.
   * @param {UUID} characteristicUUID {@link Characteristic} UUID.
   * @param {Base64} valueBase64 Value in Base64 format.
   * @param {?TransactionId} transactionId optional `transactionId` which can be used in
   * {@link #blemanagercanceltransaction|bleManager.cancelTransaction()} function.
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
   * {@link #blemanagerwritecharacteristicwithoutresponsefordevice|bleManager.writeCharacteristicWithoutResponseForDevice()} with partially filled arguments.
   *
   * @param {UUID} serviceUUID {@link Service} UUID.
   * @param {UUID} characteristicUUID {@link Characteristic} UUID.
   * @param {Base64} valueBase64 Value in Base64 format.
   * @param {?TransactionId} transactionId optional `transactionId` which can be used in
   * {@link #blemanagercanceltransaction|bleManager.cancelTransaction()} function.
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
   * {@link #blemanagermonitorcharacteristicfordevice|bleManager.monitorCharacteristicForDevice()} with partially filled arguments.
   *
   * @param {UUID} serviceUUID {@link Service} UUID.
   * @param {UUID} characteristicUUID {@link Characteristic} UUID.
   * @param {function(error: ?BleError, characteristic: ?Characteristic)} listener - callback which emits
   * {@link Characteristic} objects with modified value for each notification.
   * @param {?TransactionId} transactionId optional `transactionId` which can be used in
   * @param {?CharacteristicSubscriptionType} subscriptionType [android only] subscription type of the characteristic
   * {@link #blemanagercanceltransaction|bleManager.cancelTransaction()} function.
   * @returns {Subscription} Subscription on which `remove()` function can be called to unsubscribe.
   */
  monitorCharacteristicForService(
    serviceUUID: UUID,
    characteristicUUID: UUID,
    listener: (error: ?BleError, characteristic: ?Characteristic) => void,
    transactionId: ?TransactionId,
    subscriptionType?: CharacteristicSubscriptionType
  ): Subscription {
    const commonArgs = [this.id, serviceUUID, characteristicUUID, listener, transactionId]
    const args = isIOS ? commonArgs : [...commonArgs, subscriptionType]

    return this._manager.monitorCharacteristicForDevice(...args)
  }

  /**
   * {@link #blemanagerreaddescriptorfordevice|bleManager.readDescriptorForDevice()} with partially filled arguments.
   *
   * @param {UUID} serviceUUID {@link Service} UUID.
   * @param {UUID} characteristicUUID {@link Characteristic} UUID.
   * @param {UUID} descriptorUUID {@link Descriptor} UUID.
   * @param {?TransactionId} transactionId optional `transactionId` which can be used in
   * {@link #blemanagercanceltransaction|cancelTransaction()} function.
   * @returns {Promise<Descriptor>} Promise which emits first {@link Descriptor} object matching specified
   * UUID paths. Latest value of {@link Descriptor} will be stored inside returned object.
   */
  async readDescriptorForService(
    serviceUUID: UUID,
    characteristicUUID: UUID,
    descriptorUUID: UUID,
    transactionId: ?TransactionId
  ): Promise<Descriptor> {
    return this._manager.readDescriptorForDevice(
      this.id,
      serviceUUID,
      characteristicUUID,
      descriptorUUID,
      transactionId
    )
  }

  /**
   * {@link #blemanagerwritedescriptorfordevice|bleManager.writeDescriptorForDevice()} with partially filled arguments.
   *
   * @param {UUID} serviceUUID {@link Service} UUID.
   * @param {UUID} characteristicUUID Characteristic UUID
   * @param {UUID} descriptorUUID Descriptor UUID
   * @param {Base64} valueBase64 Value to be set coded in Base64
   * @param {?TransactionId} transactionId Transaction handle used to cancel operation
   * @returns {Promise<Descriptor>} Descriptor which saved passed value.
   */
  async writeDescriptorForService(
    serviceUUID: UUID,
    characteristicUUID: UUID,
    descriptorUUID: UUID,
    valueBase64: Base64,
    transactionId: ?TransactionId
  ): Promise<Descriptor> {
    return this._manager.writeDescriptorForDevice(
      this.id,
      serviceUUID,
      characteristicUUID,
      descriptorUUID,
      valueBase64,
      transactionId
    )
  }
}
