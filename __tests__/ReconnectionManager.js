import { ReconnectionManager } from '../src/ReconnectionManager'

// Mock subscription
const createMockSubscription = () => ({
  remove: jest.fn()
})

// Mock BleManager
const createMockBleManager = () => {
  const disconnectCallbacks = new Map()

  return {
    connectToDevice: jest.fn(),
    onDeviceDisconnected: jest.fn((deviceId, callback) => {
      disconnectCallbacks.set(deviceId, callback)
      return createMockSubscription()
    }),
    // Helper to simulate disconnection
    _simulateDisconnect: (deviceId, error) => {
      const callback = disconnectCallbacks.get(deviceId)
      if (callback) {
        callback(error, { id: deviceId })
      }
    },
    _disconnectCallbacks: disconnectCallbacks
  }
}

// Helper to create mock device
const createMockDevice = (id = 'test-device') => ({
  id,
  name: 'Test Device',
  rssi: -50,
  mtu: 23
})

describe('ReconnectionManager', () => {
  let bleManager
  let manager

  beforeEach(() => {
    bleManager = createMockBleManager()
    manager = new ReconnectionManager(bleManager)
  })

  afterEach(() => {
    manager.destroy()
  })

  test('should enable auto-reconnect for a device', () => {
    expect(manager.isEnabled('test-device')).toBe(false)

    manager.enableAutoReconnect('test-device')

    expect(manager.isEnabled('test-device')).toBe(true)
    expect(bleManager.onDeviceDisconnected).toHaveBeenCalledWith('test-device', expect.any(Function))
  })

  test('should disable auto-reconnect for a device', () => {
    manager.enableAutoReconnect('test-device')
    expect(manager.isEnabled('test-device')).toBe(true)

    const result = manager.disableAutoReconnect('test-device')

    expect(result).toBe(true)
    expect(manager.isEnabled('test-device')).toBe(false)
  })

  test('should return false when disabling non-existent device', () => {
    const result = manager.disableAutoReconnect('non-existent')
    expect(result).toBe(false)
  })

  test('disableAll should disable all devices', () => {
    manager.enableAutoReconnect('device1')
    manager.enableAutoReconnect('device2')
    manager.enableAutoReconnect('device3')

    manager.disableAll()

    expect(manager.isEnabled('device1')).toBe(false)
    expect(manager.isEnabled('device2')).toBe(false)
    expect(manager.isEnabled('device3')).toBe(false)
  })

  test('should return -1 for retry count when not enabled', () => {
    expect(manager.getRetryCount('test-device')).toBe(-1)
  })

  test('should return 0 for retry count when enabled but not reconnecting', () => {
    manager.enableAutoReconnect('test-device')
    expect(manager.getRetryCount('test-device')).toBe(0)
  })

  test('isReconnecting should return false when not reconnecting', () => {
    manager.enableAutoReconnect('test-device')
    expect(manager.isReconnecting('test-device')).toBe(false)
  })
})
