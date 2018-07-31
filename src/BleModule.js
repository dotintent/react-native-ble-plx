// @flow
'use strict'

import { NativeModules } from 'react-native'
import { State } from './TypeDefinition'
import { LogLevel } from './Logging'
import type { PeripheralId, Identifier, UUID, Base64, ManagerId, PromiseId } from './TypeDefinition'
import type { BufferActionOptions, BufferId } from './Buffer'
import type { CancelOptions } from './Promise'
import type { NativeBleError } from './BleError'
import type {
  CentralManagerOptions,
  Peripheral,
  ConnectionOptions,
  Service,
  Characteristic,
  ScanOptions,
  ScanRecord,
  RestoredState,
  MonitorStateOptions
} from './central'

export type Callback<T> = (error: ?NativeBleError, data: ?T) => void

/**
 * Native BLE Module interface
 * @private
 */
export interface BleModuleInterface {
  /**
   * Creates new native module internally. Only one module
   * is allowed to be instantiated.
   * @param {?CentralManagerOptions} options Options that are used to create central manager instance
   * @private
   */
  createCentralClient(options: CentralManagerOptions, callback: Callback<ManagerId>): void;

  /**
   * Destroys previously instantiated central manager.
   * @private
   */
  destroyCentralClient(managerId: ManagerId): void;

  // Promise

  /**
   * Cancels promis with id
   * @private
   */
  cancelPromise(managerId: ManagerId, promiseId: PromiseId): void;

  // Buffers

  /**
   * Calls action on buffer with specified options
   * @private
   */
  actionOnBuffer<T>(
    managerId: ManagerId,
    bufferId: BufferId,
    options: BufferActionOptions,
    cancelOptions: CancelOptions,
    callback: Callback<T>
  ): void;

  /**
   * Stops specified buffer
   * @private
   */
  stopBuffer<T>(managerId: ManagerId, bufferId: BufferId, callback: Callback<T>): void;

  // Monitoring state

  /**
   * Current central manager state.
   * @private
   */
  getState(managerId: ManagerId, callback: Callback<$Keys<typeof State>>): void;

  /**
   * Monitor central manager state
   * @private
   */
  monitorState(
    managerId: ManagerId,
    options: MonitorStateOptions,
    callback: Callback<Buffer<$Keys<typeof State>>>
  ): void;

  monitorRestoreState(managerId: ManagerId, callback: Callback<Buffer<RestoredState>>): void;

  // Scanning

  /**
   * Starts device scan.
   * @private
   */
  scanForPeripherals(
    managerId: ManagerId,
    filteredUUIDs: ?Array<UUID>,
    options: ?ScanOptions,
    callback: Callback<Buffer<ScanRecord>>
  ): void;

  // Device operations

  /**
   * Reads RSSI for connected device.
   * @private
   */
  readRSSIForPeripheral(
    managerId: ManagerId,
    peripheralId: PeripheralId,
    cancelOptions: CancelOptions,
    callback: Callback<number>
  ): void;

  /**
   * Request new MTU value for this device. This function currently is not doing anything
   * on iOS platform as MTU exchange is done automatically.
   * @private
   */
  requestMTUForPeripheral(
    managerId: ManagerId,
    peripheralId: PeripheralId,
    mtu: number,
    cancelOptions: CancelOptions,
    callback: Callback<number>
  ): void;

  /**
   * Returns peripheral's mtu 
   * @private
   */
  getMTUForPeripheral(managerId: ManagerId, peripheralId: PeripheralId, callback: Callback<number>): void;

  /**
   * Method for starting MTU monitoring. Returns Buffer object in result.
   * @private
   */
  monitorMTUForPeripheral(managerId: ManagerId, peripheralId: PeripheralId, callback: Callback<Buffer<number>>): void;

  // Device management

  /**
   * Returns a list of known peripherals by their identifiers.
   * @param {Array<DeviceId>} deviceIdentifiers List of device identifiers
   * 
   * @private
   */
  getPeripherals(
    managerId: ManagerId,
    deviceIdentifiers: Array<PeripheralId>,
    callback: Callback<Array<Peripheral>>
  ): void;

