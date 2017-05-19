// @flow
'use strict'

import { NativeModules } from 'react-native'
import { State } from './TypeDefinition'
import type { DeviceId, UUID, TransactionId, Base64, ScanOptions, ConnectionOptions } from './TypeDefinition'

/**
 * Native device object passed from BleModule.
 */
export interface NativeDevice {
  /**
   * Device identifier: MAC address on Android and UUID on iOS.
   */
  id: DeviceId,
  /**
   * Device name if present
   */
  name: ?string,
  /**
   * Current Received Signal Strength Indication of device
   */
  rssi: ?number,

  // Advertisement

  /**
   * Device's custom manufacturer data. Its format is defined by manufacturer.
   */
  manufacturerData: ?Base64,

  /**
   * Map od service UUIDs with associated data.
   */
  serviceData: ?{ [uuid: UUID]: Base64 },

  /**
   * List of available services visible during scanning.
   */
  serviceUUIDs: ?Array<UUID>,

  /**
   * Transmission power level of device.
   */
  txPowerLevel: ?number,

  /**
   * List of solicited service UUIDs.
   */
  solicitedServiceUUIDs: ?Array<UUID>,

  /**
   * Is device connectable.
   */
  isConnectable: ?boolean,

  /**
   * List of overflow service UUIDs.
   */
  overflowServiceUUIDs: ?Array<UUID>
}

/**
 * Native service object passed from BleModule.
 */
export interface NativeService {
  /**
   * Service UUID
   */
  uuid: UUID,
  /**
   * Device's ID to which service belongs
   */
  deviceID: DeviceId,
  /**
   * Value indicating whether the type of service is primary or secondary.
   */
  isPrimary: boolean
}

/**
 * Native characteristic object passed from BleModule.
 */
export interface NativeCharacteristic {
  /**
   * Characteristic UUID
   */
  uuid: UUID,
  /**
   * Service's UUID to which characteristic belongs
   */
  serviceUUID: UUID,
  /**
   * Device's ID to which characteristic belongs
   */
  deviceID: DeviceId,
  /**
   * True if characteristic can be read
   */
  isReadable: boolean,
  /**
   * True if characteristic can be written with response
   */
  isWritableWithResponse: boolean,
  /**
   * True if characteristic can be written without response
   */
  isWritableWithoutResponse: boolean,
  /**
   * True if characteristic can monitor value changes.
   */
  isNotifiable: boolean,
  /**
   * True if characteristic is monitoring value changes without ACK.
   */
  isNotifying: boolean,
  /**
   * True if characteristic is monitoring value changes with ACK.
   */
  isIndictable: boolean,
  /**
   * Characteristic value if present
   */
  value: ?Base64
}

export interface BleModuleInterface {
  // Lifecycle

  /**
   * Creates new native module internally. Only one module
   * is allowed to be instantiated.
   */
  createClient(): void,

  /**
   * Destroys previously instantiated module. This function is
   * only safe when previously BleModule was created.
   */
  destroyClient(): void,

  // Monitoring state

  state(): Promise<$Keys<typeof State>>,

  // Scanning

  /**
   * Starts device scan.
   * 
   * @param {?Array<UUID>} filteredUUIDs List of UUIDs for services which needs to be present to detect device during 
   * scanning.
   * @param {?ScanOptions} options Platform dependent options
  */
  startDeviceScan(filteredUUIDs: ?Array<UUID>, options: ?ScanOptions): void,

  /**
   * Stops device scan.
   */
  stopDeviceScan(): void,

  // Connection management

  /**
   * Connect to specified device.
   * 
   * @param {DeviceId} deviceIdentifier Device identifier to connect to.
   * @param {?ConnectionOptions} options Connection options.
   * @returns {Promise<NativeDevice>} Connected device.
   */
  connectToDevice(deviceIdentifier: DeviceId, options: ?ConnectionOptions): Promise<NativeDevice>,

