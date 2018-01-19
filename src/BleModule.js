// @flow
'use strict'

import { NativeModules, NativeEventEmitter } from 'react-native'
import { State, LogLevel } from './TypeDefinition'
import type {
  DeviceId,
  Identifier,
  UUID,
  TransactionId,
  Base64,
  ScanOptions,
  ConnectionOptions
} from './TypeDefinition'

/**
 * Native device object passed from BleModule.
 * @private
 */
export interface NativeDevice {
  /**
   * Device identifier: MAC address on Android and UUID on iOS.
   * @private
   */
  id: DeviceId;
  /**
   * Device name if present
   * @private
   */
  name: ?string;
  /**
   * Current Received Signal Strength Indication of device
   * @private
   */
  rssi: ?number;
  /**
   * Current Maximum Transmission Unit for this device. When device is not connected
   * default value of 23 is used.
   * @private
   */
  mtu: number;

  // Advertisement

  /**
   * Device's custom manufacturer data. Its format is defined by manufacturer.
   * @private
   */
  manufacturerData: ?Base64;

  /**
   * Map od service UUIDs with associated data.
   * @private
   */
  serviceData: ?{ [uuid: UUID]: Base64 };

  /**
   * List of available services visible during scanning.
   * @private
   */
  serviceUUIDs: ?Array<UUID>;

  /**
   * User friendly name of device.
   * @private
   */
  localName: ?string;

  /**
   * Transmission power level of device.
   * @private
   */
  txPowerLevel: ?number;

  /**
   * List of solicited service UUIDs.
   * @private
   */
  solicitedServiceUUIDs: ?Array<UUID>;

  /**
   * Is device connectable.
   * @private
   */
  isConnectable: ?boolean;

  /**
   * List of overflow service UUIDs.
   * @private
   */
  overflowServiceUUIDs: ?Array<UUID>;
}

/**
 * Native service object passed from BleModule.
 * @private
 */
export interface NativeService {
  /**
   * Service unique identifier
   * @private
   */
  id: Identifier;
  /**
   * Service UUID
   * @private
   */
  uuid: UUID;
  /**
   * Device's ID to which service belongs
   * @private
   */
  deviceID: DeviceId;
  /**
   * Value indicating whether the type of service is primary or secondary.
   * @private
   */
  isPrimary: boolean;
}

/**
 * Native characteristic object passed from BleModule.
 * @private
 */
export interface NativeCharacteristic {
  /**
   * Characteristic unique identifier
   * @private
   */
  id: Identifier;
  /**
   * Characteristic UUID
   * @private
   */
  uuid: UUID;
  /**
   * Service's ID to which characteristic belongs
   * @private
   */
  serviceID: Identifier;
  /**
   * Service's UUID to which characteristic belongs
   * @private
   */
  serviceUUID: UUID;
  /**
   * Device's ID to which characteristic belongs
   * @private
   */
  deviceID: DeviceId;
  /**
   * True if characteristic can be read
   * @private
   */
  isReadable: boolean;
  /**
   * True if characteristic can be written with response
   * @private
   */
  isWritableWithResponse: boolean;
  /**
   * True if characteristic can be written without response
   * @private
   */
  isWritableWithoutResponse: boolean;
  /**
   * True if characteristic can monitor value changes.
   * @private
   */
  isNotifiable: boolean;
  /**
   * True if characteristic is monitoring value changes without ACK.
   * @private
   */
  isNotifying: boolean;
  /**
   * True if characteristic is monitoring value changes with ACK.
   * @private
   */
  isIndicatable: boolean;
  /**
   * Characteristic value if present
   * @private
   */
  value: ?Base64;
}

/**
 * Object representing information about restored BLE state after application relaunch.
 * @private
 */
export interface NativeBleRestoredState {
  /**
   * List of connected devices after state restoration.
   * @type {Array<NativeDevice>}
   * @instance
   * @memberof NativeBleRestoredState
   * @private
   */
  connectedPeripherals: Array<NativeDevice>;
}

/**
 * Native BLE Module interface
 * @private
 */
export interface BleModuleInterface {
  // NativeModule methods
  addListener(string): void;
  removeListeners(number): void;

  // Lifecycle

  /**
   * Creates new native module internally. Only one module
   * is allowed to be instantiated.
   * @param {?string} restoreIdentifierKey Optional unique Id used for state restoration of BLE manager.
   * @private
   */
  createClient(restoreIdentifierKey: ?string): void;

  /**
   * Destroys previously instantiated module. This function is
   * only safe when previously BleModule was created.
   * @private
   */
  destroyClient(): void;

  // Monitoring state

  /**
   * Current state of BLE device.
   *
   * @returns {Promise<State>} Current state of BLE device.
   * @private
   */
  state(): Promise<$Keys<typeof State>>;

  // Scanning

