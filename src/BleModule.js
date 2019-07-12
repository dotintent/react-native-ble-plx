// @flow
'use strict'

import { NativeModules, NativeEventEmitter } from 'react-native'
import { State, LogLevel, ConnectionPriority } from './TypeDefinition'
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
 * Native descriptor object passed from BleModule.
 * @private
 */
export interface NativeDescriptor {
  /**
   * Descriptor unique identifier
   * @private
   */
  id: Identifier;
  /**
   * Descriptor UUID
   * @private
   */
  uuid: UUID;
  /**
   * Characteristic's ID to which descriptor belongs
   * @private
   */
  characteristicID: Identifier;
  /**
   * Characteristic's UUID to which descriptor belongs
   * @private
   */
  characteristicUUID: UUID;
  /**
   * Service's ID to which descriptor belongs
   * @private
   */
  serviceID: Identifier;
  /**
   * Service's UUID to which descriptor belongs
   * @private
   */
  serviceUUID: UUID;
  /**
   * Device's ID to which descriptor belongs
   * @private
   */
  deviceID: DeviceId;
  /**
   * Descriptor value if present
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
   * Enable Bluetooth. This function blocks until BLE is in PoweredOn state. [Android only]
   *
   * @param {TransactionId} transactionId Transaction handle used to cancel operation
   * @returns {Promise<void>} Promise completes when state transition was successful.
   * @private
   */
  enable(transactionId: TransactionId): Promise<void>;

  /**
   * Disable Bluetooth. This function blocks until BLE is in PoweredOff state. [Android only]
   *
   * @param {TransactionId} transactionId Transaction handle used to cancel operation
   * @returns {Promise<void>} Promise completes when state transition was successful.
   * @private
   */
  disable(transactionId: TransactionId): Promise<void>;

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
   * Request a connection parameter update. This functions may update connection parameters on Android API level 21 or
   * above.
   *
   * @param {DeviceId} deviceIdentifier Device identifier.
   * @param {ConnectionPriority} connectionPriority: Connection priority.
   * @param {TransactionId} transactionId Transaction handle used to cancel operation.
   * @returns {Promise<NativeDevice>} Connected device.
   * @private
   */
  requestConnectionPriorityForDevice(
    deviceIdentifier: DeviceId,
    connectionPriority: $Values<typeof ConnectionPriority>,
    transactionId: TransactionId
  ): Promise<NativeDevice>;

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

  // Device management

  /**
   * Returns a list of known peripherals by their identifiers.
   * @param {Array<DeviceId>} deviceIdentifiers List of device identifiers
   * @returns {Promise<Array<NativeDevice>>} List of known devices by their identifiers.
   * @private
   */
  devices(deviceIdentifiers: Array<DeviceId>): Promise<Array<NativeDevice>>;

  /**
   * Returns a list of the peripherals (containing any of the specified services) currently connected to the system
   * which have discovered services. Returned devices **may not be connected** to your application.
   * @param {Array<UUID>} serviceUUIDs List of service UUIDs. Device must contain at least one of them to be listed.
   * @returns {Promise<Array<NativeDevice>>} List of known devices with discovered services as stated in the parameter.
   * @private
   */
  connectedDevices(serviceUUIDs: Array<UUID>): Promise<Array<NativeDevice>>;

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
   * Discovers all services, characteristics and descriptors for specified device.
   *
   * @param {DeviceId} deviceIdentifier Connected device identifier.
   * @param {TransactionId} transactionId Transaction handle used to cancel operation
   * @returns {Promise<NativeDevice>} Device which has discovered characteristics and services.
   * @private
   */
  discoverAllServicesAndCharacteristicsForDevice(
    deviceIdentifier: DeviceId,
    transactionId: TransactionId
  ): Promise<NativeDevice>;

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

  /**
   * List of discovered descriptors for specified characteristic.
   *
   * @param {DeviceId} deviceIdentifier Connected device identifier.
   * @param {UUID} serviceUUID Service UUID which contains descriptors.
   * @param {UUID} characteristicUUID Characteristic UUID which contains descriptors.
   * @returns {Promise<Array<NativeDescriptor>>} List of descriptors available in characteristic.
   * @private
   */
  descriptorsForDevice(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID
  ): Promise<Array<NativeDescriptor>>;

  /**
   * List of discovered descriptors for specified characteristic.
   *
   * @param {Identifier} serviceIdentifier Service identifier which contains descriptors.
   * @param {UUID} characteristicUUID Characteristic UUID which contains descriptors.
   * @returns {Promise<Array<NativeDescriptor>>} List of descriptors available in characteristic.
   * @private
   */
  descriptorsForService(serviceIdentifier: Identifier, characteristicUUID: UUID): Promise<Array<NativeDescriptor>>;

  /**
   * List of discovered descriptors for specified characteristic.
   *
   * @param {Identifier} characteristicIdentifier Characteristic identifier which contains descriptors.
   * @returns {Promise<Array<NativeDescriptor>>} List of descriptors available in characteristic.
   * @private
   */
  descriptorsForCharacteristic(characteristicIdentifier: Identifier): Promise<Array<NativeDescriptor>>;

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

