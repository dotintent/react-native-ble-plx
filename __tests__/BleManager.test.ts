// __tests__/BleManager.test.ts

// ---------------------------------------------------------------------------
// Type imports for mock handler signatures
// ---------------------------------------------------------------------------
import type {
  ScanResult,
  ConnectionStateEvent,
  CharacteristicValueEvent,
  RestoreStateEvent,
  BondStateEvent,
  ConnectionEvent
} from '../src/BleManager'

// ---------------------------------------------------------------------------
// Native event payload types used only by L2CAP handlers
// ---------------------------------------------------------------------------
interface L2CAPDataEvent {
  readonly channelId: number
  readonly data: string
}

interface L2CAPCloseEvent {
  readonly channelId: number
  readonly error: string | null
}

interface StateChangeEvent {
  readonly state: string
}

// ---------------------------------------------------------------------------
// Mock setup — must happen before any imports that pull in react-native
// ---------------------------------------------------------------------------

let scanResultHandlers: Array<(result: ScanResult) => void> = []
let connectionStateHandlers: Array<(event: ConnectionStateEvent) => void> = []
let charValueHandlers: Array<(event: CharacteristicValueEvent) => void> = []
let stateChangeHandler: ((event: StateChangeEvent) => void) | null = null
let restoreStateHandler: ((event: RestoreStateEvent) => void) | null = null
let bondStateChangeHandler: ((event: BondStateEvent) => void) | null = null
let connectionEventHandler: ((event: ConnectionEvent) => void) | null = null
let l2capDataHandler: ((event: L2CAPDataEvent) => void) | null = null
let l2capCloseHandler: ((event: L2CAPCloseEvent) => void) | null = null

// Convenience aliases for single-handler tests
const getScanResultHandler = () => scanResultHandlers[scanResultHandlers.length - 1] ?? null
const getConnectionStateHandler = (index = 0) => connectionStateHandlers[index] ?? null