  /**
   * Starts device scan.
   *
   * @param {?Array<UUID>} filteredUUIDs List of UUIDs for services which needs to be present to detect device during
   * scanning.
   * @param {?ScanOptions} options Platform dependent options
   * @private
   */
  startDeviceScan(filteredUUIDs: ?Array<UUID>, options: ?ScanOptions): void;

  /**
   * Stops device scan.
   * @private
   */
  stopDeviceScan(): void;

  // Device operations

  /**
   * Reads RSSI for connected device.
   *
   * @param {DeviceId} deviceIdentifier Device identifier.
   * @param {TransactionId} transactionId Transaction handle used to cancel operation
   * @returns {Promise<NativeDevice>} Connected device with updated RSSI value.
   * @private
   */
  readRSSIForDevice(deviceIdentifier: DeviceId, transactionId: TransactionId): Promise<NativeDevice>;

  /**
   * Request new MTU value for this device. This function currently is not doing anything
   * on iOS platform as MTU exchange is done automatically.
   * @param {DeviceId} deviceIdentifier Device identifier.
   * @param {number} mtu New MTU to negotiate.
   * @param {TransactionId} transactionId Transaction handle used to cancel operation
   * @returns {Promise<NativeDevice>} Device with updated MTU size. Default value is 23.
   * @private
   */
  requestMTUForDevice(deviceIdentifier: DeviceId, mtu: number, transactionId: TransactionId): Promise<NativeDevice>;

  // Connection management

  /**
   * Connect to specified device.
   *
   * @param {DeviceId} deviceIdentifier Device identifier to connect to.
   * @param {?ConnectionOptions} options Connection options.
   * @returns {Promise<NativeDevice>} Connected device.
   * @private
   */
  connectToDevice(deviceIdentifier: DeviceId, options: ?ConnectionOptions): Promise<NativeDevice>;

  /**
   * Cancels pending device connection.
   *
   * @param {DeviceId} deviceIdentifier Device identifier which is already connected.
   * @returns {Promise<NativeDevice>} Disconnected device.
   * @private
   */
  cancelDeviceConnection(deviceIdentifier: DeviceId): Promise<NativeDevice>;

  /**
   * Checks if specified device is connected.
   *
   * @param {DeviceId} deviceIdentifier Device identifier.
   * @returns {Promise<boolean>} True if specified device is connected.
   * @private
   */
  isDeviceConnected(deviceIdentifier: DeviceId): Promise<boolean>;

  // Discovery

  /**
   * Discovers all services and characteristics for specified device.
   *
   * @param {DeviceId} deviceIdentifier Connected device identifier.
   * @returns {Promise<NativeDevice>} Device which has discovered characteristics and services.
   * @private
   */
  discoverAllServicesAndCharacteristicsForDevice(deviceIdentifier: DeviceId): Promise<NativeDevice>;

  // Service and characteristic getters

  /**
   * List of discovered services for specified device.
   *
   * @param {DeviceId} deviceIdentifier Connected device identifier.
   * @returns {Promise<Array<NativeService>>} List of services available in device.
   * @private
   */
  servicesForDevice(deviceIdentifier: DeviceId): Promise<Array<NativeService>>;

  /**
   * List of discovered characteristics for specified service.
   *
   * @param {DeviceId} deviceIdentifier Connected device identifier.
   * @param {UUID} serviceUUID Service UUID which contains characteristics.
   * @returns {Promise<Array<NativeCharacteristic>>} List of characteristics available in service.
   * @private
   */
  characteristicsForDevice(deviceIdentifier: DeviceId, serviceUUID: UUID): Promise<Array<NativeCharacteristic>>;

  /**
   * List of discovered characteristics for specified service.
   *
   * @param {Identifier} serviceIdentifier Service ID which contains characteristics.
   * @returns {Promise<Array<NativeCharacteristic>>} List of characteristics available in service.
   * @private
   */
  characteristicsForService(serviceIdentifier: Identifier): Promise<Array<NativeCharacteristic>>;

  // Characteristics operations

  /**
   * Read characteristic's value.
   *
   * @param {DeviceId} deviceIdentifier Connected device identifier
   * @param {UUID} serviceUUID Service UUID
   * @param {UUID} characteristicUUID Characteristic UUID
   * @param {TransactionId} transactionId Transaction handle used to cancel operation
   * @returns {Promise<NativeCharacteristic>} Characteristic for which value was read
   * @private
   */
  readCharacteristicForDevice(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    transactionId: TransactionId
  ): Promise<NativeCharacteristic>;

  /**
   * Read characteristic's value.
   *
   * @param {Identifier} serviceIdentifier Service ID
   * @param {UUID} characteristicUUID Characteristic UUID
   * @param {TransactionId} transactionId Transaction handle used to cancel operation
   * @returns {Promise<NativeCharacteristic>} Characteristic for which value was read
   * @private
   */
  readCharacteristicForService(
    serviceIdentifier: Identifier,
    characteristicUUID: UUID,
    transactionId: TransactionId
  ): Promise<NativeCharacteristic>;

