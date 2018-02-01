// @flow
'use strict'

import { Device } from './Device'

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
 * [Android only] ConnectionOptions parameter to describe when to call BluetoothGatt.refresh()
 */
export type RefreshGattMoment = 'OnConnected'

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
  remove(): void;
}

/**
 * Options which can be passed to when creating BLE Manager
 */
export interface BleManagerOptions {
  /**
   * BLE State restoration identifier used to restore state.
   * @memberof BleManagerOptions
   * @instance
   */
  restoreStateIdentifier?: string;

  /**
   * Optional function which is used to properly restore state of your BLE Manager. Callback
   * is emitted in the beginning of BleManager creation and optional {@link BleRestoreState}
   * is passed. When value is `null` application is launching for the first time, otherwise
   * it contains saved state which may be used by developer to continue working with
   * connected peripherals.
   * @memberof BleManagerOptions
   * @instance
   */
  restoreStateFunction?: (restoredState: ?BleRestoredState) => void;
}

/**
 * Object representing information about restored BLE state after application relaunch.
 */
export interface BleRestoredState {
  /**
   * List of connected devices after state restoration.
   * @type {Array<Device>}
   * @instance
   * @memberof BleRestoredState
   */
  connectedPeripherals: Array<Device>;
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
  allowDuplicates?: boolean;
}

/**
 * Connection specific options to be passed before connection happen. [Not used]
 */
export interface ConnectionOptions {
  /**
   * Whether to directly connect to the remote device (false) or to automatically connect as soon as the remote device
   * becomes available (true). [Android only]
   * @memberof ConnectionOptions
   * @instance
   */
  autoConnect?: boolean;

  /**
   * Whether MTU size will be negotiated to this value. It is not guaranteed to get it after connection is successful.
   *
   * @memberof ConnectionOptions
   * @instance
   */
  requestMTU?: number;

  /**
   * Whether action will be taken to reset services cache. This option may be useful when a peripheral's firmware was
   * updated and it's services/characteristics were added/removed/altered. [Android only]
   * {@link https://stackoverflow.com/questions/22596951/how-to-programmatically-force-bluetooth-low-energy-service-discovery-on-android}
   * @memberof ConnectionOptions
   * @instance
   */
  refreshGatt?: RefreshGattMoment;
}

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

/**
 * Native module logging log level. By default it is set to None.
 * @name LogLevel
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