  /**
   * Cancels pending device connection.
   * 
   * @param {DeviceId} deviceIdentifier Device identifier which is already connected.
   * @returns {Promise<NativeDevice>} Disconnected device.
   */
  cancelDeviceConnection(deviceIdentifier: DeviceId): Promise<NativeDevice>,

  /**
   * Checks if specified device is connected.
   * 
   * @param {DeviceId} deviceIdentifier Device identifier.
   * @returns {Promise<boolean>} True if specified device is connected.
   */
  isDeviceConnected(deviceIdentifier: DeviceId): Promise<boolean>,

  // Discovery

  /**
   * Discovers all services and characteristics for specified device.
   * 
   * @param {DeviceId} deviceIdentifier Connected device identifier.
   * @returns {Promise<NativeDevice>} Device which has discovered characteristics and services.
   */
  discoverAllServicesAndCharacteristicsForDevice(deviceIdentifier: DeviceId): Promise<NativeDevice>,

  // Service and characteristic getters

  /**
   * List of discovered services for specified device.
   * 
   * @param {DeviceId} deviceIdentifier Connected device identifier.
   * @returns {Promise<Array<NativeService>>} List of services available in device.
   */
  servicesForDevice(deviceIdentifier: DeviceId): Promise<Array<NativeService>>,

  /**
    * List of discovered characteristic for specified service.
    * 
    * @param {DeviceId} deviceIdentifier Connected device identifier.
    * @param {UUID} serviceUUID Service UUID which contains characteristics.
    * @returns {Promise<Array<NativeCharacteristic>>} List of characteristics available in service.
    */
  characteristicsForDevice(deviceIdentifier: DeviceId, serviceUUID: UUID): Promise<Array<NativeCharacteristic>>,

  // Characteristics operations

  /**
   * Read characteristic's value.
   * 
   * @param {DeviceId} deviceIdentifier Connected device identifier
   * @param {UUID} serviceUUID Service UUID
   * @param {UUID} characteristicUUID Characteristic UUID
   * @param {TransactionId} transactionId Transaction handle used to cancel operation
   * @returns {Promise<NativeCharacteristic>} Characteristic for which value was read
   */
  readCharacteristicForDevice(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    transactionId: TransactionId
  ): Promise<NativeCharacteristic>,

  /**
   * Write value to characteristic.
   * 
   * @param {DeviceId} deviceIdentifier Connected device identifier
   * @param {UUID} serviceUUID Service UUID
   * @param {UUID} characteristicUUID Characteristic UUID
   * @param {Base64} valueBase64 Value to be set coded in Base64
   * @param {boolean} withResponse True if write should be with response
   * @param {TransactionId} transactionId Transaction handle used to cancel operation
   * @returns {Promise<NativeCharacteristic>} Characteristic which saved passed value
   */
  writeCharacteristicForDevice(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    valueBase64: Base64,
    withResponse: boolean,
    transactionId: TransactionId
  ): Promise<NativeCharacteristic>,

  /**
   * Setup monitoring of characteristic value.
   * 
   * @param {DeviceId} deviceIdentifier Connected device identifier
   * @param {UUID} serviceUUID Service UUID
   * @param {UUID} characteristicUUID Characteristic UUID
   * @param {TransactionId} transactionId Transaction handle used to cancel operation
   * @returns {Promise<void>} Value which is returned when monitoring was cancelled or resulted in error
   */
  monitorCharacteristicForDevice(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    transactionId: TransactionId
  ): Promise<void>,

  // Other APIs

  /**
   * Cancels specified transaction
   * 
   * @param {TransactionId} transactionId Transaction handle for operation to be cancelled
   */
  cancelTransaction(transactionId: TransactionId): void,

  // Events
  ScanEvent: string,
  ReadEvent: string,
  StateChangeEvent: string,
  DisconnectionEvent: string
}

export const BleModule: BleModuleInterface = NativeModules.BleClientManager
