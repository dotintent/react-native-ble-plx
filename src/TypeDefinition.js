// @flow
'use strict'

/**
 * Bluetooth device id.
 */
export type DeviceId = string

/**
 * Bluetooth UUID
 */
export type UUID = string

/**
 * Base64 value
 */
export type Base64 = string

/**
 * Transaction identifier
 */
export type TransactionId = string

/**
 * Subscription
 */
export type Subscription = {
  /**
   * Removes subscription
   */
  remove(): void
}

/**
 * Options which can be passed to scanning function
 */
export type ScanOptions = {
  /**
   * By allowing duplicates scanning records are received more frequently [iOS]
   */
  allowDuplicates?: boolean,
  /**
   * Whether to directly connect to the remote device (false) or to automatically connect as soon as the remote device 
   * becomes available (true). [Android]
   */
  autoConnect?: boolean
}

/**
 * Connection specific options to be passed before connection happen.
 */
export type ConnectionOptions = {
  // Not used for now
}

/**
 * Device Bluetooth Low Energy state.
 */
export const State = {
  Unknown: 'Unknown',
  Resetting: 'Resetting',
  Unsupported: 'Unsupported',
  Unauthorized: 'Unauthorized',
  PoweredOff: 'PoweredOff',
  PoweredOn: 'PoweredOn'
}
