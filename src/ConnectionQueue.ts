import { Device } from './Device'
import { BleError, BleErrorCode, BleErrorCodeMessage } from './BleError'
import type { BleManager } from './BleManager'
import type { DeviceId, ConnectionOptions } from './TypeDefinition'

/**
 * Connection attempt state
 */
interface ConnectionAttempt {
  deviceId: DeviceId
  options?: ConnectionOptions
  resolve: (device: Device) => void
  reject: (error: BleError) => void
  retryCount: number
  maxRetries: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  timeoutId?: ReturnType<typeof setTimeout>
  cancelled: boolean
}

/**
 * Options for queuing a connection attempt
 */
export interface QueuedConnectionOptions {
  /**
   * Connection options to pass to the device
   */
  connectionOptions?: ConnectionOptions

  /**
   * Maximum number of retry attempts (default: 3)
   */
  maxRetries?: number

  /**
   * Initial delay before first retry in milliseconds (default: 1000)
   */
  initialDelayMs?: number

  /**
   * Maximum delay between retries in milliseconds (default: 30000)
   */
  maxDelayMs?: number

  /**
   * Multiplier for exponential backoff (default: 2)
   */
  backoffMultiplier?: number
}

/**
 * ConnectionQueue manages connection attempts with automatic retry logic
 * and queue management to prevent connection storms.
 *
 * Features:
 * - Queues connection attempts to prevent multiple simultaneous connections
 * - Exponential backoff retry logic
 * - Configurable retry limits and delays
 * - Ability to cancel pending/in-progress connections
 *
 * @example
 * const queue = new ConnectionQueue(bleManager);
 *
 * // Connect with retry logic
 * const device = await queue.connect('AA:BB:CC:DD:EE:FF', {
 *   maxRetries: 5,
 *   initialDelayMs: 1000,
 *   backoffMultiplier: 2
 * });
 *
 * // Cancel a pending connection
 * queue.cancel('AA:BB:CC:DD:EE:FF');
 */
export class ConnectionQueue {
  private _manager: BleManager
  private _queue: Map<DeviceId, ConnectionAttempt> = new Map()
  private _activeConnection: DeviceId | null = null
  private _isProcessing: boolean = false

  constructor(manager: BleManager) {
    this._manager = manager
  }

  /**
   * Queue a connection attempt with retry logic.
   *
   * @param deviceId Device identifier to connect to
   * @param options Connection and retry options
   * @returns Promise resolving to connected Device
   */
  connect(deviceId: DeviceId, options?: QueuedConnectionOptions): Promise<Device> {
    return new Promise((resolve, reject) => {
      // Check if there's already a pending connection for this device
      const existing = this._queue.get(deviceId)
      if (existing && !existing.cancelled) {
        reject(
          new BleError(
            {
              errorCode: BleErrorCode.OperationCancelled,
              attErrorCode: null,
              iosErrorCode: null,
              androidErrorCode: null,
              reason: `Connection already pending for device ${deviceId}`
            },
            BleErrorCodeMessage
          )
        )
        return
      }

      const attempt: ConnectionAttempt = {
        deviceId,
        options: options?.connectionOptions,
        resolve,
        reject,
        retryCount: 0,
        maxRetries: options?.maxRetries ?? 3,
        initialDelayMs: options?.initialDelayMs ?? 1000,
        maxDelayMs: options?.maxDelayMs ?? 30000,
        backoffMultiplier: options?.backoffMultiplier ?? 2,
        cancelled: false
      }

      this._queue.set(deviceId, attempt)
      this._processQueue()
    })
  }

  /**
   * Cancel a pending or in-progress connection attempt.
   *
   * @param deviceId Device identifier to cancel connection for
   * @returns True if a connection was cancelled
   */
  cancel(deviceId: DeviceId): boolean {
    const attempt = this._queue.get(deviceId)
    if (!attempt) {
      return false
    }

    attempt.cancelled = true

    if (attempt.timeoutId) {
      clearTimeout(attempt.timeoutId)
    }

    this._queue.delete(deviceId)

    attempt.reject(
      new BleError(
        {
          errorCode: BleErrorCode.OperationCancelled,
          attErrorCode: null,
          iosErrorCode: null,
          androidErrorCode: null,
          reason: `Connection cancelled for device ${deviceId}`
        },
        BleErrorCodeMessage
      )
    )

    // If this was the active connection, try to disconnect and process next
    if (this._activeConnection === deviceId) {
      this._activeConnection = null
      this._manager.cancelDeviceConnection(deviceId).catch(() => {
        // Ignore errors when cancelling
      })
      this._processQueue()
    }

    return true
  }

  /**
   * Cancel all pending connections.
   */
  cancelAll(): void {
    const deviceIds = Array.from(this._queue.keys())
    for (const deviceId of deviceIds) {
      this.cancel(deviceId)
    }
  }

  /**
   * Get the number of pending connections in the queue.
   */
  get pendingCount(): number {
    return this._queue.size
  }

  /**
   * Check if a device has a pending connection.
   */
  isPending(deviceId: DeviceId): boolean {
    const attempt = this._queue.get(deviceId)
    return attempt != null && !attempt.cancelled
  }

  /**
   * Process the connection queue
   */
  private async _processQueue(): Promise<void> {
    if (this._isProcessing || this._activeConnection != null) {
      return
    }

    // Find next non-cancelled attempt
    let nextAttempt: ConnectionAttempt | undefined
    for (const attempt of this._queue.values()) {
      if (!attempt.cancelled) {
        nextAttempt = attempt
        break
      }
    }

    if (!nextAttempt) {
      return
    }

    this._isProcessing = true
    this._activeConnection = nextAttempt.deviceId

    await this._attemptConnection(nextAttempt)

    this._isProcessing = false
  }

  /**
   * Attempt to connect to a device with retry logic
   */
  private async _attemptConnection(attempt: ConnectionAttempt): Promise<void> {
    if (attempt.cancelled) {
      this._activeConnection = null
      this._queue.delete(attempt.deviceId)
      this._processQueue()
      return
    }

    try {
      const device = await this._manager.connectToDevice(attempt.deviceId, attempt.options)

      if (attempt.cancelled) {
        // Connection succeeded but was cancelled, disconnect
        await this._manager.cancelDeviceConnection(attempt.deviceId).catch(() => {})
        this._activeConnection = null
        this._queue.delete(attempt.deviceId)
        this._processQueue()
        return
      }

      // Success!
      this._activeConnection = null
      this._queue.delete(attempt.deviceId)
      attempt.resolve(device)
      this._processQueue()
    } catch (error) {
      if (attempt.cancelled) {
        this._activeConnection = null
        this._queue.delete(attempt.deviceId)
        this._processQueue()
        return
      }

      attempt.retryCount++

      if (attempt.retryCount >= attempt.maxRetries) {
        // Max retries exceeded
        this._activeConnection = null
        this._queue.delete(attempt.deviceId)
        attempt.reject(error as BleError)
        this._processQueue()
        return
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        attempt.initialDelayMs * Math.pow(attempt.backoffMultiplier, attempt.retryCount - 1),
        attempt.maxDelayMs
      )

      // Schedule retry
      attempt.timeoutId = setTimeout(() => {
        if (!attempt.cancelled) {
          this._attemptConnection(attempt)
        }
      }, delay)
    }
  }

  /**
   * Destroy the queue and cancel all pending connections.
   */
  destroy(): void {
    this.cancelAll()
    this._queue.clear()
  }
}
