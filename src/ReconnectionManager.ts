import { Device } from './Device'
import { BleError } from './BleError'
import type { BleManager } from './BleManager'
import type { DeviceId, ConnectionOptions, Subscription, ReconnectionOptions } from './TypeDefinition'

/**
 * Reconnection state for a device
 */
interface ReconnectionState {
  deviceId: DeviceId
  options: ReconnectionOptions
  isReconnecting: boolean
  retryCount: number
  timeoutId?: ReturnType<typeof setTimeout>
  disconnectSubscription?: Subscription
  onReconnect?: (device: Device) => void
  onReconnectFailed?: (deviceId: DeviceId, error: BleError) => void
}

/**
 * Event callbacks for reconnection events
 */
export interface ReconnectionCallbacks {
  /**
   * Called when a device successfully reconnects
   */
  onReconnect?: (device: Device) => void

  /**
   * Called when reconnection fails after all retries
   */
  onReconnectFailed?: (deviceId: DeviceId, error: BleError) => void

  /**
   * Called when a reconnection attempt starts
   */
  onReconnecting?: (deviceId: DeviceId, attempt: number, maxAttempts: number) => void
}

/**
 * ReconnectionManager automatically handles reconnection when devices disconnect unexpectedly.
 *
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Configurable retry limits and delays
 * - Event callbacks for monitoring reconnection status
 * - Per-device configuration
 *
 * @example
 * const reconnectionManager = new ReconnectionManager(bleManager);
 *
 * // Enable auto-reconnect for a device
 * reconnectionManager.enableAutoReconnect('AA:BB:CC:DD:EE:FF', {
 *   maxRetries: 10,
 *   initialDelayMs: 1000,
 *   maxDelayMs: 60000,
 *   backoffMultiplier: 1.5
 * }, {
 *   onReconnect: (device) => console.log('Reconnected!', device.id),
 *   onReconnectFailed: (deviceId, error) => console.log('Failed to reconnect', deviceId)
 * });
 *
 * // Disable auto-reconnect
 * reconnectionManager.disableAutoReconnect('AA:BB:CC:DD:EE:FF');
 */
export class ReconnectionManager {
  private _manager: BleManager
  private _devices: Map<DeviceId, ReconnectionState> = new Map()
  private _globalCallbacks: ReconnectionCallbacks = {}

  constructor(manager: BleManager) {
    this._manager = manager
  }

  /**
   * Set global callbacks for all reconnection events.
   *
   * @param callbacks Callback functions for reconnection events
   */
  setGlobalCallbacks(callbacks: ReconnectionCallbacks): void {
    this._globalCallbacks = callbacks
  }

  /**
   * Enable automatic reconnection for a device.
   *
   * @param deviceId Device identifier
   * @param options Reconnection options (retries, delays, etc.)
   * @param callbacks Optional callbacks for this specific device
   */
  enableAutoReconnect(
    deviceId: DeviceId,
    options?: ReconnectionOptions,
    callbacks?: ReconnectionCallbacks
  ): void {
    // If already enabled, disable first
    if (this._devices.has(deviceId)) {
      this.disableAutoReconnect(deviceId)
    }

    const reconnectionOptions: ReconnectionOptions = {
      maxRetries: options?.maxRetries ?? 5,
      initialDelayMs: options?.initialDelayMs ?? 1000,
      maxDelayMs: options?.maxDelayMs ?? 30000,
      backoffMultiplier: options?.backoffMultiplier ?? 2,
      connectionOptions: options?.connectionOptions
    }

    const state: ReconnectionState = {
      deviceId,
      options: reconnectionOptions,
      isReconnecting: false,
      retryCount: 0,
      onReconnect: callbacks?.onReconnect,
      onReconnectFailed: callbacks?.onReconnectFailed
    }

    // Subscribe to disconnection events for this device
    state.disconnectSubscription = this._manager.onDeviceDisconnected(deviceId, (error, device) => {
      // Only auto-reconnect on unexpected disconnections (error is not null)
      // If error is null, it was an intentional disconnect via cancelDeviceConnection
      if (error) {
        this._startReconnection(deviceId)
      }
    })

    this._devices.set(deviceId, state)
  }

  /**
   * Disable automatic reconnection for a device.
   *
   * @param deviceId Device identifier
   * @returns True if auto-reconnect was disabled, false if it wasn't enabled
   */
  disableAutoReconnect(deviceId: DeviceId): boolean {
    const state = this._devices.get(deviceId)
    if (!state) {
      return false
    }

    // Clear any pending reconnection attempt
    if (state.timeoutId) {
      clearTimeout(state.timeoutId)
    }

    // Remove disconnect subscription
    if (state.disconnectSubscription) {
      state.disconnectSubscription.remove()
    }

    this._devices.delete(deviceId)
    return true
  }

