// @flow
'use strict'

/**
 * Bluetooth device id.
 */
export type DeviceId = string

/**
 * Unique identifier for BLE objects.
 */
export type Identifier = number

/**
 * Bluetooth UUID
 */
export type UUID = string

/**
 * Base64 value
 */
export type Base64 = string

/**
 * Transaction identifier. All transaction identifiers in numeric form are reserved for internal use.
 */
export type TransactionId = string

/**
 * Subscription
 * @interface
 */
export interface Subscription {
  /**
   * Removes subscription
   * @memberof Subscription
   * @ignore
   */
  remove(): void
}

/**
 * Options which can be passed to scanning function
 */
export interface ScanOptions {
  /**
   * By allowing duplicates scanning records are received more frequently [iOS only]
   * @memberof ScanOptions
   * @instance
   */
  allowDuplicates?: boolean,
  /**
   * Whether to directly connect to the remote device (false) or to automatically connect as soon as the remote device 
   * becomes available (true). [Android only]
   * @memberof ScanOptions
   * @instance
   */
  autoConnect?: boolean
}

/**
 * Connection specific options to be passed before connection happen. [Not used]
 */
export interface ConnectionOptions {
  // Not used for now
}

/**
 * Device Bluetooth Low Energy state. It's keys are used to check {@link #BleManager#state} values
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

/**
 * Native module logging log level. By default it is set to None
 */
export const LogLevel = {
  /**
   * Logging in native module is disabled
   */
  None: 'None',
  /**
   * All logs in native module are shown
   */
  Verbose: 'Verbose',
  /**
   * Only debug logs and of higher importance are shown in native module.
   */
  Debug: 'Debug',
  /**
   * Only info logs and of higher importance are shown in native module.
   */
  Info: 'Info',
  /**
   * Only warning logs and of higher importance are shown in native module.
   */
  Warning: 'Warning',
  /**
   * Only error logs and of higher importance are shown in native module.
   */
  Error: 'Error'
}
