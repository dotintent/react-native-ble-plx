import { TurboModuleRegistry, Platform } from 'react-native'
import type { EventSubscription, TurboModule } from 'react-native'
import type { State, ScanOptions, ConnectOptions, ConnectionPriority } from './types'
import { BleError, BleErrorCode } from './BleError'
import { EventBatcher } from './EventBatcher'

// ---------------------------------------------------------------------------
// Native module types (mirrored from specs/NativeBlePlx.ts since specs/ is
// excluded from tsconfig)
// ---------------------------------------------------------------------------

type NativeEventEmitter<T> = (handler: (arg: T) => void | Promise<void>) => EventSubscription

interface DeviceInfo {
  readonly id: string
  readonly name: string | null
  readonly rssi: number
  readonly mtu: number
  readonly isConnectable: boolean | null
  readonly serviceUuids: readonly string[]
  readonly manufacturerData: string | null
}

interface CharacteristicInfo {
  readonly deviceId: string
  readonly serviceUuid: string
  readonly uuid: string
  readonly value: string | null
  readonly isNotifying: boolean
  readonly isIndicatable: boolean
  readonly isReadable: boolean
  readonly isWritableWithResponse: boolean
  readonly isWritableWithoutResponse: boolean
}

interface ScanResult {
  readonly id: string
  readonly name: string | null
  readonly rssi: number
  readonly serviceUuids: readonly string[]
  readonly manufacturerData: string | null
}

interface ConnectionStateEvent {
  readonly deviceId: string
  readonly state: string
  readonly errorCode: number | null
  readonly errorMessage: string | null
}

interface CharacteristicValueEvent {
  readonly deviceId: string
  readonly serviceUuid: string
  readonly characteristicUuid: string
  readonly value: string
  readonly transactionId: string | null
}

interface StateChangeEvent {
  readonly state: string
}

interface BleErrorInfo {
  readonly code: number
  readonly message: string
  readonly isRetryable: boolean
  readonly deviceId: string | null
  readonly serviceUuid: string | null
  readonly characteristicUuid: string | null
  readonly operation: string | null
  readonly platform: string
  readonly nativeDomain: string | null
  readonly nativeCode: number | null
  readonly gattStatus: number | null
  readonly attErrorCode: number | null
}

interface BondStateEvent {
  readonly deviceId: string
  readonly bondState: string
}

interface ConnectionEvent {
  readonly deviceId: string
  readonly connectionState: string
}

interface RestoreStateEvent {
  readonly devices: readonly DeviceInfo[]
}

interface L2CAPChannelEvent {
  readonly channelId: number
  readonly deviceId: string
  readonly psm: number
}

interface PhyInfo {
  readonly deviceId: string
  readonly txPhy: number
  readonly rxPhy: number
}

interface NativeBlePlxSpec extends TurboModule {
  createClient(restoreStateIdentifier: string | null): Promise<void>
  destroyClient(): Promise<void>
  state(): Promise<string>
  startDeviceScan(
    uuids: readonly string[] | null,
    options: Readonly<{
      scanMode?: number
      callbackType?: number
      legacyScan?: boolean
      allowDuplicates?: boolean
    }> | null
  ): void
  stopDeviceScan(): Promise<void>
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
  discoverAllServicesAndCharacteristics(deviceId: string, transactionId: string | null): Promise<DeviceInfo>
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
  monitorCharacteristic(
    deviceId: string,
    serviceUuid: string,
    characteristicUuid: string,
    subscriptionType: string | null,
    transactionId: string | null
  ): void
  requestMtu(deviceId: string, mtu: number, transactionId: string | null): Promise<DeviceInfo>
  requestConnectionPriority(deviceId: string, priority: number): Promise<DeviceInfo>
  cancelTransaction(transactionId: string): Promise<void>
  getMtu(deviceId: string): Promise<number>
  requestPhy(deviceId: string, txPhy: number, rxPhy: number): Promise<PhyInfo>
  readPhy(deviceId: string): Promise<PhyInfo>
  getBondedDevices(): Promise<readonly DeviceInfo[]>
  getAuthorizationStatus(): Promise<string>
  openL2CAPChannel(deviceId: string, psm: number): Promise<L2CAPChannelEvent>
  writeL2CAPChannel(channelId: number, data: string): Promise<void>
  closeL2CAPChannel(channelId: number): Promise<void>