  /**
   * Disable auto-reconnect for all devices.
   */
  disableAll(): void {
    const deviceIds = Array.from(this._devices.keys())
    for (const deviceId of deviceIds) {
      this.disableAutoReconnect(deviceId)
    }
  }

  /**
   * Check if auto-reconnect is enabled for a device.
   *
   * @param deviceId Device identifier
   * @returns True if auto-reconnect is enabled
   */
  isEnabled(deviceId: DeviceId): boolean {
    return this._devices.has(deviceId)
  }

  /**
   * Check if a device is currently reconnecting.
   *
   * @param deviceId Device identifier
   * @returns True if reconnection is in progress
   */
  isReconnecting(deviceId: DeviceId): boolean {
    const state = this._devices.get(deviceId)
    return state?.isReconnecting ?? false
  }

  /**
   * Get the current retry count for a device.
   *
   * @param deviceId Device identifier
   * @returns Current retry count, or -1 if auto-reconnect is not enabled
   */
  getRetryCount(deviceId: DeviceId): number {
    const state = this._devices.get(deviceId)
    return state?.retryCount ?? -1
  }

  /**
   * Manually trigger a reconnection attempt.
   * Useful if you want to retry after all automatic retries have been exhausted.
   *
   * @param deviceId Device identifier
   * @returns Promise resolving to connected Device
   */
  async manualReconnect(deviceId: DeviceId): Promise<Device> {
    const state = this._devices.get(deviceId)
    if (!state) {
      throw new Error(`Auto-reconnect not enabled for device ${deviceId}`)
    }

    // Reset retry count for manual reconnect
    state.retryCount = 0
    return this._attemptReconnection(deviceId)
  }

  /**
   * Start the reconnection process for a device
   */
  private _startReconnection(deviceId: DeviceId): void {
    const state = this._devices.get(deviceId)
    if (!state || state.isReconnecting) {
      return
    }

    state.isReconnecting = true
    state.retryCount = 0
    this._scheduleReconnection(deviceId, 0)
  }

  /**
   * Schedule a reconnection attempt with delay
   */
  private _scheduleReconnection(deviceId: DeviceId, delay: number): void {
    const state = this._devices.get(deviceId)
    if (!state) {
      return
    }

    state.timeoutId = setTimeout(async () => {
      try {
        await this._attemptReconnection(deviceId)
      } catch (error) {
        // Error handling is done in _attemptReconnection
      }
    }, delay)
  }

  /**
   * Attempt to reconnect to a device
   */
  private async _attemptReconnection(deviceId: DeviceId): Promise<Device> {
    const state = this._devices.get(deviceId)
    if (!state) {
      throw new Error(`Auto-reconnect not enabled for device ${deviceId}`)
    }

    state.retryCount++
    const maxRetries = state.options.maxRetries ?? 5

    // Notify about reconnection attempt
    this._globalCallbacks.onReconnecting?.(deviceId, state.retryCount, maxRetries)

    try {
      const device = await this._manager.connectToDevice(deviceId, state.options.connectionOptions)

      // Success!
      state.isReconnecting = false
      state.retryCount = 0

      // Notify callbacks
      state.onReconnect?.(device)
      this._globalCallbacks.onReconnect?.(device)

      return device
    } catch (error) {
      if (state.retryCount >= maxRetries) {
        // Max retries exceeded
        state.isReconnecting = false
        const bleError = error as BleError

        // Notify callbacks
        state.onReconnectFailed?.(deviceId, bleError)
        this._globalCallbacks.onReconnectFailed?.(deviceId, bleError)

        throw bleError
      }

      // Calculate delay with exponential backoff
      const initialDelay = state.options.initialDelayMs ?? 1000
      const maxDelay = state.options.maxDelayMs ?? 30000
      const multiplier = state.options.backoffMultiplier ?? 2

      const delay = Math.min(initialDelay * Math.pow(multiplier, state.retryCount - 1), maxDelay)

      // Schedule next attempt
      this._scheduleReconnection(deviceId, delay)

      throw error
    }
  }

  /**
   * Destroy the manager and disable all auto-reconnect.
   */
  destroy(): void {
    this.disableAll()
    this._globalCallbacks = {}
  }
}
