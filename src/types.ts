// src/types.ts — Public types using const objects with as const

export const State = {
  Unknown: 'Unknown',
  Resetting: 'Resetting',
  Unsupported: 'Unsupported',
  Unauthorized: 'Unauthorized',
  PoweredOff: 'PoweredOff',
  PoweredOn: 'PoweredOn'
} as const
export type State = (typeof State)[keyof typeof State]

export const LogLevel = {
  None: 'None',
  Verbose: 'Verbose',
  Debug: 'Debug',
  Info: 'Info',
  Warning: 'Warning',
  Error: 'Error'
} as const
export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel]

export const ConnectionPriority = {
  Balanced: 0,
  High: 1,
  LowPower: 2
} as const
export type ConnectionPriority = (typeof ConnectionPriority)[keyof typeof ConnectionPriority]

export const ConnectionState = {
  Disconnected: 'disconnected',
  Connecting: 'connecting',
  Connected: 'connected',
  Disconnecting: 'disconnecting'
} as const
export type ConnectionState = (typeof ConnectionState)[keyof typeof ConnectionState]

export interface ScanOptions {
  scanMode?: number
  callbackType?: number
  legacyScan?: boolean
  allowDuplicates?: boolean
}

export interface ConnectOptions {
  autoConnect?: boolean
  timeout?: number
  retries?: number
  retryDelay?: number
  requestMtu?: number
}
