// integration-tests/simulated/js/fullSync.test.ts
//
// Full JS-layer flow tests with a mocked TurboModule.
// No real Bluetooth hardware required — all native calls are intercepted.
//
// Run with a dedicated jest config that includes this directory,
// since the root jest.config.js intentionally excludes integration-tests/.

// ---------------------------------------------------------------------------
// Mock setup — must come before any imports that pull in react-native
// ---------------------------------------------------------------------------

let scanResultHandlers: Array<(result: any) => void> = []
let connectionStateHandlers: Array<(event: any) => void> = []
let charValueHandlers: Array<(event: any) => void> = []

const mockNativeModule = {
  createClient: jest.fn().mockResolvedValue(undefined),
  destroyClient: jest.fn().mockResolvedValue(undefined),
  state: jest.fn().mockResolvedValue('PoweredOn'),
  startDeviceScan: jest.fn(),
  stopDeviceScan: jest.fn().mockResolvedValue(undefined),
  connectToDevice: jest.fn().mockResolvedValue({
    id: 'AA:BB:CC:DD:EE:FF',
    name: 'SmartCap',
    rssi: -55,
    mtu: 247,
    isConnectable: true,
    serviceUuids: ['180D', '1800'],
    manufacturerData: null
  }),
  cancelDeviceConnection: jest.fn().mockResolvedValue({
    id: 'AA:BB:CC:DD:EE:FF',
    name: 'SmartCap',
    rssi: -55,
    mtu: 247,
    isConnectable: true,
    serviceUuids: [],
    manufacturerData: null
  }),
  isDeviceConnected: jest.fn().mockResolvedValue(true),
  discoverAllServicesAndCharacteristics: jest.fn().mockResolvedValue({
    id: 'AA:BB:CC:DD:EE:FF',
    name: 'SmartCap',
    rssi: -55,
    mtu: 247,
    isConnectable: true,
    serviceUuids: ['180D'],
    manufacturerData: null
  }),
  readCharacteristic: jest.fn().mockResolvedValue({
    deviceId: 'AA:BB:CC:DD:EE:FF',
    serviceUuid: '180D',
    uuid: '2A37',
    value: 'AQID',
    isNotifying: false,
    isIndicatable: false,
    isReadable: true,
    isWritableWithResponse: false,
    isWritableWithoutResponse: false
  }),
  writeCharacteristic: jest.fn().mockResolvedValue({
    deviceId: 'AA:BB:CC:DD:EE:FF',
    serviceUuid: '180D',
    uuid: '2A37',
    value: 'BAUG',
    isNotifying: false,
    isIndicatable: false,
    isReadable: true,
    isWritableWithResponse: true,
    isWritableWithoutResponse: false
  }),
  monitorCharacteristic: jest.fn(),
  requestMtu: jest.fn().mockResolvedValue({
    id: 'AA:BB:CC:DD:EE:FF',
    name: 'SmartCap',
    rssi: -55,
    mtu: 247,
    isConnectable: true,
    serviceUuids: [],
    manufacturerData: null
  }),
  requestConnectionPriority: jest.fn().mockResolvedValue({
    id: 'AA:BB:CC:DD:EE:FF',
    name: 'SmartCap',
    rssi: -55,
    mtu: 23,
    isConnectable: true,
    serviceUuids: [],
    manufacturerData: null
  }),
  cancelTransaction: jest.fn().mockResolvedValue(undefined),
  getMtu: jest.fn().mockResolvedValue(247),
  requestPhy: jest.fn().mockResolvedValue({
    deviceId: 'AA:BB:CC:DD:EE:FF',
    txPhy: 2,
    rxPhy: 2
  }),
  readPhy: jest.fn().mockResolvedValue({
    deviceId: 'AA:BB:CC:DD:EE:FF',
    txPhy: 1,
    rxPhy: 1
  }),
  getBondedDevices: jest.fn().mockResolvedValue([]),
  getAuthorizationStatus: jest.fn().mockResolvedValue('granted'),
  openL2CAPChannel: jest.fn().mockResolvedValue({ channelId: 5, deviceId: 'AA:BB:CC:DD:EE:FF', psm: 128 }),
  writeL2CAPChannel: jest.fn().mockResolvedValue(undefined),
  closeL2CAPChannel: jest.fn().mockResolvedValue(undefined),

  // Event emitters
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
  onStateChange: jest.fn(() => ({
    remove: jest.fn()
  })),
  onError: jest.fn(() => ({ remove: jest.fn() })),
  onRestoreState: jest.fn(() => ({ remove: jest.fn() })),
  onBondStateChange: jest.fn(() => ({ remove: jest.fn() })),
  onConnectionEvent: jest.fn(() => ({ remove: jest.fn() }))
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
// Imports — after jest.mock() hoisting
// ---------------------------------------------------------------------------

import { BleManager } from '../../../src/BleManager'

import { BleError, BleErrorCode } from '../../../src/BleError'

// ---------------------------------------------------------------------------
// Constants used throughout tests
// ---------------------------------------------------------------------------

const DEVICE_ID = 'AA:BB:CC:DD:EE:FF'
const SERVICE_UUID = '180D'
const CHAR_UUID = '2A37'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeScanResult(id = DEVICE_ID) {
  return {
    id,
    name: 'SmartCap',
    rssi: -55,
    serviceUuids: ['180D'],
    manufacturerData: null
  }
}

function makeCharEvent(txId: string, deviceId = DEVICE_ID, svc = SERVICE_UUID, char = CHAR_UUID) {
  return {
    deviceId,
    serviceUuid: svc,
    characteristicUuid: char,
    value: 'AQID',
    transactionId: txId
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Full JS flow with mocked native module', () => {
  let manager: BleManager

  beforeEach(() => {
    jest.clearAllMocks()
    scanResultHandlers = []
    connectionStateHandlers = []
    charValueHandlers = []

    manager = new BleManager({ scanBatchIntervalMs: 0 })
  })

  afterEach(async () => {
    await manager.destroyClient().catch(() => {})
  })

  // -------------------------------------------------------------------------
  // Step 1: createClient → state = PoweredOn
  // -------------------------------------------------------------------------

  test('step 1: createClient initialises native and state() returns PoweredOn', async () => {
    await manager.createClient()

    expect(mockNativeModule.createClient).toHaveBeenCalledWith(null)

    const state = await manager.state()
    expect(state).toBe('PoweredOn')
    expect(mockNativeModule.state).toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // Step 2: startDeviceScan → onScanResult fires with mock device
  // -------------------------------------------------------------------------

  test('step 2: startDeviceScan fires onScanResult callback with scanned device', () => {
    const received: any[] = []

    manager.startDeviceScan(null, null, (err, device) => {
      expect(err).toBeNull()
      if (device) received.push(device)
    })

    expect(mockNativeModule.startDeviceScan).toHaveBeenCalledWith(null, null)
    expect(mockNativeModule.onScanResult).toHaveBeenCalled()

    // Simulate native delivering a scan result
    const handler = scanResultHandlers[scanResultHandlers.length - 1]!
    handler(makeScanResult())

    expect(received).toHaveLength(1)
    expect(received[0].id).toBe(DEVICE_ID)
    expect(received[0].name).toBe('SmartCap')
    expect(received[0].rssi).toBe(-55)
  })

  test('step 2b: startDeviceScan with service UUID filter passes filter to native', () => {
    manager.startDeviceScan(['180D'], null, jest.fn())

    expect(mockNativeModule.startDeviceScan).toHaveBeenCalledWith(['180D'], null)
  })

  // -------------------------------------------------------------------------
  // Step 3: connectToDevice → resolves with DeviceInfo
  // -------------------------------------------------------------------------

  test('step 3: connectToDevice resolves with DeviceInfo', async () => {
    await manager.createClient()
    const device = await manager.connectToDevice(DEVICE_ID)

    expect(mockNativeModule.connectToDevice).toHaveBeenCalledWith(DEVICE_ID, null)
    expect(device.id).toBe(DEVICE_ID)
    expect(device.name).toBe('SmartCap')
    expect(device.mtu).toBe(247)
  })

  test('step 3b: connectToDevice forwards options to native', async () => {
    await manager.createClient()
    const options = { autoConnect: false, timeout: 10000, requestMtu: 512 }
    await manager.connectToDevice(DEVICE_ID, options)

    expect(mockNativeModule.connectToDevice).toHaveBeenCalledWith(DEVICE_ID, options)
  })

  // -------------------------------------------------------------------------
  // Step 4: writeCharacteristicForDevice → resolves with CharacteristicInfo
  // -------------------------------------------------------------------------

  test('step 4: writeCharacteristicForDevice resolves with characteristic info', async () => {
    await manager.createClient()

    const result = await manager.writeCharacteristicForDevice(DEVICE_ID, SERVICE_UUID, CHAR_UUID, 'BAUG', true)

    expect(mockNativeModule.writeCharacteristic).toHaveBeenCalledWith(
      DEVICE_ID,
      SERVICE_UUID,
      CHAR_UUID,
      'BAUG',
      true,
      null
    )
    expect(result.value).toBe('BAUG')
    expect(result.deviceId).toBe(DEVICE_ID)
    expect(result.isWritableWithResponse).toBe(true)
  })

  test('step 4b: writeCharacteristicForDevice without response forwards withResponse=false', async () => {
    await manager.createClient()

    await manager.writeCharacteristicForDevice(DEVICE_ID, SERVICE_UUID, CHAR_UUID, 'AA==', false)

    const call = mockNativeModule.writeCharacteristic.mock.calls[0] as any[]
    expect(call[4]).toBe(false)
  })

  // -------------------------------------------------------------------------
  // Step 5: monitorCharacteristicForDevice → onCharacteristicValueUpdate fires
  // -------------------------------------------------------------------------

  test('step 5: monitorCharacteristicForDevice routes characteristic value events', async () => {
    await manager.createClient()

    const received: any[] = []
    const sub = manager.monitorCharacteristicForDevice(DEVICE_ID, SERVICE_UUID, CHAR_UUID, (err, event) => {
      expect(err).toBeNull()
      if (event) received.push(event)
    })

    expect(mockNativeModule.monitorCharacteristic).toHaveBeenCalled()
    const txId = (mockNativeModule.monitorCharacteristic.mock.calls[0] as any[])[4]
    expect(txId).toMatch(/^__ble_tx_\d+$/)

    const charHandler = charValueHandlers[charValueHandlers.length - 1]!

    // Matching event
    charHandler(makeCharEvent(txId))
    // Another matching event
    charHandler(makeCharEvent(txId))

    expect(received).toHaveLength(2)
    expect(received[0].deviceId).toBe(DEVICE_ID)
    expect(received[0].value).toBe('AQID')

    sub.remove()
  })

  // -------------------------------------------------------------------------
  // Step 6 (audit #3 fix verification):
  // subscription.remove() stops native monitor AND removes JS listener
  // -------------------------------------------------------------------------

  test('step 6: subscription.remove() cancels native transaction AND removes JS listener', async () => {
    await manager.createClient()

    const received: any[] = []
    const sub = manager.monitorCharacteristicForDevice(DEVICE_ID, SERVICE_UUID, CHAR_UUID, (err, event) => {
      if (event) received.push(event)
    })

    const txId = (mockNativeModule.monitorCharacteristic.mock.calls[0] as any[])[4]

    // Remove the subscription
    sub.remove()

    // cancelTransaction must have been called with the correct txId
    expect(mockNativeModule.cancelTransaction).toHaveBeenCalledWith(txId)

    // JS listener should be removed — charValueHandlers should no longer include this handler
    expect(charValueHandlers).toHaveLength(0)

    // Any events arriving after remove() must not call the listener
    // (Simulate: try to fire — if any handler were still registered it would add to received)
    // charValueHandlers is empty so nothing fires — this is the expected behaviour

    expect(received).toHaveLength(0)
  })

  test('step 6b: subscription.remove() is idempotent — second call is a no-op', async () => {
    await manager.createClient()

    const sub = manager.monitorCharacteristicForDevice(DEVICE_ID, SERVICE_UUID, CHAR_UUID, jest.fn())

    sub.remove()
    const cancelCallCount = mockNativeModule.cancelTransaction.mock.calls.length

    // Second remove() should not call cancelTransaction again
    sub.remove()
    expect(mockNativeModule.cancelTransaction).toHaveBeenCalledTimes(cancelCallCount)
  })

  // -------------------------------------------------------------------------
  // Step 7: cancelDeviceConnection → onConnectionStateChange fires
  // -------------------------------------------------------------------------

  test('step 7: cancelDeviceConnection resolves and native fires disconnected event', async () => {
    await manager.createClient()

    const disconnectEvents: any[] = []
    manager.onDeviceDisconnected(DEVICE_ID, (err, event) => {
      expect(err).toBeNull()
      if (event) disconnectEvents.push(event)
    })

    // Perform the disconnect
    const result = await manager.cancelDeviceConnection(DEVICE_ID)
    expect(result.id).toBe(DEVICE_ID)
    expect(mockNativeModule.cancelDeviceConnection).toHaveBeenCalledWith(DEVICE_ID)

    // Simulate native firing the disconnection event
    connectionStateHandlers.forEach(h =>
      h({
        deviceId: DEVICE_ID,
        state: 'disconnected',
        errorCode: null,
        errorMessage: null
      })
    )

    expect(disconnectEvents).toHaveLength(1)
    expect(disconnectEvents[0].state).toBe('disconnected')
  })

  // -------------------------------------------------------------------------
  // Error scenarios
  // -------------------------------------------------------------------------

  test('error scenario: permission denied rejects connectToDevice', async () => {
    await manager.createClient()

    const permError = new BleError({
      code: BleErrorCode.BluetoothUnauthorized,
      message: 'Bluetooth permission denied',
      isRetryable: false,
      platform: 'ios'
    })

    mockNativeModule.connectToDevice.mockRejectedValueOnce(permError)

    await expect(manager.connectToDevice(DEVICE_ID)).rejects.toMatchObject({
      code: BleErrorCode.BluetoothUnauthorized,
      message: 'Bluetooth permission denied'
    })
  })

  test('error scenario: connection timeout rejects connectToDevice', async () => {
    await manager.createClient()

    const timeoutError = new BleError({
      code: BleErrorCode.ConnectionTimeout,
      message: 'Connection timed out',
      isRetryable: true,
      platform: 'ios',
      deviceId: DEVICE_ID
    })

    mockNativeModule.connectToDevice.mockRejectedValueOnce(timeoutError)

    const caught = await manager.connectToDevice(DEVICE_ID).catch(e => e)
    expect(caught).toBeInstanceOf(BleError)
    expect(caught.code).toBe(BleErrorCode.ConnectionTimeout)
    expect(caught.isRetryable).toBe(true)
  })

  test('error scenario: GATT error rejects writeCharacteristicForDevice', async () => {
    await manager.createClient()

    const gattError = new BleError({
      code: BleErrorCode.CharacteristicWriteFailed,
      message: 'GATT write failed: status 133',
      isRetryable: false,
      platform: 'android',
      deviceId: DEVICE_ID,
      serviceUuid: SERVICE_UUID,
      characteristicUuid: CHAR_UUID,
      gattStatus: 133
    })

    mockNativeModule.writeCharacteristic.mockRejectedValueOnce(gattError)

    const caught = await manager
      .writeCharacteristicForDevice(DEVICE_ID, SERVICE_UUID, CHAR_UUID, 'AQID', true)
      .catch(e => e)

    expect(caught).toBeInstanceOf(BleError)
    expect(caught.code).toBe(BleErrorCode.CharacteristicWriteFailed)
    expect(caught.gattStatus).toBe(133)
    expect(caught.serviceUUID).toBe(SERVICE_UUID)
    expect(caught.characteristicUUID).toBe(CHAR_UUID)
  })

  test('error scenario: disconnected with error code calls onDeviceDisconnected with BleError', async () => {
    await manager.createClient()

    const errorCallback = jest.fn()
    manager.onDeviceDisconnected(DEVICE_ID, errorCallback)

    connectionStateHandlers.forEach(h =>
      h({
        deviceId: DEVICE_ID,
        state: 'disconnected',
        errorCode: BleErrorCode.ConnectionFailed,
        errorMessage: 'GATT connection failed'
      })
    )

    expect(errorCallback).toHaveBeenCalledTimes(1)
    const [err, event] = errorCallback.mock.calls[0] as [BleError, any]
    expect(err).toBeInstanceOf(BleError)
    expect(err.code).toBe(BleErrorCode.ConnectionFailed)
    expect(err.message).toBe('GATT connection failed')
    expect(event).not.toBeNull()
  })

  // -------------------------------------------------------------------------
  // Additional coverage
  // -------------------------------------------------------------------------

  test('onStateChange with emitCurrentState delivers PoweredOn immediately', async () => {
    const states: string[] = []
    const sub = manager.onStateChange(s => states.push(s), true)

    // Microtask queue resolves the state() promise
    await Promise.resolve()

    expect(states).toContain('PoweredOn')

    sub.remove()
  })

  test('stopDeviceScan cleans up subscription and calls native', async () => {
    const received: any[] = []
    manager.startDeviceScan(null, null, (err, device) => {
      if (device) received.push(device)
    })

    const subRemoveSpy = jest.spyOn(mockNativeModule.onScanResult.mock.results[0].value, 'remove')

    await manager.stopDeviceScan()

    expect(mockNativeModule.stopDeviceScan).toHaveBeenCalled()
    expect(subRemoveSpy).toHaveBeenCalled()
    expect(scanResultHandlers).toHaveLength(0)
  })

  test('isDeviceConnected returns true', async () => {
    await manager.createClient()
    const connected = await manager.isDeviceConnected(DEVICE_ID)
    expect(connected).toBe(true)
    expect(mockNativeModule.isDeviceConnected).toHaveBeenCalledWith(DEVICE_ID)
  })

  test('discoverAllServicesAndCharacteristics resolves with DeviceInfo', async () => {
    await manager.createClient()
    const result = await manager.discoverAllServicesAndCharacteristics(DEVICE_ID)
    expect(result.id).toBe(DEVICE_ID)
    expect(mockNativeModule.discoverAllServicesAndCharacteristics).toHaveBeenCalledWith(DEVICE_ID, null)
  })

  test('destroyClient cancels all active monitor transactions', async () => {
    await manager.createClient()

    manager.monitorCharacteristicForDevice(DEVICE_ID, SERVICE_UUID, CHAR_UUID, jest.fn())
    manager.monitorCharacteristicForDevice(DEVICE_ID, SERVICE_UUID, '2A38', jest.fn())

    const txId1 = (mockNativeModule.monitorCharacteristic.mock.calls[0] as any[])[4]
    const txId2 = (mockNativeModule.monitorCharacteristic.mock.calls[1] as any[])[4]

    await manager.destroyClient()

    expect(mockNativeModule.cancelTransaction).toHaveBeenCalledWith(txId1)
    expect(mockNativeModule.cancelTransaction).toHaveBeenCalledWith(txId2)
    expect(mockNativeModule.destroyClient).toHaveBeenCalled()
  })

  test('full happy-path flow: connect → discover → write → monitor → disconnect', async () => {
    // 1. Init
    await manager.createClient()
    expect(await manager.state()).toBe('PoweredOn')

    // 2. Scan
    const scanned: any[] = []
    manager.startDeviceScan(null, null, (err, device) => {
      if (device) scanned.push(device)
    })
    const scanHandler = scanResultHandlers[scanResultHandlers.length - 1]!
    scanHandler(makeScanResult())
    expect(scanned).toHaveLength(1)

    await manager.stopDeviceScan()

    // 3. Connect
    const deviceInfo = await manager.connectToDevice(DEVICE_ID)
    expect(deviceInfo.id).toBe(DEVICE_ID)

    // 4. Discover
    await manager.discoverAllServicesAndCharacteristics(DEVICE_ID)

    // 5. Write
    const writeResult = await manager.writeCharacteristicForDevice(DEVICE_ID, SERVICE_UUID, CHAR_UUID, 'BAUG', true)
    expect(writeResult.value).toBe('BAUG')

    // 6. Monitor
    const notifications: any[] = []
    const sub = manager.monitorCharacteristicForDevice(DEVICE_ID, SERVICE_UUID, CHAR_UUID, (err, event) => {
      if (event) notifications.push(event)
    })
    const txId = (mockNativeModule.monitorCharacteristic.mock.calls[0] as any[])[4]
    const charHandler = charValueHandlers[charValueHandlers.length - 1]!
    charHandler(makeCharEvent(txId))
    expect(notifications).toHaveLength(1)

    // 7. Stop monitoring
    sub.remove()
    expect(mockNativeModule.cancelTransaction).toHaveBeenCalledWith(txId)

    // 8. Disconnect
    const disconnectResult = await manager.cancelDeviceConnection(DEVICE_ID)
    expect(disconnectResult.id).toBe(DEVICE_ID)
  })
})
