// @flow
'use strict'

import { BleModule } from '../BleModule'
import { NativeBleError } from '../BleError'
import { peekLatest } from '../Buffer'
import { createCallback } from '../Utils'
import type { Peripheral } from './Peripheral'
import type { Buffer } from '../Buffer'
import type { Manager, Base64, UUID, StateType } from '../TypeDefinition'

export type CentralManager = Manager

export type CentralManagerOptions = {
  restoreStateId?: string,
  showPowerAlert?: boolean
}

export type ScanRecord = {
  /**
   * Peripheral object
   */
  peripheral: Peripheral,
  /**
   * Current Received Signal Strength Indication of device
   */
  rssi: number,
  /**
   * Advertisement data
   */
  advertisement: AdvertisementData
}

export type AdvertisementData = {
  /**
   * Device's custom manufacturer data. Its format is defined by manufacturer.
   */
  manufacturerData: ?Base64,
  /**
   * Map of service UUIDs (as keys) with associated data (as values).
   */
  serviceData: ?{ [uuid: UUID]: Base64 },
  /**
   * List of available services visible during scanning.
   */
  serviceUUIDs: ?Array<UUID>,
  /**
   * User friendly name of device.
   */
  localName: ?string,
  /**
   * Transmission power level of device.
   */
  txPowerLevel: ?number,
  /**
   * List of solicited service UUIDs.
   */
  solicitedServiceUUIDs: ?Array<UUID>,
  /**
   * Is device connectable. [iOS only]
   */
  isConnectable: ?boolean,
  /**
   * List of overflow service UUIDs. [iOS only]
   */
  overflowServiceUUIDs: ?Array<UUID>
}

export type ScanOptions = {
  allowDuplicates?: boolean
}

export type RestoredState = {
  connectedPeripherals?: Array<Peripheral>,
  scanOptions?: ScanOptions,
  scanServices?: Array<UUID>
}

export type MonitorStateOptions = {
  emitCurrentState?: boolean
}

export function create(options: CentralManagerOptions = {}): Promise<CentralManager> {
  return new Promise((resolve, reject) => {
    BleModule.createCentralClient(options, (err, data) => {
      (data ? resolve({ id: data }) : reject(err))
    })
  })
}

export function destroy(central: CentralManager): Promise<void> {
  return new Promise(resolve => {
    BleModule.destroyCentralClient(central.id)
    resolve()
  })
}

export function getRestoredState(central: CentralManager, timeout: number = 2000): Promise<?RestoredState> {
  return new Promise(resolve => {
    BleModule.monitorRestoreState(central.id, (error, data) => {
      if (data) {
        peekLatest(data, { timeout })
          .then(resolve)
          .catch(() => { resolve(null) })
      } else {
        resolve(null)
      }
    })
  })
}

export function getState(central: CentralManager): Promise<StateType> {
  return new Promise((resolve, reject) => {
    BleModule.getState(central.id, createCallback(resolve, reject))
  })
}

export function monitorState(central: CentralManager, options: MonitorStateOptions = {}): Promise<Buffer<StateType>> {
  return new Promise((resolve, reject) => {
    BleModule.monitorState(central.id, options, createCallback(resolve, reject))
  })
}

export function scanForPeripherals(
  central: CentralManager,
  serviceUUIDs: ?Array<UUID>,
  options: ScanOptions = {}
): Promise<Buffer<ScanRecord>> {
  return new Promise((resolve, reject) => {
    BleModule.scanForPeripherals(central.id, serviceUUIDs, options, createCallback(resolve, reject))
  })
}

export function getPeripheral(central: CentralManager, peripheralId: string): Promise<Peripheral> {
  return getPeripherals(central, [peripheralId]).then(peripherals => peripherals[0])
}

export function getPeripherals(central: CentralManager, peripheralIds: Array<string>): Promise<Array<Peripheral>> {
  return new Promise((resolve, reject) => {
    BleModule.getPeripherals(central.id, peripheralIds, createCallback(resolve, reject))
  })
}

export function getConnectedPeripherals(
  central: CentralManager,
  serviceUUIDs: Array<UUID>
): Promise<Array<Peripheral>> {
  return new Promise((resolve, reject) => {
    BleModule.getConnectedPeripherals(central.id, serviceUUIDs, createCallback(resolve, reject))
  })
}

export function monitorDisconnection(central: CentralManager): Promise<Buffer<[Peripheral, ?NativeBleError]>> {
  return new Promise((resolve, reject) => {
    BleModule.monitorDisconnection(central.id, createCallback(resolve, reject))
  })
}
