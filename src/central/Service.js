// @flow
'use strict'

import { BleModule } from '../BleModule'
import { createCallback } from '../Utils'
import type { Peripheral } from './Peripheral'
import type { Characteristic } from './Characteristic'
import type { UUID } from '../TypeDefinition'

/**
 * Service type.
 */
export type Service = {
  /**
   * Service unique identifier
   */
  id: number,
  /**
   * Peripheral's (Device) ID to which service belongs
   */
  peripheralId: string,
  /**
   * CentralManager ID to which characteristic belongs
   */
  centralId: number,
  /**
   * Service UUID
   */
  uuid: UUID,
  /**
   * Value indicating whether the type of service is primary or secondary.
   */
  isPrimary: boolean
}

export function getCharacteristicForService(peripheral: Peripheral, serviceUUID: UUID, characteristicUUID: UUID): Promise<Characteristic> {
  return new Promise((resolve, reject) => {
    BleModule.getCharacteristicForServiceByUUID(peripheral.centralId, peripheral.id, serviceUUID, characteristicUUID, createCallback(resolve, reject))
  })
}

export function getCharacteristic(service: Service, characteristicUUID: UUID): Promise<Characteristic> {
  return new Promise((resolve, reject) => {
    BleModule.getCharacteristicForService(service.centralId, service.id, characteristicUUID, createCallback(resolve, reject))
  })
}

export function getCharacteristics(service: Service): Promise<Array<Characteristic>> {
  return new Promise((resolve, reject) => {
    BleModule.getCharacteristicsForService(service.centralId, service.id, createCallback(resolve, reject))
  })
}