  /**
   * Returns a list of the peripherals (containing any of the specified services) currently connected to the system
   * which have discovered services. Returned devices **may not be connected** to your application.
   * @param {Array<UUID>} serviceUUIDs List of service UUIDs. Device must contain at least one of them to be listed.
   * 
   * @private
   */
  getConnectedPeripherals(managerId: ManagerId, serviceUUIDs: Array<UUID>, callback: Callback<Array<Peripheral>>): void;

  // Connection management

  /**
   * Connect to specified peripheral.
   * @private
   */
  connectToPeripheral(
    managerId: ManagerId,
    peripheralId: PeripheralId,
    options: ?ConnectionOptions,
    callback: Callback<Peripheral>
  ): void;

  /**
   * Cancels pending peripheral connection.
   *
   * @private
   */
  cancelPeripheralConnection(
    managerId: ManagerId,
    peripheralId: PeripheralId,
    cancelOptions: CancelOptions,
    callback: Callback<Peripheral>
  ): void;

  /**
   * Checks if specified peripheral is connected.
   * @private
   */
  isPeripheralConnected(managerId: ManagerId, peripheralId: PeripheralId, callback: Callback<boolean>): void;

  /**
   * Monitor peripherals disconnections.
   * @private
   */
  monitorDisconnection(managerId: ManagerId, callback: Callback<Buffer<[Peripheral, ?NativeBleError]>>): void;

  // Name

  /**
   * Returns peripheral's name
   * @private
   */
  getNameForPeripheral(managerId: ManagerId, peripheralId: PeripheralId, callback: Callback<?String>): void;

  /**
   * Monitor for peipheral's name changes
   * @private
   */
  monitorPeripheralName(managerId: ManagerId, peripheralId: PeripheralId, callback: Callback<Buffer<?String>>): void;

  // Discovery

  /**
   * Discovers all services and characteristics for specified device.
   * @private
   */
  discoverAllServicesAndCharacteristicsForPeripheral(
    managerId: ManagerId,
    peripheralId: PeripheralId,
    callback: Callback<void>
  ): void;

  // Service and characteristic getters

  /**
   * Returns service for specified uuid and peripheral.
   * @private
   */
  getServiceForPeripheral(
    managerId: ManagerId,
    peripheralId: PeripheralId,
    serviceUUID: UUID,
    callback: Callback<Service>
  ): void;

  /**
   * List of discovered services for specified device.
   * @private
   */
  getServicesForPeripheral(managerId: ManagerId, peripheralId: PeripheralId, callback: Callback<Array<Service>>): void;

  /**
   * Returns characteristic for service by it's uuid
   * @private
   */
  getCharacteristicForServiceByUUID(
    managerId: ManagerId,
    peripheralId: PeripheralId,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    callback: Callback<Characteristic>
  ): void;

  /**
   * Returns characteristic for service
   * @private
   */
  getCharacteristicForService(
    managerId: ManagerId,
    serviceId: Identifier,
    characteristicUUID: UUID,
    callback: Callback<Characteristic>
  ): void;

  /**
   * List of discovered characteristics for specified service.
   * @private
   */
  getCharacteristicsForService(
    managerId: ManagerId,
    serviceId: Identifier,
    callback: Callback<Array<Characteristic>>
  ): void;

  // Characteristics operations

  /**
   * Read characteristic's value in Base64.
   * @private
   */
  readBase64CharacteristicValue(
    managerId: ManagerId,
    characteristicId: Identifier,
    cancelOptions: CancelOptions,
    callback: Callback<?String>
  ): void;

  /**
   * Write Base64 value to characteristic.
   * @private
   */
  writeBase64CharacteristicValue(
    managerId: ManagerId,
    characteristicId: Identifier,
    valueBase64: Base64,
    response: boolean,
    cancelOptions: CancelOptions,
    callback: Callback<void>
  ): void;

  /**
   * Setup monitoring of characteristic value in Base64.
   * @private
   */
  monitorBase64CharacteristicValue(
    managerId: ManagerId,
    characteristicId: Identifier,
    callback: Callback<Buffer<string>>
  ): void;

  /**
   * Returns if specified characteristic is currently not
   * @private
   */
  isCharacteristicNotifying(managerId: ManagerId, characteristicId: Identifier, callback: Callback<boolean>): void;

  // Other APIs

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
  getLogLevel(callback: Callback<$Keys<typeof LogLevel>>): void;
}

export const BleModule: BleModuleInterface = NativeModules.BleClientManager