  readonly onScanResult: NativeEventEmitter<ScanResult>
  readonly onConnectionStateChange: NativeEventEmitter<ConnectionStateEvent>
  readonly onCharacteristicValueUpdate: NativeEventEmitter<CharacteristicValueEvent>
  readonly onStateChange: NativeEventEmitter<StateChangeEvent>
  readonly onError: NativeEventEmitter<BleErrorInfo>
  readonly onRestoreState: NativeEventEmitter<RestoreStateEvent>
  readonly onBondStateChange: NativeEventEmitter<BondStateEvent>
  readonly onConnectionEvent: NativeEventEmitter<ConnectionEvent>
  readonly onL2CAPData: NativeEventEmitter<{ readonly channelId: number; readonly data: string }>
  readonly onL2CAPClose: NativeEventEmitter<{ readonly channelId: number; readonly error: string | null }>
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type {
  DeviceInfo,
  CharacteristicInfo,
  ScanResult,
  ConnectionStateEvent,
  CharacteristicValueEvent,
  BondStateEvent,
  ConnectionEvent,
  RestoreStateEvent,
  L2CAPChannelEvent,
  PhyInfo
}

export interface Subscription {
  remove(): void
}

export interface MonitorOptions {
  transactionId?: string
  batchInterval?: number
  subscriptionType?: 'notify' | 'indicate' | null
}

export interface BleManagerOptions {
  scanBatchIntervalMs?: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let transactionCounter = 0
function nextTransactionId(): string {
  transactionCounter += 1
  return `__ble_tx_${transactionCounter}`
}

function getNativeModule(): NativeBlePlxSpec {
  const mod = TurboModuleRegistry.get<NativeBlePlxSpec>('NativeBlePlx')
  if (!mod) {
    throw new Error(
      'react-native-ble-plx: NativeBlePlx TurboModule not found. Make sure the native module is linked correctly.'
    )
  }
  return mod
}

// ---------------------------------------------------------------------------
// BleManager
// ---------------------------------------------------------------------------

export class BleManager {
  private cachedNativeModule: NativeBlePlxSpec | null = null
  private scanBatcher: EventBatcher<ScanResult> | null = null
  private scanSubscription: EventSubscription | null = null
  private errorSubscription: EventSubscription | null = null
  private monitorBatchers = new Map<string, EventBatcher<CharacteristicValueEvent>>()
  private monitorSubscriptions = new Map<string, EventSubscription>()
  private activeTransactionIds = new Set<string>()
  private consumerSubscriptions = new Set<Subscription>()
  private scanBatchIntervalMs: number

  constructor(options?: BleManagerOptions) {
    this.scanBatchIntervalMs = options?.scanBatchIntervalMs ?? 100
  }

  private get nativeModule(): NativeBlePlxSpec {
    if (!this.cachedNativeModule) {
      this.cachedNativeModule = getNativeModule()
    }
    return this.cachedNativeModule
  }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  async createClient(restoreStateIdentifier: string | null = null): Promise<void> {
    // Clean up any existing error subscription to avoid leaks (Bug 6)
    this.errorSubscription?.remove()
    this.errorSubscription = null

    await this.nativeModule.createClient(restoreStateIdentifier)

    // Subscribe to native error events globally
    this.errorSubscription = this.nativeModule.onError(_info => {
      // Errors are routed through individual operation promises on the native side.
      // This listener is kept so consumers can add a global handler in the future.
    })
  }

  async destroyClient(): Promise<void> {
    // Dispose scan batcher & subscription
    this.scanBatcher?.dispose()
    this.scanBatcher = null
    this.scanSubscription?.remove()
    this.scanSubscription = null

    // Dispose all monitor batchers & subscriptions
    this.monitorBatchers.forEach(batcher => batcher.dispose())
    this.monitorBatchers.clear()

    this.monitorSubscriptions.forEach(sub => sub.remove())
    this.monitorSubscriptions.clear()

    // Clean up all consumer subscriptions (Bug 3)
    this.consumerSubscriptions.forEach(sub => sub.remove())
    this.consumerSubscriptions.clear()

    // Cancel all active transactions
    const cancelPromises = [...this.activeTransactionIds].map(txId =>
      this.nativeModule.cancelTransaction(txId).catch(() => {
        // Best-effort cancellation — ignore errors from already-completed transactions
      })
    )
    await Promise.all(cancelPromises)
    this.activeTransactionIds.clear()

    // Remove global error listener
    this.errorSubscription?.remove()
    this.errorSubscription = null

    await this.nativeModule.destroyClient()
  }

