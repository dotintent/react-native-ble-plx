// __tests__/BleError.test.ts
import { BleError, BleErrorCode } from '../src/BleError'

test('BleError constructs with all fields', () => {
  const err = new BleError({
    code: BleErrorCode.ConnectionFailed,
    message: 'GATT error 133',
    isRetryable: true,
    platform: 'android',
    gattStatus: 133,
    deviceId: 'AA:BB:CC:DD:EE:FF',
    operation: 'connect',
    nativeDomain: null,
    nativeCode: null,
    serviceUuid: null,
    characteristicUuid: null,
    attErrorCode: null
  })
  expect(err.code).toBe(BleErrorCode.ConnectionFailed)
  expect(err.isRetryable).toBe(true)
  expect(err.gattStatus).toBe(133)
  expect(err.deviceId).toBe('AA:BB:CC:DD:EE:FF')
  expect(err instanceof Error).toBe(true)
})

test('BleErrorCode values are correct', () => {
  expect(BleErrorCode.DeviceNotFound).toBe(0)
  expect(BleErrorCode.ManagerNotInitialized).toBe(400)
  expect(BleErrorCode.UnknownError).toBe(999)
})
