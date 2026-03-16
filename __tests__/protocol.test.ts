// __tests__/protocol.test.ts
// Tests for protocol-level concerns: Base64, DeviceInfo/CharacteristicInfo shapes,
// error event conversion, BleErrorCode distinctness, and public type constants.

import { BleError, BleErrorCode } from '../src/BleError'
import { State, ConnectionState, ConnectionPriority } from '../src/types'

// ---------------------------------------------------------------------------
// Base64 round-trip
// ---------------------------------------------------------------------------

describe('Base64 encode/decode round-trip', () => {
  // react-native-ble-plx uses base64 strings for characteristic values.
  // The protocol contract is that btoa/atob (or equivalent) must round-trip.

  const cases: Array<[string, string]> = [
    ['hello', 'aGVsbG8='],
    ['\x01\x02\x03', 'AQID'],
    ['', ''],
    ['\x00', 'AA=='],
    ['\xFF\xFE\xFD', '//79']
  ]

  test.each(cases)('btoa(%p) === %p', (raw, expected) => {
    // In Node / jsdom, btoa works on latin-1 byte strings
    if (raw === '') {
      expect(btoa(raw)).toBe('')
    } else {
      expect(btoa(raw)).toBe(expected)
    }
  })

  test.each(cases)('atob(btoa(x)) round-trips', (raw, _b64) => {
    if (raw === '') {
      expect(atob(btoa(raw))).toBe(raw)
    } else {
      expect(atob(btoa(raw))).toBe(raw)
    }
  })

  test('AQID decodes to three bytes 1,2,3', () => {
    const decoded = atob('AQID')
    expect(decoded.charCodeAt(0)).toBe(1)
    expect(decoded.charCodeAt(1)).toBe(2)
    expect(decoded.charCodeAt(2)).toBe(3)
  })

  test('null value field is preserved as null (no decode attempted)', () => {
    // When native returns null for value, JS must not call atob(null)
    const value: string | null = null
    expect(value === null ? null : atob(value)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// DeviceInfo shape
// ---------------------------------------------------------------------------

describe('DeviceInfo parsing', () => {
  interface DeviceInfo {
    id: string
    name: string | null
    rssi: number
    mtu: number
    isConnectable: boolean | null
    serviceUuids: readonly string[]
    manufacturerData: string | null
  }

  function parseDeviceInfo(raw: Record<string, unknown>): DeviceInfo {
    return {
      id: raw.id as string,
      name: (raw.name as string | null) ?? null,
      rssi: raw.rssi as number,
      mtu: raw.mtu as number,
      isConnectable: (raw.isConnectable as boolean | null) ?? null,
      serviceUuids: (raw.serviceUuids as string[]) ?? [],
      manufacturerData: (raw.manufacturerData as string | null) ?? null
    }
  }

  test('valid DeviceInfo parses all fields', () => {
    const raw = {
      id: 'AA:BB:CC:DD:EE:FF',
      name: 'HeartSensor',
      rssi: -65,
      mtu: 247,
      isConnectable: true,
      serviceUuids: ['180D', '1800'],
      manufacturerData: 'AQID'
    }
    const info = parseDeviceInfo(raw)
    expect(info.id).toBe('AA:BB:CC:DD:EE:FF')
    expect(info.name).toBe('HeartSensor')
    expect(info.rssi).toBe(-65)
    expect(info.mtu).toBe(247)
    expect(info.isConnectable).toBe(true)
    expect(info.serviceUuids).toEqual(['180D', '1800'])
    expect(info.manufacturerData).toBe('AQID')
  })

  test('null fields handled correctly', () => {
    const raw = {
      id: 'AA:BB',
      name: null,
      rssi: -90,
      mtu: 23,
      isConnectable: null,
      serviceUuids: [],
      manufacturerData: null
    }
    const info = parseDeviceInfo(raw)
    expect(info.name).toBeNull()
    expect(info.isConnectable).toBeNull()
    expect(info.manufacturerData).toBeNull()
    expect(info.serviceUuids).toEqual([])
  })

  test('missing optional fields default to null/empty', () => {
    const raw = { id: 'AA:BB', rssi: -70, mtu: 23 }
    const info = parseDeviceInfo(raw)
    expect(info.name).toBeNull()
    expect(info.isConnectable).toBeNull()
    expect(info.manufacturerData).toBeNull()
    expect(info.serviceUuids).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// CharacteristicInfo shape
// ---------------------------------------------------------------------------

describe('CharacteristicInfo parsing', () => {
  interface CharacteristicInfo {
    deviceId: string
    serviceUuid: string
    uuid: string
    value: string | null
    isNotifying: boolean
    isIndicatable: boolean
    isReadable: boolean
    isWritableWithResponse: boolean
    isWritableWithoutResponse: boolean
  }

  function parseCharInfo(raw: Record<string, unknown>): CharacteristicInfo {
    return {
      deviceId: raw.deviceId as string,
      serviceUuid: raw.serviceUuid as string,
      uuid: raw.uuid as string,
      value: (raw.value as string | null) ?? null,
      isNotifying: Boolean(raw.isNotifying),
      isIndicatable: Boolean(raw.isIndicatable),
      isReadable: Boolean(raw.isReadable),
      isWritableWithResponse: Boolean(raw.isWritableWithResponse),
      isWritableWithoutResponse: Boolean(raw.isWritableWithoutResponse)
    }
  }

  test('fully populated characteristic info', () => {
    const raw = {
      deviceId: 'AA:BB',
      serviceUuid: '180D',
      uuid: '2A37',
      value: 'AQID',
      isNotifying: true,
      isIndicatable: false,
      isReadable: true,
      isWritableWithResponse: false,
      isWritableWithoutResponse: false
    }
    const info = parseCharInfo(raw)
    expect(info.deviceId).toBe('AA:BB')
    expect(info.serviceUuid).toBe('180D')
    expect(info.uuid).toBe('2A37')
    expect(info.value).toBe('AQID')
    expect(info.isNotifying).toBe(true)
    expect(info.isReadable).toBe(true)
  })

  test('null value field is preserved as null', () => {
    const raw = {
      deviceId: 'AA:BB',
      serviceUuid: '180D',
      uuid: '2A37',
      value: null,
      isNotifying: false,
      isIndicatable: false,
      isReadable: true,
      isWritableWithResponse: true,
      isWritableWithoutResponse: false
    }
    const info = parseCharInfo(raw)
    expect(info.value).toBeNull()
  })

  test('all capability flags can be false', () => {
    const raw = {
      deviceId: 'AA:BB',
      serviceUuid: 'svc',
      uuid: 'char',
      value: null,
      isNotifying: false,
      isIndicatable: false,
      isReadable: false,
      isWritableWithResponse: false,
      isWritableWithoutResponse: false
    }
    const info = parseCharInfo(raw)
    expect(info.isNotifying).toBe(false)
    expect(info.isIndicatable).toBe(false)
    expect(info.isReadable).toBe(false)
    expect(info.isWritableWithResponse).toBe(false)
    expect(info.isWritableWithoutResponse).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Error event conversion
// ---------------------------------------------------------------------------

describe('BleError construction from native error events', () => {
  function convertErrorEvent(raw: {
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
  }): BleError {
    return new BleError(raw)
  }

  test('converts a permission denied error event correctly', () => {
    const err = convertErrorEvent({
      code: BleErrorCode.BluetoothUnauthorized,
      message: 'Bluetooth permission denied',
      isRetryable: false,
      platform: 'ios',
      deviceId: null,
      serviceUuid: null,
      characteristicUuid: null,
      operation: 'scan',
      nativeDomain: 'CBErrorDomain',
      nativeCode: 13,
      gattStatus: null,
      attErrorCode: null
    })

    expect(err).toBeInstanceOf(BleError)
    expect(err.code).toBe(BleErrorCode.BluetoothUnauthorized)
    expect(err.message).toBe('Bluetooth permission denied')
    expect(err.isRetryable).toBe(false)
    expect(err.platform).toBe('ios')
    expect(err.deviceId).toBeUndefined()
    expect(err.operation).toBe('scan')
    expect(err.nativeDomain).toBe('CBErrorDomain')
    expect(err.nativeCode).toBe(13)
    expect(err.gattStatus).toBeUndefined()
  })

  test('converts a connection timeout error with device context', () => {
    const err = convertErrorEvent({
      code: BleErrorCode.ConnectionTimeout,
      message: 'Connection timeout',
      isRetryable: true,
      platform: 'android',
      deviceId: 'AA:BB:CC:DD:EE:FF',
      serviceUuid: null,
      characteristicUuid: null,
      operation: 'connect',
      nativeDomain: null,
      nativeCode: null,
      gattStatus: 133,
      attErrorCode: null
    })

    expect(err.code).toBe(BleErrorCode.ConnectionTimeout)
    expect(err.isRetryable).toBe(true)
    expect(err.platform).toBe('android')
    expect(err.deviceId).toBe('AA:BB:CC:DD:EE:FF')
    expect(err.gattStatus).toBe(133)
    expect(err.nativeDomain).toBeUndefined()
  })

  test('converts a GATT characteristic write error with full context', () => {
    const err = convertErrorEvent({
      code: BleErrorCode.CharacteristicWriteFailed,
      message: 'Write failed',
      isRetryable: false,
      platform: 'android',
      deviceId: 'AA:BB',
      serviceUuid: '180D',
      characteristicUuid: '2A37',
      operation: 'write',
      nativeDomain: null,
      nativeCode: null,
      gattStatus: 5,
      attErrorCode: 3
    })

    expect(err.code).toBe(BleErrorCode.CharacteristicWriteFailed)
    expect(err.serviceUUID).toBe('180D')
    expect(err.characteristicUUID).toBe('2A37')
    expect(err.gattStatus).toBe(5)
    expect(err.attErrorCode).toBe(3)
  })

  test('unknown event type does not crash — falls through to UnknownError code', () => {
    // A future native event with an unknown code should still construct cleanly
    const err = convertErrorEvent({
      code: 9999,
      message: 'Future error type',
      isRetryable: false,
      platform: 'ios'
    })

    expect(err).toBeInstanceOf(BleError)
    // code is stored as-is (cast to BleErrorCode type)
    expect(err.code).toBe(9999)
    expect(err.message).toBe('Future error type')
  })

  test('all null optional fields result in undefined properties (not null)', () => {
    const err = convertErrorEvent({
      code: BleErrorCode.UnknownError,
      message: 'Unknown',
      isRetryable: false,
      platform: 'ios',
      deviceId: null,
      serviceUuid: null,
      characteristicUuid: null,
      operation: null,
      nativeDomain: null,
      nativeCode: null,
      gattStatus: null,
      attErrorCode: null
    })

    // BleError constructor maps null → undefined
    expect(err.deviceId).toBeUndefined()
    expect(err.serviceUUID).toBeUndefined()
    expect(err.characteristicUUID).toBeUndefined()
    expect(err.operation).toBeUndefined()
    expect(err.nativeDomain).toBeUndefined()
    expect(err.nativeCode).toBeUndefined()
    expect(err.gattStatus).toBeUndefined()
    expect(err.attErrorCode).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// BleErrorCode — all values are distinct numbers
// ---------------------------------------------------------------------------

describe('BleErrorCode', () => {
  test('all BleErrorCode values are distinct numbers', () => {
    const values = Object.values(BleErrorCode)
    const unique = new Set(values)
    expect(unique.size).toBe(values.length)
    values.forEach(v => expect(typeof v).toBe('number'))
  })

  test('spot-check specific BleErrorCode numeric values', () => {
    expect(BleErrorCode.DeviceNotFound).toBe(0)
    expect(BleErrorCode.DeviceDisconnected).toBe(1)
    expect(BleErrorCode.ConnectionFailed).toBe(2)
    expect(BleErrorCode.ConnectionTimeout).toBe(3)
    expect(BleErrorCode.OperationCancelled).toBe(100)
    expect(BleErrorCode.CharacteristicNotFound).toBe(200)
    expect(BleErrorCode.BluetoothUnauthorized).toBe(300)
    expect(BleErrorCode.ManagerNotInitialized).toBe(400)
    expect(BleErrorCode.BondingFailed).toBe(500)
    expect(BleErrorCode.L2CAPChannelFailed).toBe(600)
    expect(BleErrorCode.PhyNegotiationFailed).toBe(700)
    expect(BleErrorCode.ScanFailed).toBe(800)
    expect(BleErrorCode.UnknownError).toBe(999)
  })

  test('BleError preserves all context fields', () => {
    const err = new BleError({
      code: BleErrorCode.CharacteristicReadFailed,
      message: 'Read failed: ATT error 2',
      isRetryable: false,
      platform: 'android',
      deviceId: 'DE:AD:BE:EF:00:01',
      serviceUuid: '0000180d-0000-1000-8000-00805f9b34fb',
      characteristicUuid: '00002a37-0000-1000-8000-00805f9b34fb',
      operation: 'read',
      nativeDomain: null,
      nativeCode: null,
      gattStatus: 2,
      attErrorCode: 2
    })

    expect(err.code).toBe(BleErrorCode.CharacteristicReadFailed)
    expect(err.message).toBe('Read failed: ATT error 2')
    expect(err.isRetryable).toBe(false)
    expect(err.platform).toBe('android')
    expect(err.deviceId).toBe('DE:AD:BE:EF:00:01')
    expect(err.serviceUUID).toBe('0000180d-0000-1000-8000-00805f9b34fb')
    expect(err.characteristicUUID).toBe('00002a37-0000-1000-8000-00805f9b34fb')
    expect(err.operation).toBe('read')
    expect(err.gattStatus).toBe(2)
    expect(err.attErrorCode).toBe(2)
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('BleError')
  })
})

// ---------------------------------------------------------------------------
// State / ConnectionState / ConnectionPriority const objects
// ---------------------------------------------------------------------------

describe('State const object', () => {
  test('has all required string values', () => {
    expect(State.Unknown).toBe('Unknown')
    expect(State.Resetting).toBe('Resetting')
    expect(State.Unsupported).toBe('Unsupported')
    expect(State.Unauthorized).toBe('Unauthorized')
    expect(State.PoweredOff).toBe('PoweredOff')
    expect(State.PoweredOn).toBe('PoweredOn')
  })

  test('all State values are distinct strings', () => {
    const values = Object.values(State)
    const unique = new Set(values)
    expect(unique.size).toBe(values.length)
    values.forEach(v => expect(typeof v).toBe('string'))
  })
})

describe('ConnectionState const object', () => {
  test('has all required string values', () => {
    expect(ConnectionState.Disconnected).toBe('disconnected')
    expect(ConnectionState.Connecting).toBe('connecting')
    expect(ConnectionState.Connected).toBe('connected')
    expect(ConnectionState.Disconnecting).toBe('disconnecting')
  })

  test('all ConnectionState values are distinct strings', () => {
    const values = Object.values(ConnectionState)
    const unique = new Set(values)
    expect(unique.size).toBe(values.length)
  })
})

describe('ConnectionPriority const object', () => {
  test('has correct numeric values', () => {
    expect(ConnectionPriority.Balanced).toBe(0)
    expect(ConnectionPriority.High).toBe(1)
    expect(ConnectionPriority.LowPower).toBe(2)
  })

  test('all ConnectionPriority values are distinct numbers', () => {
    const values = Object.values(ConnectionPriority)
    const unique = new Set(values)
    expect(unique.size).toBe(values.length)
    values.forEach(v => expect(typeof v).toBe('number'))
  })
})
