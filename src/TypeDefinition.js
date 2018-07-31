// @flow
'use strict'

export type Manager = {
  id: number
}

/**
 * Bluetooth UUID
 */
export type UUID = string

/**
 * Base64 value
 */
export type Base64 = string

/**
 * Manager id (Central or Peripheral)
 */
export type ManagerId = number

export type PromiseId = string

/**
 * Unique identifier for BLE objects.
 */
export type Identifier = number

/**
 * Peripheral UUID (iOS) or MAC address (android).
 */
export type PeripheralId = string

/**
 * Device Bluetooth Low Energy state. It's keys are used to check {@link #blemanagerstate} values
 * received by {@link BleManager}
 */
export const State = {
  /**
   * The current state of the manager is unknown; an update is imminent.
   */
  Unknown: 'Unknown',
  /**
   * The connection with the system service was momentarily lost; an update is imminent.
   */
  Resetting: 'Resetting',
  /**
   * The platform does not support Bluetooth low energy.
   */
  Unsupported: 'Unsupported',
  /**
   * The app is not authorized to use Bluetooth low energy.
   */
  Unauthorized: 'Unauthorized',
  /**
   * Bluetooth is currently powered off.
   */
  PoweredOff: 'PoweredOff',
  /**
   * Bluetooth is currently powered on and available to use.
   */
  PoweredOn: 'PoweredOn'
}

export type StateType = $Keys<typeof State>