  // -----------------------------------------------------------------------
  // State
  // -----------------------------------------------------------------------

  async state(): Promise<State> {
    const rawState = await this.nativeModule.state()
    return rawState as State
  }

  onStateChange(callback: (state: State) => void, emitCurrentState?: boolean): Subscription {
    let removed = false

    const sub = this.nativeModule.onStateChange(event => {
      if (!removed) {
        callback(event.state as State)
      }
    })

    if (emitCurrentState) {
      this.nativeModule.state().then(
        s => {
          if (!removed) callback(s as State)
        },
        () => {
          // Ignore errors when reading initial state
        }
      )
    }

    const subscription: Subscription = {
      remove: () => {
        if (removed) return
        removed = true
        sub.remove()
        this.consumerSubscriptions.delete(subscription)
      }
    }

    this.consumerSubscriptions.add(subscription)
    return subscription
  }

  // -----------------------------------------------------------------------
  // Scanning
  // -----------------------------------------------------------------------

  startDeviceScan(
    serviceUuids: string[] | null,
    options: ScanOptions | null,
    callback: (error: BleError | null, scannedDevice: ScanResult | null) => void
  ): void {
    // Clean up any previous scan
    this.stopScanInternal()

    // Create batcher for scan results
    this.scanBatcher = new EventBatcher<ScanResult>(this.scanBatchIntervalMs, 50, batch => {
      batch.forEach(result => callback(null, result))
    })

    // Listen to native scan events
    this.scanSubscription = this.nativeModule.onScanResult(result => {
      this.scanBatcher?.push(result)
    })

    // Start native scan (synchronous — errors come via onError)
    // Pass empty object instead of null — iOS Codegen struct crashes on null backing dictionary
    this.nativeModule.startDeviceScan(serviceUuids, options ?? {})
  }

  async stopDeviceScan(): Promise<void> {
    this.stopScanInternal()
    await this.nativeModule.stopDeviceScan()
  }

  private stopScanInternal(): void {
    this.scanBatcher?.dispose()
    this.scanBatcher = null
    this.scanSubscription?.remove()
    this.scanSubscription = null
  }

  // -----------------------------------------------------------------------
  // Connection
  // -----------------------------------------------------------------------

  async connectToDevice(deviceId: string, options?: ConnectOptions | null): Promise<DeviceInfo> {
    // Pass empty object instead of null — iOS Codegen struct crashes on null backing dictionary
    return this.nativeModule.connectToDevice(deviceId, options ?? {})
  }

  async cancelDeviceConnection(deviceId: string): Promise<DeviceInfo> {
    return this.nativeModule.cancelDeviceConnection(deviceId)
  }

  async isDeviceConnected(deviceId: string): Promise<boolean> {
    return this.nativeModule.isDeviceConnected(deviceId)
  }

  onDeviceDisconnected(
    deviceId: string,
    callback: (error: BleError | null, device: ConnectionStateEvent | null) => void
  ): Subscription {
    const sub = this.nativeModule.onConnectionStateChange(event => {
      if (event.deviceId !== deviceId) return
      if (event.state !== 'disconnected') return

      if (event.errorCode != null && event.errorMessage != null) {
        const bleError = new BleError({
          code: event.errorCode,
          message: event.errorMessage,
          isRetryable: false,
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
          deviceId: event.deviceId
        })
        callback(bleError, event)
      } else {
        callback(null, event)
      }
    })

    const subscription: Subscription = {
      remove: () => {
        sub.remove()
        this.consumerSubscriptions.delete(subscription)
      }
    }

    this.consumerSubscriptions.add(subscription)
    return subscription
  }

