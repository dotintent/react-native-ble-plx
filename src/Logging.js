// @flow
'use strict'

import { BleModule } from './BleModule'
import { createCallback } from './Utils'

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

export type LogLevelType = $Keys<typeof LogLevel>

export function setLogLevel(logLevel: LogLevelType): Promise<void> {
  return new Promise(resolve => {
    BleModule.setLogLevel(logLevel)
    resolve()
  })
}

export function getLogLevel(): Promise<LogLevelType> {
  return new Promise((resolve, reject) => {
    BleModule.getLogLevel(createCallback(resolve, reject))
  })
}