const mockNativeModule = {
  createClient: jest.fn().mockResolvedValue(undefined),
  destroyClient: jest.fn().mockResolvedValue(undefined),
  state: jest.fn().mockResolvedValue('PoweredOn'),
  startDeviceScan: jest.fn(),
  stopDeviceScan: jest.fn().mockResolvedValue(undefined),
  connectToDevice: jest.fn().mockResolvedValue({
    id: 'AA:BB',
    name: 'Test',
    rssi: -50,
    mtu: 23,
    isConnectable: true,
    serviceUuids: [],
    manufacturerData: null
  }),
  cancelDeviceConnection: jest.fn().mockResolvedValue({
    id: 'AA:BB',
    name: 'Test',
    rssi: -50,
    mtu: 23,
    isConnectable: true,
    serviceUuids: [],
    manufacturerData: null
  }),
  isDeviceConnected: jest.fn().mockResolvedValue(true),
  discoverAllServicesAndCharacteristics: jest.fn().mockResolvedValue({
    id: 'AA:BB',
    name: 'Test',
    rssi: -50,
    mtu: 23,
    isConnectable: true,
    serviceUuids: [],
    manufacturerData: null
  }),
  readCharacteristic: jest.fn().mockResolvedValue({
    deviceId: 'AA:BB',
    serviceUuid: 'svc',
    uuid: 'char',
    value: 'AQID',
    isNotifying: false,
    isIndicatable: false,
    isReadable: true,
    isWritableWithResponse: true,
    isWritableWithoutResponse: false
  }),
  writeCharacteristic: jest.fn().mockResolvedValue({
    deviceId: 'AA:BB',
    serviceUuid: 'svc',
    uuid: 'char',
    value: 'AQID',
    isNotifying: false,
    isIndicatable: false,
    isReadable: true,
    isWritableWithResponse: true,
    isWritableWithoutResponse: false
  }),
  monitorCharacteristic: jest.fn(),
  requestMtu: jest.fn().mockResolvedValue({
    id: 'AA:BB',
    name: 'Test',
    rssi: -50,
    mtu: 517,
    isConnectable: true,
    serviceUuids: [],
    manufacturerData: null
  }),
  requestConnectionPriority: jest.fn().mockResolvedValue({
    id: 'AA:BB',
    name: 'Test',
    rssi: -50,
    mtu: 23,
    isConnectable: true,
    serviceUuids: [],
    manufacturerData: null
  }),
  cancelTransaction: jest.fn().mockResolvedValue(undefined),
  getMtu: jest.fn().mockResolvedValue(23),
  requestPhy: jest.fn().mockResolvedValue({ deviceId: 'AA:BB', txPhy: 2, rxPhy: 2 }),
  readPhy: jest.fn().mockResolvedValue({ deviceId: 'AA:BB', txPhy: 1, rxPhy: 1 }),
  getBondedDevices: jest.fn().mockResolvedValue([]),
  getAuthorizationStatus: jest.fn().mockResolvedValue('granted'),
  openL2CAPChannel: jest.fn().mockResolvedValue({ channelId: 1, deviceId: 'AA:BB', psm: 128 }),
  writeL2CAPChannel: jest.fn().mockResolvedValue(undefined),
  closeL2CAPChannel: jest.fn().mockResolvedValue(undefined),
  onScanResult: jest.fn(handler => {
    scanResultHandlers.push(handler)
    return {
      remove: jest.fn(() => {
        scanResultHandlers = scanResultHandlers.filter(h => h !== handler)
      })
    }
  }),
  onConnectionStateChange: jest.fn(handler => {
    connectionStateHandlers.push(handler)
    return {
      remove: jest.fn(() => {
        connectionStateHandlers = connectionStateHandlers.filter(h => h !== handler)
      })
    }
  }),
  onCharacteristicValueUpdate: jest.fn(handler => {
    charValueHandlers.push(handler)
    return {
      remove: jest.fn(() => {
        charValueHandlers = charValueHandlers.filter(h => h !== handler)
      })
    }
  }),
  onStateChange: jest.fn(handler => {
    stateChangeHandler = handler
    return {
      remove: jest.fn(() => {
        stateChangeHandler = null
      })
    }
  }),
  onError: jest.fn(() => ({
    remove: jest.fn()
  })),
  onRestoreState: jest.fn(handler => {
    restoreStateHandler = handler
    return {
      remove: jest.fn(() => {
        restoreStateHandler = null
      })
    }
  }),
  onBondStateChange: jest.fn(handler => {
    bondStateChangeHandler = handler
    return {
      remove: jest.fn(() => {
        bondStateChangeHandler = null
      })
    }
  }),
  onConnectionEvent: jest.fn(handler => {
    connectionEventHandler = handler
    return {
      remove: jest.fn(() => {
        connectionEventHandler = null
      })
    }
  }),
  onL2CAPData: jest.fn(handler => {
    l2capDataHandler = handler
    return {
      remove: jest.fn(() => {
        l2capDataHandler = null
      })
    }
  }),
  onL2CAPClose: jest.fn(handler => {
    l2capCloseHandler = handler
    return {
      remove: jest.fn(() => {
        l2capCloseHandler = null
      })
    }
  })
}

jest.mock('react-native', () => ({
  TurboModuleRegistry: {
    get: jest.fn(() => mockNativeModule)
  },
  Platform: {
    OS: 'ios'
  }
}))

// ---------------------------------------------------------------------------
// Imports (after mock setup — jest.mock must be hoisted before module imports)
// ---------------------------------------------------------------------------

// eslint-disable-next-line import/first
import { BleManager } from '../src/BleManager'
// eslint-disable-next-line import/first
import { BleError } from '../src/BleError'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeScanResult(id = 'AA:BB') {
  return { id, name: 'Device', rssi: -60, serviceUuids: [], manufacturerData: null }
}