  // -----------------------------------------------------------------------
  // Discovery
  // -----------------------------------------------------------------------

  async discoverAllServicesAndCharacteristics(deviceId: string, transactionId?: string | null): Promise<DeviceInfo> {
    return this.nativeModule.discoverAllServicesAndCharacteristics(deviceId, transactionId ?? null)
  }

  // -----------------------------------------------------------------------
  // Read / Write
  // -----------------------------------------------------------------------

  async readCharacteristicForDevice(
    deviceId: string,
    serviceUuid: string,
    characteristicUuid: string,
    transactionId?: string | null
  ): Promise<CharacteristicInfo> {
    return this.nativeModule.readCharacteristic(deviceId, serviceUuid, characteristicUuid, transactionId ?? null)
  }

  async writeCharacteristicForDevice(
    deviceId: string,
    serviceUuid: string,
    characteristicUuid: string,
    value: string,
    withResponse: boolean,
    transactionId?: string | null
  ): Promise<CharacteristicInfo> {
    return this.nativeModule.writeCharacteristic(
      deviceId,
      serviceUuid,
      characteristicUuid,
      value,
      withResponse,
      transactionId ?? null
    )
  }

  // -----------------------------------------------------------------------
  // Monitor
  // -----------------------------------------------------------------------

  monitorCharacteristicForDevice(
    deviceId: string,
    serviceUuid: string,
    characteristicUuid: string,
    listener: (error: BleError | null, characteristic: CharacteristicValueEvent | null) => void,
    options?: MonitorOptions
  ): Subscription {
    const txId = options?.transactionId ?? nextTransactionId()
    const batchInterval = options?.batchInterval ?? 0
    const subscriptionType = options?.subscriptionType ?? null

    // Clean up any existing monitor with this txId (Bug 4)
    const existingBatcher = this.monitorBatchers.get(txId)
    if (existingBatcher) {
      existingBatcher.dispose()
      this.monitorBatchers.delete(txId)
    }
    const existingSub = this.monitorSubscriptions.get(txId)
    if (existingSub) {
      existingSub.remove()
      this.monitorSubscriptions.delete(txId)
    }

    this.activeTransactionIds.add(txId)

    // Create batcher for this monitor (0 = immediate delivery)
    const batcher = new EventBatcher<CharacteristicValueEvent>(batchInterval, 50, batch => {
      batch.forEach(event => listener(null, event))
    })
    this.monitorBatchers.set(txId, batcher)

    // Listen to native characteristic value events, filtered by key fields
    const sub = this.nativeModule.onCharacteristicValueUpdate(event => {
      if (event.deviceId !== deviceId) return
      if (event.serviceUuid !== serviceUuid) return
      if (event.characteristicUuid !== characteristicUuid) return
      if (event.transactionId !== txId) return

      batcher.push(event)
    })
    this.monitorSubscriptions.set(txId, sub)

    // Tell native to start monitoring
    this.nativeModule.monitorCharacteristic(deviceId, serviceUuid, characteristicUuid, subscriptionType, txId)

    let removed = false
    return {
      remove: () => {
        if (removed) return
        removed = true

        // Dispose batcher
        batcher.dispose()
        this.monitorBatchers.delete(txId)

        // Remove JS listener
        sub.remove()
        this.monitorSubscriptions.delete(txId)

        // Cancel native transaction
        this.activeTransactionIds.delete(txId)
        this.nativeModule.cancelTransaction(txId).catch(() => {
          // Best-effort cancellation
        })
      }
    }
  }

  // -----------------------------------------------------------------------
  // MTU
  // -----------------------------------------------------------------------

  async requestMTUForDevice(deviceId: string, mtu: number, transactionId?: string | null): Promise<DeviceInfo> {
    return this.nativeModule.requestMtu(deviceId, mtu, transactionId ?? null)
  }

  async getMtu(deviceId: string): Promise<number> {
    return this.nativeModule.getMtu(deviceId)
  }

  // -----------------------------------------------------------------------
  // PHY
  // -----------------------------------------------------------------------

  async requestPhy(deviceId: string, txPhy: number, rxPhy: number): Promise<PhyInfo> {
    return this.nativeModule.requestPhy(deviceId, txPhy, rxPhy)
  }

