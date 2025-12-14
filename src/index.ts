
export { BleError, BleErrorCode, BleATTErrorCode, BleIOSErrorCode, BleAndroidErrorCode } from './BleError'
export { BleManager } from './BleManager'
export { Device } from './Device'
export { Service } from './Service'
export { Characteristic } from './Characteristic'
export { Descriptor } from './Descriptor'
export { fullUUID } from './Utils'
export { State, LogLevel, ConnectionPriority, ScanCallbackType, ScanMode } from './TypeDefinition'

// Reliability utilities
export { ConnectionQueue } from './ConnectionQueue'
export type { QueuedConnectionOptions } from './ConnectionQueue'
export { ReconnectionManager } from './ReconnectionManager'
export type { ReconnectionCallbacks } from './ReconnectionManager'

export type {
  Subscription,
  DeviceId,
  UUID,
  TransactionId,
  Base64,
  ScanOptions,
  ConnectionOptions,
  BleManagerOptions,
  BleRestoredState,
  BackgroundModeOptions,
  ReconnectionOptions
} from './TypeDefinition'
