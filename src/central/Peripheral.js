// @flow
'use strict'

import { BleModule } from '../BleModule'
import { createCallback } from '../Utils'
import type { CancelOptions } from '../Promise'
import type { UUID } from '../TypeDefinition'
import type { Service } from './Service'
import type { Buffer } from '../Buffer'

/**
 * Peripheral (device) type
 */
export type Peripheral = {
  /**
   * Device identifier: MAC address on Android and UUID on iOS.
   */
  id: string,
  /**
   * CentralManager ID to which characteristic belongs
   */
  centralId: number
}

export type ConnectionOptions = CancelOptions & {
  autoConnect?: boolean,
  refreshGatt?: boolean, // TODO: add as a separate method
  notifyOnConnection?: boolean,
  notifyOnDisconnection?: boolean,
  notifyOnNotification?: boolean
}

export function connect(peripheral: Peripheral, options: ConnectionOptions = {}): Promise<Peripheral> {
  return new Promise((resolve, reject) => {
    BleModule.connectToPeripheral(peripheral.centralId, peripheral.id, options, createCallback(resolve, reject))
  })
}

export function cancelConnection(peripheral: Peripheral, options: CancelOptions = {}): Promise<Peripheral> {
  return new Promise((resolve, reject) => {
    BleModule.cancelPeripheralConnection(peripheral.centralId, peripheral.id, options, createCallback(resolve, reject))
  })
}

export function isConnected(peripheral: Peripheral): Promise<boolean> {
  return new Promise((resolve, reject) => {
    BleModule.isPeripheralConnected(peripheral.centralId, peripheral.id, createCallback(resolve, reject))
  })
}

export function getName(peripheral: Peripheral): Promise<?String> {
  return new Promise((resolve, reject) => {
    BleModule.getNameForPeripheral(peripheral.centralId, peripheral.id, createCallback(resolve, reject))
  })
}

export function monitorName(peripheral: Peripheral): Promise<Buffer<?String>> {
  return new Promise((resolve, reject) => {
    BleModule.monitorPeripheralName(peripheral.centralId, peripheral.id, createCallback(resolve, reject))
  })
}

export function readRSSI(peripheral: Peripheral, cancelOptions: CancelOptions = {}): Promise<number> {
  return new Promise((resolve, reject) => {
    BleModule.readRSSIForPeripheral(peripheral.centralId, peripheral.id, cancelOptions, createCallback(resolve, reject))
  })
}

export function requestMTU(
  peripheral: Peripheral,
  mtu: number,
  cancelOptions: CancelOptions = {}
): Promise<number> {
  return new Promise((resolve, reject) => {
    BleModule.requestMTUForPeripheral(
      peripheral.centralId,
      peripheral.id,
      mtu,
      cancelOptions,
      createCallback(resolve, reject)
    )
  })
}

export function getMTU(peripheral: Peripheral): Promise<number> {
  return new Promise((resolve, reject) => {
    BleModule.getMTUForPeripheral(peripheral.centralId, peripheral.id, createCallback(resolve, reject))
  })
}

export function monitorMTU(peripheral: Peripheral): Promise<Buffer<number>> {
  return new Promise((resolve, reject) => {
    BleModule.monitorMTUForPeripheral(peripheral.centralId, peripheral.id, createCallback(resolve, reject))
  })
}

// TODO add cancelOptions
export function discoverAllServicesAndCharacteristics(peripheral: Peripheral): Promise<void> {
  return new Promise((resolve, reject) => {
    BleModule.discoverAllServicesAndCharacteristicsForPeripheral(
      peripheral.centralId,
      peripheral.id,
      createCallback(resolve, reject)
    )
  })
}

export function getService(peripheral: Peripheral, serviceUUID: UUID): Promise<Service> {
  return new Promise((resolve, reject) => {
    BleModule.getServiceForPeripheral(peripheral.centralId, peripheral.id, serviceUUID, createCallback(resolve, reject))
  })
}

export function getServices(peripheral: Peripheral): Promise<Array<Service>> {
  return new Promise((resolve, reject) => {
    BleModule.getServicesForPeripheral(peripheral.centralId, peripheral.id, createCallback(resolve, reject))
  })
}