  /**
   * Read characteristic's value.
   *
   * @param {Identifier} characteristicIdentifer Characteristic ID
   * @param {TransactionId} transactionId Transaction handle used to cancel operation
   * @returns {Promise<NativeCharacteristic>} Characteristic for which value was read
   * @private
   */
  readCharacteristic(characteristicIdentifer: Identifier, transactionId: TransactionId): Promise<NativeCharacteristic>;

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
   * @private
   */
  writeCharacteristicForDevice(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    valueBase64: Base64,
    withResponse: boolean,
    transactionId: TransactionId
  ): Promise<NativeCharacteristic>;

  /**
   * Write value to characteristic.
   *
   * @param {Identifier} serviceIdentifier Service ID
   * @param {UUID} characteristicUUID Characteristic UUID
   * @param {Base64} valueBase64 Value to be set coded in Base64
   * @param {boolean} withResponse True if write should be with response
   * @param {TransactionId} transactionId Transaction handle used to cancel operation
   * @returns {Promise<NativeCharacteristic>} Characteristic which saved passed value
   * @private
   */
  writeCharacteristicForService(
    serviceIdentifier: Identifier,
    characteristicUUID: UUID,
    valueBase64: Base64,
    withResponse: boolean,
    transactionId: TransactionId
  ): Promise<NativeCharacteristic>;

  /**
   * Write value to characteristic.
   *
   * @param {Identifier} characteristicIdentifier Characteristic ID
   * @param {Base64} valueBase64 Value to be set coded in Base64
   * @param {boolean} withResponse True if write should be with response
   * @param {TransactionId} transactionId Transaction handle used to cancel operation
   * @returns {Promise<NativeCharacteristic>} Characteristic which saved passed value
   * @private
   */
  writeCharacteristic(
    characteristicIdentifier: Identifier,
    valueBase64: Base64,
    withResponse: boolean,
    transactionId: TransactionId
  ): Promise<NativeCharacteristic>;

  /**
   * Setup monitoring of characteristic value.
   *
   * @param {DeviceId} deviceIdentifier Connected device identifier
   * @param {UUID} serviceUUID Service UUID
   * @param {UUID} characteristicUUID Characteristic UUID
   * @param {TransactionId} transactionId Transaction handle used to cancel operation
   * @returns {Promise<void>} Value which is returned when monitoring was cancelled or resulted in error
   * @private
   */
  monitorCharacteristicForDevice(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    transactionId: TransactionId
  ): Promise<void>;

  /**
   * Setup monitoring of characteristic value.
   *
   * @param {Identifier} serviceIdentifier Service ID
   * @param {UUID} characteristicUUID Characteristic UUID
   * @param {TransactionId} transactionId Transaction handle used to cancel operation
   * @returns {Promise<void>} Value which is returned when monitoring was cancelled or resulted in error
   * @private
   */
  monitorCharacteristicForService(
    serviceIdentifier: Identifier,
    characteristicUUID: UUID,
    transactionId: TransactionId
  ): Promise<void>;

  /**
   * Setup monitoring of characteristic value.
   *
   * @param {Identifier} characteristicIdentifier Characteristic ID
   * @param {TransactionId} transactionId Transaction handle used to cancel operation
   * @returns {Promise<void>} Value which is returned when monitoring was cancelled or resulted in error
   * @private
   */
  monitorCharacteristic(characteristicIdentifier: Identifier, transactionId: TransactionId): Promise<void>;

  // Other APIs

  /**
   * Cancels specified transaction
   *
   * @param {TransactionId} transactionId Transaction handle for operation to be cancelled
   * @private
   */
  cancelTransaction(transactionId: TransactionId): void;

  /**
   * Sets new log level for native module's logging mechanism.
   * @param {LogLevel} logLevel New log level to be set.
   * @private
   */
  setLogLevel(logLevel: $Keys<typeof LogLevel>): void;

  /**
   * Get current log level for native module's logging mechanism.
   * @returns {Promise<LogLevel>} Current log level.
   * @private
   */
  logLevel(): Promise<$Keys<typeof LogLevel>>;

  // Events

  /**
   * New scanned event arrived as [?Error, ?NativeDevice] object.
   * @private
   */
  ScanEvent: string;

  /**
   * Characteristic value update broadcasted due to registered notification as
   * [?Error, ?NativeCharacteristic, ?TransactionId].
   * @private
   */
  ReadEvent: string;

  /**
   * BLE Manager changed its state as $Keys<typeof State>
   * @private
   */
  StateChangeEvent: string;

  /**
   * BLE Manager restored its internal state
   * @private
   */
  RestoreStateEvent: string;

  /**
   * Device disconnected as [Error?, NativeDevice]
   * @private
   */
  DisconnectionEvent: string;
}

export const BleModule: BleModuleInterface = NativeModules.BleClientManager
export const EventEmitter = NativeEventEmitter
