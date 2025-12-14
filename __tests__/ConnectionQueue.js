import { ConnectionQueue } from '../src/ConnectionQueue'
import { BleErrorCode } from '../src/BleError'

// Mock BleManager
const createMockBleManager = () => ({
  connectToDevice: jest.fn(),
  cancelDeviceConnection: jest.fn().mockResolvedValue()
})

// Helper to create mock device
const createMockDevice = (id = 'test-device') => ({
  id,
  name: 'Test Device',
  rssi: -50,
  mtu: 23
})

describe('ConnectionQueue', () => {
  let bleManager
  let queue

  beforeEach(() => {
    bleManager = createMockBleManager()
    queue = new ConnectionQueue(bleManager)
  })

  afterEach(() => {
    queue.destroy()
  })

  test('should connect to device successfully', async () => {
    const mockDevice = createMockDevice()
    bleManager.connectToDevice.mockResolvedValue(mockDevice)

    const device = await queue.connect('test-device')

    expect(device).toBe(mockDevice)
    expect(bleManager.connectToDevice).toHaveBeenCalledWith('test-device', undefined)
  })

  test('should report pending count', () => {
    let resolvers = []
    bleManager.connectToDevice.mockImplementation(
      () =>
        new Promise(resolve => {
          resolvers.push(resolve)
        })
    )

    expect(queue.pendingCount).toBe(0)

    queue.connect('device1').catch(() => {})
    expect(queue.pendingCount).toBe(1)

    // Clean up
    queue.cancelAll()
  })

  test('should check if device is pending', () => {
    bleManager.connectToDevice.mockImplementation(() => new Promise(() => {}))

    expect(queue.isPending('test-device')).toBe(false)

    queue.connect('test-device').catch(() => {})

    expect(queue.isPending('test-device')).toBe(true)

    // Clean up
    queue.cancelAll()
  })

  test('should cancel pending connection', async () => {
    bleManager.connectToDevice.mockImplementation(() => new Promise(() => {}))

    const connectPromise = queue.connect('test-device')

    const cancelled = queue.cancel('test-device')
    expect(cancelled).toBe(true)

    await expect(connectPromise).rejects.toMatchObject({
      errorCode: BleErrorCode.OperationCancelled
    })
  })

  test('cancelAll should cancel all pending connections', async () => {
    bleManager.connectToDevice.mockImplementation(() => new Promise(() => {}))

    const promise1 = queue.connect('device1')
    const promise2 = queue.connect('device2')

    queue.cancelAll()

    await expect(promise1).rejects.toMatchObject({
      errorCode: BleErrorCode.OperationCancelled
    })
    await expect(promise2).rejects.toMatchObject({
      errorCode: BleErrorCode.OperationCancelled
    })

    expect(queue.pendingCount).toBe(0)
  })
})