function makeCharEvent(txId: string, deviceId = 'AA:BB', svc = 'svc', char = 'char') {
  return { deviceId, serviceUuid: svc, characteristicUuid: char, value: 'AQID', transactionId: txId }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BleManager', () => {
  let manager: BleManager

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset captured handlers
    scanResultHandlers = []
    connectionStateHandlers = []
    charValueHandlers = []
    stateChangeHandler = null
    restoreStateHandler = null
    bondStateChangeHandler = null
    connectionEventHandler = null

    // Use scanBatchIntervalMs: 0 for immediate delivery in tests
    manager = new BleManager({ scanBatchIntervalMs: 0 })
  })

  afterEach(async () => {
    // Best-effort cleanup to avoid timer leaks
    await manager.destroyClient().catch(() => {})
  })

  // -------------------------------------------------------------------------

  test('startDeviceScan calls native and routes scan results immediately with batchInterval 0', async () => {
    const received: ScanResult[] = []
    manager.startDeviceScan(null, null, (_err, device) => {
      if (device) received.push(device)
    })

    expect(mockNativeModule.startDeviceScan).toHaveBeenCalledWith(null, {})
    expect(mockNativeModule.onScanResult).toHaveBeenCalled()
    expect(getScanResultHandler()).not.toBeNull()

    // Simulate native scan results arriving — immediate delivery (batchInterval: 0)
    getScanResultHandler()!(makeScanResult('AA:BB'))
    getScanResultHandler()!(makeScanResult('CC:DD'))

    expect(received).toHaveLength(2)
    expect(received[0].id).toBe('AA:BB')
    expect(received[1].id).toBe('CC:DD')
  })

  // -------------------------------------------------------------------------

  test('stopDeviceScan cleans up batcher and subscription', async () => {
    const received: ScanResult[] = []
    manager.startDeviceScan(null, null, (_err, device) => {
      if (device) received.push(device)
    })

    const subscriptionRemoveSpy = jest.spyOn(mockNativeModule.onScanResult.mock.results[0].value, 'remove')

    await manager.stopDeviceScan()

    expect(mockNativeModule.stopDeviceScan).toHaveBeenCalled()
    expect(subscriptionRemoveSpy).toHaveBeenCalled()

    // After stop, scan handler is removed — scanResultHandlers should be empty
    expect(scanResultHandlers).toHaveLength(0)
    expect(received).toHaveLength(0)
  })

  // -------------------------------------------------------------------------

  test('dispose discards buffered events instead of flushing', async () => {
    // Use a batched manager (non-zero interval) to test discard behavior
    const batchedManager = new BleManager({ scanBatchIntervalMs: 5000 })
    const received: ScanResult[] = []
    batchedManager.startDeviceScan(null, null, (_err, device) => {
      if (device) received.push(device)
    })

    // Push events — they get buffered because interval is 5000ms
    getScanResultHandler()!(makeScanResult('AA:BB'))
    getScanResultHandler()!(makeScanResult('CC:DD'))

    // Stop scan — dispose should discard, not flush
    await batchedManager.stopDeviceScan()

    // Events should have been discarded
    expect(received).toHaveLength(0)

    await batchedManager.destroyClient().catch(() => {})
  })

  // -------------------------------------------------------------------------

  test('monitorCharacteristicForDevice routes filtered events', async () => {
    await manager.createClient()

    const received: CharacteristicValueEvent[] = []
    const sub = manager.monitorCharacteristicForDevice('AA:BB', 'svc', 'char', (_err, event) => {
      if (event) received.push(event)
    })

    expect(mockNativeModule.monitorCharacteristic).toHaveBeenCalled()
    expect(mockNativeModule.onCharacteristicValueUpdate).toHaveBeenCalled()

    const txId = (
      mockNativeModule.monitorCharacteristic.mock.calls[0] as [string, string, string, string | null, string | null]
    )[4]
    expect(txId).toMatch(/^__ble_tx_\d+$/)

    const charValueHandler = charValueHandlers[charValueHandlers.length - 1]!

    // Matching event — should be routed
    charValueHandler(makeCharEvent(txId, 'AA:BB', 'svc', 'char'))

    // Non-matching events — different device, service, char, or txId
    charValueHandler(makeCharEvent(txId, 'XX:XX', 'svc', 'char'))
    charValueHandler(makeCharEvent(txId, 'AA:BB', 'other-svc', 'char'))
    charValueHandler(makeCharEvent(txId, 'AA:BB', 'svc', 'other-char'))
    charValueHandler(makeCharEvent('wrong-tx', 'AA:BB', 'svc', 'char'))

    expect(received).toHaveLength(1)
    expect(received[0].deviceId).toBe('AA:BB')

    sub.remove()
  })

  // -------------------------------------------------------------------------

  test('monitor subscription.remove() cancels native transaction AND removes JS listener', async () => {
    await manager.createClient()

    const sub = manager.monitorCharacteristicForDevice('AA:BB', 'svc', 'char', jest.fn())

    const txId = (
      mockNativeModule.monitorCharacteristic.mock.calls[0] as [string, string, string, string | null, string | null]
    )[4]

    sub.remove()

    expect(mockNativeModule.cancelTransaction).toHaveBeenCalledWith(txId)

    // JS listener should be removed
    const countAfter = mockNativeModule.cancelTransaction.mock.calls.length
    expect(countAfter).toBeGreaterThanOrEqual(1)

    // Calling remove() again should be idempotent
    sub.remove()
    expect(mockNativeModule.cancelTransaction).toHaveBeenCalledTimes(countAfter)
  })

  // -------------------------------------------------------------------------

  test('duplicate transactionId cleans up existing monitor', async () => {
    await manager.createClient()

    const listener1 = jest.fn()
    const listener2 = jest.fn()

    manager.monitorCharacteristicForDevice('AA:BB', 'svc', 'char', listener1, {
      transactionId: 'dup-tx'
    })

    // The first subscription should have its listener registered
    const firstSubRemove = mockNativeModule.onCharacteristicValueUpdate.mock.results[0].value.remove

    // Create another monitor with the same txId — should clean up the first
    manager.monitorCharacteristicForDevice('AA:BB', 'svc', 'char', listener2, {
      transactionId: 'dup-tx'
    })

    // The first batcher should have been disposed and first sub removed
    expect(firstSubRemove).toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------

  test('onDeviceDisconnected filters by deviceId', () => {
    const callbackA = jest.fn()
    const callbackB = jest.fn()

    manager.onDeviceDisconnected('AA:BB', callbackA)
    manager.onDeviceDisconnected('CC:DD', callbackB)

    // Two separate native listeners are registered (one per subscription)
    expect(connectionStateHandlers).toHaveLength(2)

    const disconnectEvent = {
      deviceId: 'AA:BB',
      state: 'disconnected',
      errorCode: null,
      errorMessage: null
    }

    // Fire the event through all registered handlers (simulating native broadcast)
    connectionStateHandlers.forEach(h => h(disconnectEvent))

    // Only callbackA should fire — it matches 'AA:BB'; callbackB is for 'CC:DD'
    expect(callbackA).toHaveBeenCalledTimes(1)
    expect(callbackA).toHaveBeenCalledWith(null, expect.objectContaining({ deviceId: 'AA:BB' }))
    expect(callbackB).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------

  test('error events become BleError instances in disconnect callback with correct platform', () => {
    const callback = jest.fn()
    manager.onDeviceDisconnected('AA:BB', callback)

    const handler = getConnectionStateHandler(0)!
    handler({
      deviceId: 'AA:BB',
      state: 'disconnected',
      errorCode: 2,
      errorMessage: 'Connection failed'
    })

    expect(callback).toHaveBeenCalledTimes(1)
    const [err, device] = callback.mock.calls[0] as [BleError | null, ConnectionStateEvent | null]
    expect(err).toBeInstanceOf(BleError)
    expect(err!.code).toBe(2)
    expect(err!.message).toBe('Connection failed')
    // Platform should come from Platform.OS, not hardcoded
    expect(err!.platform).toBe('ios')
    expect(device).not.toBeNull()
  })

  // -------------------------------------------------------------------------

  test('onDeviceDisconnected ignores non-disconnected state events', () => {
    const callback = jest.fn()
    manager.onDeviceDisconnected('AA:BB', callback)

    const handler = getConnectionStateHandler(0)!
    handler({ deviceId: 'AA:BB', state: 'connected', errorCode: null, errorMessage: null })
    handler({ deviceId: 'AA:BB', state: 'connecting', errorCode: null, errorMessage: null })

    expect(callback).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------

  test('onStateChange emits current state when emitCurrentState is true', async () => {
    const callback = jest.fn()
    const sub = manager.onStateChange(callback, true)

    // stateChangeHandler should be registered
    expect(mockNativeModule.onStateChange).toHaveBeenCalled()

    // The initial state() call is async — wait for microtask queue
    await Promise.resolve()

    expect(mockNativeModule.state).toHaveBeenCalled()
    expect(callback).toHaveBeenCalledWith('PoweredOn')

    // Also responds to state change events
    stateChangeHandler!({ state: 'PoweredOff' })
    expect(callback).toHaveBeenCalledWith('PoweredOff')

    sub.remove()
  })

  // -------------------------------------------------------------------------

  test('onStateChange does NOT fetch current state when emitCurrentState is false', () => {
    const callback = jest.fn()
    manager.onStateChange(callback, false)

    expect(mockNativeModule.state).not.toHaveBeenCalled()
    expect(callback).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------

  test('onStateChange callback does not fire after remove()', async () => {
    const callback = jest.fn()
    const sub = manager.onStateChange(callback, true)

    // Remove immediately before the async state read resolves
    sub.remove()

    // Wait for the async state() to resolve
    await Promise.resolve()
    await Promise.resolve()

    // callback should NOT have been called — the removed guard prevents it
    expect(callback).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------

  test('transactionId auto-generation uses __ble_tx_N pattern', async () => {
    await manager.createClient()

    manager.monitorCharacteristicForDevice('AA:BB', 'svc', 'char1', jest.fn())
    manager.monitorCharacteristicForDevice('AA:BB', 'svc', 'char2', jest.fn())

    const calls = mockNativeModule.monitorCharacteristic.mock.calls as [
      string,
      string,
      string,
      string | null,
      string | null
    ][]
    const txId1 = calls[0][4] as string
    const txId2 = calls[1][4] as string

    expect(txId1).toMatch(/^__ble_tx_\d+$/)
    expect(txId2).toMatch(/^__ble_tx_\d+$/)
    expect(txId1).not.toBe(txId2)

    const n1 = parseInt(txId1.replace('__ble_tx_', ''), 10)
    const n2 = parseInt(txId2.replace('__ble_tx_', ''), 10)
    expect(n2).toBe(n1 + 1)
  })

  // -------------------------------------------------------------------------

  test('connectToDevice passes options to native', async () => {
    const options = { autoConnect: false, timeout: 5000, requestMtu: 512 }
    const result = await manager.connectToDevice('AA:BB', options)

    expect(mockNativeModule.connectToDevice).toHaveBeenCalledWith('AA:BB', options)
    expect(result.id).toBe('AA:BB')
  })

  // -------------------------------------------------------------------------

  test('destroyClient cleans up all subscriptions and cancels active transactions', async () => {
    await manager.createClient()

    // Start two monitors so we have active transactions
    const sub1 = manager.monitorCharacteristicForDevice('AA:BB', 'svc', 'char1', jest.fn())
    const sub2 = manager.monitorCharacteristicForDevice('AA:BB', 'svc', 'char2', jest.fn())

    const txId1 = (
      mockNativeModule.monitorCharacteristic.mock.calls[0] as [string, string, string, string | null, string | null]
    )[4]
    const txId2 = (
      mockNativeModule.monitorCharacteristic.mock.calls[1] as [string, string, string, string | null, string | null]
    )[4]

    // Also start a scan
    manager.startDeviceScan(null, null, jest.fn())

    await manager.destroyClient()

    expect(mockNativeModule.cancelTransaction).toHaveBeenCalledWith(txId1)
    expect(mockNativeModule.cancelTransaction).toHaveBeenCalledWith(txId2)
    expect(mockNativeModule.destroyClient).toHaveBeenCalled()

    // Scan subscription should have been removed
    expect(scanResultHandlers).toHaveLength(0)

    // Attempting to call sub1/sub2.remove() after destroy should not throw
    expect(() => sub1.remove()).not.toThrow()
    expect(() => sub2.remove()).not.toThrow()
  })

  // -------------------------------------------------------------------------

  test('destroyClient cleans up consumer subscriptions', async () => {
    await manager.createClient()

    const stateCallback = jest.fn()
    const disconnectCallback = jest.fn()

    manager.onStateChange(stateCallback)
    manager.onDeviceDisconnected('AA:BB', disconnectCallback)

    const stateSubRemove = mockNativeModule.onStateChange.mock.results[0].value.remove
    const connSubRemove = mockNativeModule.onConnectionStateChange.mock.results[0].value.remove

    await manager.destroyClient()

    // After destroy, consumer subscriptions should have been removed
    expect(stateSubRemove).toHaveBeenCalled()
    expect(connSubRemove).toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------

  test('createClient called twice does not leak error subscription', async () => {
    await manager.createClient()

    const firstErrorSub = mockNativeModule.onError.mock.results[0].value
    const firstRemoveSpy = jest.spyOn(firstErrorSub, 'remove')

    await manager.createClient()

    // The first error subscription should have been removed
    expect(firstRemoveSpy).toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------

  test('monitorCharacteristicForDevice passes subscriptionType to native', async () => {
    await manager.createClient()

    manager.monitorCharacteristicForDevice('AA:BB', 'svc', 'char', jest.fn(), {
      subscriptionType: 'indicate'
    })

    const call = mockNativeModule.monitorCharacteristic.mock.calls[0] as [
      string,
      string,
      string,
      string | null,
      string | null
    ]
    expect(call[3]).toBe('indicate')
  })

  // -------------------------------------------------------------------------

  test('constructor accepts scanBatchIntervalMs option', () => {
    const customManager = new BleManager({ scanBatchIntervalMs: 500 })
    // Just verify it constructs without error
    expect(customManager).toBeInstanceOf(BleManager)
  })

  // -------------------------------------------------------------------------

  test('getMtu delegates to native', async () => {
    const mtu = await manager.getMtu('AA:BB')
    expect(mockNativeModule.getMtu).toHaveBeenCalledWith('AA:BB')
    expect(mtu).toBe(23)
  })

  // -------------------------------------------------------------------------

  test('requestPhy delegates to native', async () => {
    const result = await manager.requestPhy('AA:BB', 2, 2)
    expect(mockNativeModule.requestPhy).toHaveBeenCalledWith('AA:BB', 2, 2)
    expect(result.txPhy).toBe(2)
  })

  // -------------------------------------------------------------------------

  test('readPhy delegates to native', async () => {
    const result = await manager.readPhy('AA:BB')
    expect(mockNativeModule.readPhy).toHaveBeenCalledWith('AA:BB')
    expect(result.txPhy).toBe(1)
  })

  // -------------------------------------------------------------------------

  test('getBondedDevices delegates to native', async () => {
    const devices = await manager.getBondedDevices()
    expect(mockNativeModule.getBondedDevices).toHaveBeenCalled()
    expect(devices).toEqual([])
  })

  // -------------------------------------------------------------------------

  test('getAuthorizationStatus delegates to native', async () => {
    const status = await manager.getAuthorizationStatus()
    expect(mockNativeModule.getAuthorizationStatus).toHaveBeenCalled()
    expect(status).toBe('granted')
  })

  // -------------------------------------------------------------------------

  test('L2CAP channel methods delegate to native', async () => {
    const channel = await manager.openL2CAPChannel('AA:BB', 128)
    expect(mockNativeModule.openL2CAPChannel).toHaveBeenCalledWith('AA:BB', 128)
    expect(channel.channelId).toBe(1)

    await manager.writeL2CAPChannel(1, 'AQID')
    expect(mockNativeModule.writeL2CAPChannel).toHaveBeenCalledWith(1, 'AQID')

    await manager.closeL2CAPChannel(1)
    expect(mockNativeModule.closeL2CAPChannel).toHaveBeenCalledWith(1)
  })

  // -------------------------------------------------------------------------

  test('onRestoreState subscribes to native event and tracks subscription', () => {
    const callback = jest.fn()
    const sub = manager.onRestoreState(callback)

    expect(mockNativeModule.onRestoreState).toHaveBeenCalled()

    restoreStateHandler!({ devices: [] })
    expect(callback).toHaveBeenCalledWith({ devices: [] })

    sub.remove()
  })

  // -------------------------------------------------------------------------

  test('onBondStateChange subscribes to native event and tracks subscription', () => {
    const callback = jest.fn()
    const sub = manager.onBondStateChange(callback)

    expect(mockNativeModule.onBondStateChange).toHaveBeenCalled()

    bondStateChangeHandler!({ deviceId: 'AA:BB', bondState: 'bonded' })
    expect(callback).toHaveBeenCalledWith({ deviceId: 'AA:BB', bondState: 'bonded' })

    sub.remove()
  })

  // -------------------------------------------------------------------------

  test('onConnectionEvent subscribes to native event and tracks subscription', () => {
    const callback = jest.fn()
    const sub = manager.onConnectionEvent(callback)

    expect(mockNativeModule.onConnectionEvent).toHaveBeenCalled()

    connectionEventHandler!({ deviceId: 'AA:BB', connectionState: 'connected' })
    expect(callback).toHaveBeenCalledWith({ deviceId: 'AA:BB', connectionState: 'connected' })

    sub.remove()
  })

  // -------------------------------------------------------------------------

  test('monitorL2CAPChannel receives data events filtered by channelId', () => {
    const listener = jest.fn()
    const sub = manager.monitorL2CAPChannel(1, listener)

    expect(mockNativeModule.onL2CAPData).toHaveBeenCalled()
    expect(mockNativeModule.onL2CAPClose).toHaveBeenCalled()

    // Data for our channel
    l2capDataHandler!({ channelId: 1, data: 'SGVsbG8=' })
    expect(listener).toHaveBeenCalledWith(null, { channelId: 1, data: 'SGVsbG8=' })

    // Data for a different channel — should be ignored
    l2capDataHandler!({ channelId: 2, data: 'other' })
    expect(listener).toHaveBeenCalledTimes(1)

    sub.remove()
  })

  test('monitorL2CAPChannel calls listener with (null, null) on clean close', () => {
    const listener = jest.fn()
    manager.monitorL2CAPChannel(1, listener)

    // Clean close (no error)
    l2capCloseHandler!({ channelId: 1, error: null })
    expect(listener).toHaveBeenCalledWith(null, null)
  })

  test('monitorL2CAPChannel calls listener with BleError on error close', () => {
    const listener = jest.fn()
    manager.monitorL2CAPChannel(1, listener)

    // Error close
    l2capCloseHandler!({ channelId: 1, error: 'Connection lost' })
    expect(listener).toHaveBeenCalledTimes(1)
    const [error, data] = listener.mock.calls[0]
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('Connection lost')
    expect(data).toBeNull()
  })

  test('monitorL2CAPChannel ignores close events for other channels', () => {
    const listener = jest.fn()
    manager.monitorL2CAPChannel(1, listener)

    l2capCloseHandler!({ channelId: 2, error: 'Connection lost' })
    expect(listener).not.toHaveBeenCalled()
  })
})
