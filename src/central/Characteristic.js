// @flow
'use strict'

import { toByteArray, fromByteArray } from 'base64-js'
import { BleModule } from '../BleModule'
import { createCallback } from '../Utils'
import type { UUID } from '../TypeDefinition'
import type { Buffer } from '../Buffer'
import type { CancelOptions } from '../Promise'

/**
 * Characteristic type.
 */
export type Characteristic = {
  /**
   * Characteristic unique identifier
   */
  id: number,
  /**
   * Characteristic UUID
   */
  uuid: UUID,
  /**
   * CentralManager ID to which characteristic belongs
   */
  centralId: number,
  /**
   * Service's ID to which characteristic belongs
   */
  serviceId: number,
  /**
   * Service's UUID to which characteristic belongs
   */
  serviceUUID: UUID,
  /**
   * Peripherals's (Device) ID to which characteristic belongs
   */
  peripheralId: string,
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
   * True if characteristic is monitoring value changes with ACK.
   */
  // TODO: change description
  isIndicatable: boolean, 
}

export function readBase64CharacteristicValue(
  characteristic: Characteristic,
  cancelOptions: CancelOptions = {}
): Promise<?String> {
  return new Promise((resolve, reject) => {
    BleModule.readBase64CharacteristicValue(
      characteristic.centralId,
      characteristic.id,
      cancelOptions,
      createCallback(resolve, reject)
    )
  })
}

export function readCharacteristicValue(characteristic: Characteristic, cancelOptions: CancelOptions = {}): Promise<ArrayBuffer> {
  return readBase64CharacteristicValue(characteristic, cancelOptions)
    .then(value => toByteArray(value))
}

export function writeBase64CharacteristicValueWithResponse(
  characteristic: Characteristic,
  base64Value: string,
  cancelOptions: CancelOptions = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    BleModule.writeBase64CharacteristicValue(
      characteristic.centralId,
      characteristic.id,
      base64Value,
      true,
      cancelOptions,
      createCallback(resolve, reject)
    )
  })
}

export function writeCharacteristicValueWithResponse(
  characteristic: Characteristic,
  value: ArrayBuffer,
  cancelOptions: CancelOptions = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    BleModule.writeBase64CharacteristicValue(
      characteristic.centralId,
      characteristic.id,
      fromByteArray(value),
      true,
      cancelOptions,
      createCallback(resolve, reject)
    )
  })
}

export function writeBase64CharacteristicValueWithoutResponse(
  characteristic: Characteristic,
  base64Value: string,
  cancelOptions: CancelOptions = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    BleModule.writeBase64CharacteristicValue(
      characteristic.centralId,
      characteristic.id,
      base64Value,
      false,
      cancelOptions,
      createCallback(resolve, reject)
    )
  })
}

export function writeCharacteristicValueWithoutResponse(
  characteristic: Characteristic,
  value: ArrayBuffer,
  cancelOptions: CancelOptions = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    BleModule.writeBase64CharacteristicValue(
      characteristic.centralId,
      characteristic.id,
      fromByteArray(value),
      false,
      cancelOptions,
      createCallback(resolve, reject)
    )
  })
}

export function monitorBase64CharacteristicValue(characteristic: Characteristic): Promise<Buffer<string>> {
  return new Promise((resolve, reject) => {
    BleModule.monitorBase64CharacteristicValue(characteristic.centralId, characteristic.id, createCallback(resolve, reject))
  })
}

// TODO: add this method
// export function monitorCharacteristicValue(characteristic: Characteristic): Promise<Buffer<ArrayBuffer>> {}

export function isCharacteristicNotifying(characteristic: Characteristic): Promise<boolean> {
  return new Promise((resolve, reject) => {
    BleModule.isCharacteristicNotifying(characteristic.centralId, characteristic.id, createCallback(resolve, reject))
  })
}
