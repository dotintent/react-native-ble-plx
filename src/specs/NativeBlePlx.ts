import type { TurboModule, CodegenTypes } from 'react-native'
import { TurboModuleRegistry } from 'react-native'

// All types must be inline — Codegen ignores imports from other files
// Union types NOT supported — use string with runtime validation

export type DeviceInfo = Readonly<{
  id: string // Android: MAC address, iOS: opaque UUID
  name: string | null
  rssi: number
  mtu: number
  isConnectable: boolean | null
  serviceUuids: ReadonlyArray<string>
  manufacturerData: string | null // Base64-encoded
}>

export type CharacteristicInfo = Readonly<{
  deviceId: string
  serviceUuid: string
  uuid: string
  value: string | null // Base64-encoded
  isNotifying: boolean
  isIndicatable: boolean
  isReadable: boolean
  isWritableWithResponse: boolean
  isWritableWithoutResponse: boolean
}>

export type ScanResult = Readonly<{
  id: string
  name: string | null
  rssi: number
  serviceUuids: ReadonlyArray<string>
  manufacturerData: string | null
}>

export type ConnectionStateEvent = Readonly<{
  deviceId: string
  state: string // 'connecting' | 'connected' | 'disconnecting' | 'disconnected'
  errorCode: number | null
  errorMessage: string | null
}>

export type CharacteristicValueEvent = Readonly<{
  deviceId: string
  serviceUuid: string
  characteristicUuid: string
  value: string // Base64-encoded
  transactionId: string | null
}>

export type StateChangeEvent = Readonly<{
  state: string // 'Unknown' | 'Resetting' | 'Unsupported' | 'Unauthorized' | 'PoweredOff' | 'PoweredOn'
}>

export type RestoreStateEvent = Readonly<{
  devices: ReadonlyArray<DeviceInfo>
}>

export type BleErrorInfo = Readonly<{
  code: number
  message: string
  isRetryable: boolean
  deviceId: string | null
  serviceUuid: string | null
  characteristicUuid: string | null
  operation: string | null
  platform: string
  nativeDomain: string | null
  nativeCode: number | null
  gattStatus: number | null
  attErrorCode: number | null
}>

export interface Spec extends TurboModule {
  // Lifecycle
  createClient(restoreStateIdentifier: string | null): Promise<void>
  destroyClient(): Promise<void>

  // State
  state(): Promise<string>

  // Scanning
  startDeviceScan(
    uuids: ReadonlyArray<string> | null,
    options: Readonly<{
      scanMode?: number
      callbackType?: number
      legacyScan?: boolean
      allowDuplicates?: boolean
    }> | null
  ): void
  stopDeviceScan(): Promise<void>

  // Connection
  connectToDevice(
    deviceId: string,
    options: Readonly<{
      autoConnect?: boolean
      timeout?: number
      retries?: number
      retryDelay?: number
      requestMtu?: number
    }> | null
  ): Promise<DeviceInfo>
  cancelDeviceConnection(deviceId: string): Promise<DeviceInfo>
  isDeviceConnected(deviceId: string): Promise<boolean>

  // Discovery
  discoverAllServicesAndCharacteristics(deviceId: string, transactionId: string | null): Promise<DeviceInfo>

  // Read/Write
  readCharacteristic(
    deviceId: string,
    serviceUuid: string,
    characteristicUuid: string,
    transactionId: string | null
  ): Promise<CharacteristicInfo>
  writeCharacteristic(
    deviceId: string,
    serviceUuid: string,
    characteristicUuid: string,
    value: string,
    withResponse: boolean,
    transactionId: string | null
  ): Promise<CharacteristicInfo>

  // Monitor
  monitorCharacteristic(
    deviceId: string,
    serviceUuid: string,
    characteristicUuid: string,
    subscriptionType: string | null,
    transactionId: string | null
  ): void

  // MTU
  getMtu(deviceId: string): Promise<number>
  requestMtu(deviceId: string, mtu: number, transactionId: string | null): Promise<DeviceInfo>

  // PHY
  requestPhy(deviceId: string, txPhy: number, rxPhy: number): Promise<DeviceInfo>
  readPhy(deviceId: string): Promise<DeviceInfo>

  // Connection Priority
  requestConnectionPriority(deviceId: string, priority: number): Promise<DeviceInfo>

  // L2CAP
  openL2CAPChannel(deviceId: string, psm: number): Promise<Readonly<{ channelId: number }>>
  writeL2CAPChannel(channelId: number, data: string): Promise<void>
  closeL2CAPChannel(channelId: number): Promise<void>

  // Bonding
  getBondedDevices(): Promise<ReadonlyArray<DeviceInfo>>

  // Authorization
  getAuthorizationStatus(): Promise<string>

  // Cancellation
  cancelTransaction(transactionId: string): Promise<void>

  // Typed Event Emitters
  readonly onScanResult: CodegenTypes.EventEmitter<ScanResult>
  readonly onConnectionStateChange: CodegenTypes.EventEmitter<ConnectionStateEvent>
  readonly onCharacteristicValueUpdate: CodegenTypes.EventEmitter<CharacteristicValueEvent>
  readonly onStateChange: CodegenTypes.EventEmitter<StateChangeEvent>
  readonly onRestoreState: CodegenTypes.EventEmitter<RestoreStateEvent>
  readonly onError: CodegenTypes.EventEmitter<BleErrorInfo>
  readonly onBondStateChange: CodegenTypes.EventEmitter<Readonly<{ deviceId: string; bondState: string }>>
  readonly onConnectionEvent: CodegenTypes.EventEmitter<Readonly<{ deviceId: string; event: string }>>
  readonly onL2CAPData: CodegenTypes.EventEmitter<Readonly<{ channelId: number; data: string }>>
  readonly onL2CAPClose: CodegenTypes.EventEmitter<Readonly<{ channelId: number; error: string | null }>>
}

export default TurboModuleRegistry.get<Spec>('NativeBlePlx')
