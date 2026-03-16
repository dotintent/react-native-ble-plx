// src/BleError.ts — Unified cross-platform error model

export const BleErrorCode = {
  DeviceNotFound: 0,
  DeviceDisconnected: 1,
  ConnectionFailed: 2,
  ConnectionTimeout: 3,
  OperationCancelled: 100,
  OperationTimeout: 101,
  OperationNotSupported: 102,
  OperationInProgress: 103,
  CharacteristicNotFound: 200,
  ServiceNotFound: 201,
  DescriptorNotFound: 202,
  CharacteristicWriteFailed: 203,
  CharacteristicReadFailed: 204,
  MTUNegotiationFailed: 205,
  BluetoothUnauthorized: 300,
  BluetoothPoweredOff: 301,
  LocationPermissionDenied: 302,
  ScanPermissionDenied: 303,
  ConnectPermissionDenied: 304,
  ManagerNotInitialized: 400,
  ManagerDestroyed: 401,
  BondingFailed: 500,
  BondLost: 501,
  PairingRejected: 502,
  L2CAPChannelFailed: 600,
  L2CAPChannelClosed: 601,
  PhyNegotiationFailed: 700,
  ScanFailed: 800,
  ScanThrottled: 801,
  UnknownError: 999
} as const
export type BleErrorCode = (typeof BleErrorCode)[keyof typeof BleErrorCode]

export class BleError extends Error {
  readonly code: BleErrorCode
  readonly isRetryable: boolean
  readonly deviceId?: string
  readonly serviceUUID?: string
  readonly characteristicUUID?: string
  readonly operation?: string
  readonly platform: 'android' | 'ios'
  readonly nativeDomain?: string
  readonly nativeCode?: number
  readonly gattStatus?: number
  readonly attErrorCode?: number

  constructor(errorInfo: {
    code: number
    message: string
    isRetryable: boolean
    platform: string
    deviceId?: string | null
    serviceUuid?: string | null
    characteristicUuid?: string | null
    operation?: string | null
    nativeDomain?: string | null
    nativeCode?: number | null
    gattStatus?: number | null
    attErrorCode?: number | null
  }) {
    super(errorInfo.message)
    this.name = 'BleError'
    this.code = errorInfo.code as BleErrorCode
    this.isRetryable = errorInfo.isRetryable
    this.platform = errorInfo.platform as 'android' | 'ios'
    this.deviceId = errorInfo.deviceId ?? undefined
    this.serviceUUID = errorInfo.serviceUuid ?? undefined
    this.characteristicUUID = errorInfo.characteristicUuid ?? undefined
    this.operation = errorInfo.operation ?? undefined
    this.nativeDomain = errorInfo.nativeDomain ?? undefined
    this.nativeCode = errorInfo.nativeCode ?? undefined
    this.gattStatus = errorInfo.gattStatus ?? undefined
    this.attErrorCode = errorInfo.attErrorCode ?? undefined
  }
}