  // Descriptor operations

  /**
   * Read descriptor's value.
   *
   * @param {DeviceId} deviceIdentifier Connected device identifier
   * @param {UUID} serviceUUID Service UUID
   * @param {UUID} characteristicUUID Characteristic UUID
   * @param {UUID} descriptorUUID Descriptor UUID
   * @param {TransactionId} transactionId Transaction handle used to cancel operation
   * @returns {Promise<NativeDescriptor>} Descriptor for which value was read
   * @private
   */
  readDescriptorForDevice(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    descriptorUUID: UUID,
    transactionId: TransactionId
  ): Promise<NativeDescriptor>;

  /**
   * Read descriptor's value.
   *
   * @param {Identifier} serviceIdentifier Service identifier
   * @param {UUID} characteristicUUID Characteristic UUID
   * @param {UUID} descriptorUUID Descriptor UUID
   * @param {TransactionId} transactionId Transaction handle used to cancel operation
   * @returns {Promise<NativeDescriptor>} Descriptor for which value was read
   * @private
   */
  readDescriptorForService(
    serviceIdentifier: Identifier,
    characteristicUUID: UUID,
    descriptorUUID: UUID,
    transactionId: TransactionId
  ): Promise<NativeDescriptor>;

  /**
   * Read descriptor's value.
   *
   * @param {Identifier} characteristicIdentifier Characteristic identifier
   * @param {UUID} descriptorUUID Descriptor UUID
   * @param {TransactionId} transactionId Transaction handle used to cancel operation
   * @returns {Promise<NativeDescriptor>} Descriptor for which value was read
   * @private
   */
  readDescriptorForCharacteristic(
    characteristicIdentifier: Identifier,
    descriptorUUID: UUID,
    transactionId: TransactionId
  ): Promise<NativeDescriptor>;

  /**
   * Read descriptor's value.
   *
   * @param {Identifier} descriptorIdentifier Descriptor identifier
   * @param {TransactionId} transactionId Transaction handle used to cancel operation
   * @returns {Promise<NativeDescriptor>} Descriptor for which value was read
   * @private
   */
  readDescriptor(descriptorIdentifier: Identifier, transactionId: TransactionId): Promise<NativeDescriptor>;

  /**
   * Write value to descriptor.
   *
   * @param {DeviceId} deviceIdentifier Connected device identifier
   * @param {UUID} serviceUUID Service UUID
   * @param {UUID} characteristicUUID Characteristic UUID
   * @param {UUID} descriptorUUID Descriptor UUID
   * @param {Base64} valueBase64 Value to be set coded in Base64
   * @param {TransactionId} transactionId Transaction handle used to cancel operation
   * @returns {Promise<NativeDescriptor>} Descriptor which saved passed value
   * @private
   */
  writeDescriptorForDevice(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    descriptorUUID: UUID,
    valueBase64: Base64,
    transactionId: TransactionId
  ): Promise<NativeDescriptor>;

  /**
   * Write value to descriptor.
   *
   * @param {Identifier} serviceIdentifier Service identifier
   * @param {UUID} characteristicUUID Characteristic UUID
   * @param {UUID} descriptorUUID Descriptor UUID
   * @param {Base64} valueBase64 Value to be set coded in Base64
   * @param {TransactionId} transactionId Transaction handle used to cancel operation
   * @returns {Promise<NativeDescriptor>} Descriptor which saved passed value
   * @private
   */
  writeDescriptorForService(
    serviceIdentifier: Identifier,
    characteristicUUID: UUID,
    descriptorUUID: UUID,
    valueBase64: Base64,
    transactionId: TransactionId
  ): Promise<NativeDescriptor>;

  /**
   * Write value to descriptor.
   *
   * @param {Identifier} characteristicIdentifier Characteristic identifier
   * @param {UUID} descriptorUUID Descriptor UUID
   * @param {Base64} valueBase64 Value to be set coded in Base64
   * @param {TransactionId} transactionId Transaction handle used to cancel operation
   * @returns {Promise<NativeDescriptor>} Descriptor which saved passed value
   * @private
   */
  writeDescriptorForCharacteristic(
    characteristicIdentifier: Identifier,
    descriptorUUID: UUID,
    valueBase64: Base64,
    transactionId: TransactionId
  ): Promise<NativeDescriptor>;

  /**
   * Write value to descriptor.
   *
   * @param {Identifier} descriptorIdentifier Descriptor identifier
   * @param {Base64} valueBase64 Value to be set coded in Base64
   * @param {TransactionId} transactionId Transaction handle used to cancel operation
   * @returns {Promise<NativeDescriptor>} Descriptor which saved passed value
   * @private
   */
  writeDescriptor(
    descriptorIdentifier: Identifier,
    valueBase64: Base64,
    transactionId: TransactionId
  ): Promise<NativeDescriptor>;

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