  async readPhy(deviceId: string): Promise<PhyInfo> {
    return this.nativeModule.readPhy(deviceId)
  }

  // -----------------------------------------------------------------------
  // Bonding
  // -----------------------------------------------------------------------

  async getBondedDevices(): Promise<readonly DeviceInfo[]> {
    return this.nativeModule.getBondedDevices()
  }

  // -----------------------------------------------------------------------
  // Authorization
  // -----------------------------------------------------------------------

  async getAuthorizationStatus(): Promise<string> {
    return this.nativeModule.getAuthorizationStatus()
  }

  // -----------------------------------------------------------------------
  // L2CAP
  // -----------------------------------------------------------------------

  async openL2CAPChannel(deviceId: string, psm: number): Promise<L2CAPChannelEvent> {
    return this.nativeModule.openL2CAPChannel(deviceId, psm)
  }

  async writeL2CAPChannel(channelId: number, data: string): Promise<void> {
    return this.nativeModule.writeL2CAPChannel(channelId, data)
  }

  async closeL2CAPChannel(channelId: number): Promise<void> {
    return this.nativeModule.closeL2CAPChannel(channelId)
  }

  monitorL2CAPChannel(
    channelId: number,
    listener: (error: BleError | null, data: { channelId: number; data: string } | null) => void
  ): Subscription {
    let subscription: Subscription

    const dataSub = this.nativeModule.onL2CAPData(event => {
      if (event.channelId === channelId) {
        listener(null, { channelId: event.channelId, data: event.data })
      }
    })

    const closeSub = this.nativeModule.onL2CAPClose(event => {
      if (event.channelId === channelId) {
        if (event.error) {
          listener(
            new BleError({
              code: BleErrorCode.L2CAPChannelClosed,
              message: event.error,
              isRetryable: false,
              platform: Platform.OS === 'ios' ? 'ios' : 'android'
            }),
            null
          )
        } else {
          // Notify listener of clean close
          listener(null, null)
        }
        // Clean up native subscriptions
        dataSub.remove()
        closeSub.remove()
        // Remove from tracked subscriptions so destroyClient doesn't double-remove
        this.consumerSubscriptions.delete(subscription)
      }
    })

    subscription = {
      remove: () => {
        dataSub.remove()
        closeSub.remove()
        this.consumerSubscriptions.delete(subscription)
      }
    }

    this.consumerSubscriptions.add(subscription)
    return subscription
  }

  // -----------------------------------------------------------------------
  // Connection Priority
  // -----------------------------------------------------------------------

  async requestConnectionPriority(deviceId: string, priority: ConnectionPriority): Promise<DeviceInfo> {
    return this.nativeModule.requestConnectionPriority(deviceId, priority)
  }

  // -----------------------------------------------------------------------
  // Event subscriptions
  // -----------------------------------------------------------------------

  onRestoreState(callback: (event: RestoreStateEvent) => void): Subscription {
    const sub = this.nativeModule.onRestoreState(callback)

    const subscription: Subscription = {
      remove: () => {
        sub.remove()
        this.consumerSubscriptions.delete(subscription)
      }
    }

    this.consumerSubscriptions.add(subscription)
    return subscription
  }

  onBondStateChange(callback: (event: BondStateEvent) => void): Subscription {
    const sub = this.nativeModule.onBondStateChange(callback)

    const subscription: Subscription = {
      remove: () => {
        sub.remove()
        this.consumerSubscriptions.delete(subscription)
      }
    }

    this.consumerSubscriptions.add(subscription)
    return subscription
  }

  onConnectionEvent(callback: (event: ConnectionEvent) => void): Subscription {
    const sub = this.nativeModule.onConnectionEvent(callback)

    const subscription: Subscription = {
      remove: () => {
        sub.remove()
        this.consumerSubscriptions.delete(subscription)
      }
    }

    this.consumerSubscriptions.add(subscription)
    return subscription
  }

  // -----------------------------------------------------------------------
  // Cancellation
  // -----------------------------------------------------------------------

  async cancelTransaction(transactionId: string): Promise<void> {
    this.activeTransactionIds.delete(transactionId)
    await this.nativeModule.cancelTransaction(transactionId)
  }
}
