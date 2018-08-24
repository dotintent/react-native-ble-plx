import { central } from '../../index'
import * as Native from '../../src/BleModule'

beforeEach(() => {
  Native.BleModule = {
    createCentralClient: jest.fn(),
    destroyCentralClient: jest.fn(),
    cancelPromise: jest.fn(),
    actionOnBuffer: jest.fn(),
    stopBuffer: jest.fn(),
    getState: jest.fn(),
    monitorState: jest.fn(),
    monitorRestoreState: jest.fn(),
    scanForPeripherals: jest.fn(),
    readRSSIForPeripheral: jest.fn(),
    requestMTUForPeripheral: jest.fn(),
    getMTUForPeripheral: jest.fn(),
    monitorMTUForPeripheral: jest.fn(),
    getPeripherals: jest.fn(),
    getConnectedPeripherals: jest.fn(),
    connectToPeripheral: jest.fn(),
    cancelPeripheralConnection: jest.fn(),
    isPeripheralConnected: jest.fn(),
    monitorDisconnection: jest.fn(),
    getNameForPeripheral: jest.fn(),
    monitorPeripheralName: jest.fn(),
    discoverAllServicesAndCharacteristicsForPeripheral: jest.fn(),
    getServiceForPeripheral: jest.fn(),
    getServicesForPeripheral: jest.fn(),
    getCharacteristicForServiceByUUID: jest.fn(),
    getCharacteristicForService: jest.fn(),
    getCharacteristicsForService: jest.fn(),
    readBase64CharacteristicValue: jest.fn(),
    writeBase64CharacteristicValue: jest.fn(),
    monitorBase64CharacteristicValue: jest.fn(),
    isCharacteristicNotifying: jest.fn(),
    setLogLevel: jest.fn(),
    getLogLevel: jest.fn()
  }
})

describe('create', () => {
  test('call with correct arguments on createCentralClient method', () => {
    const options = { restoreStateId: 'restoreStateId', showPowerAlert: true }
    
    const expected = {...options}
  
    central.create(options)
    expect(Native.BleModule.createCentralClient).toBeCalledWith(expected, expect.anything())
  })

  test('return proper success data', () => {
    const centralId = 1
    
    const expected = { id: centralId }
  
    Native.BleModule.createCentralClient = jest.fn((o, callback) => callback(null, centralId))
    return central.create().then(v => expect(v).toEqual(expected))
  })
})

describe('destroy', () => {
  test('call with correct arguments on destroyCentralClient method', () => {
    const centralManager = { id: 1 }
    
    const expected = 1
    
    central.destroy(centralManager)
    expect(Native.BleModule.destroyCentralClient).toBeCalledWith(expected)
  })
})

describe('getRestoreState', () => {
  test('call with correct arguments on monitorRestoreState method', () => {
    const centralManager = { id: 1 }

    const expected = 1

    central.getRestoredState(centralManager)
    expect(Native.BleModule.monitorRestoreState).toBeCalledWith(expected, expect.anything())
  })
})

describe('getState', () => {
  test('call with correct arguments on getState method', () => {
    const centralManager = { id: 1 }

    const expected = 1

    central.getState(centralManager)
    expect(Native.BleModule.getState).toBeCalledWith(expected, expect.anything())
  })
})

describe('monitorState', () => {
  test('call with correct arguments on monitorState method', () => {
    const args = {
      centralManager: { id: 1 },
      options: { emitCurrentState: true}
    }

    const expected = {
      centralId: args.centralManager.id,
      options: {...args.options}
    }

    central.monitorState(args.centralManager, args.options)
    expect(Native.BleModule.monitorState).toBeCalledWith(expected.centralId, expected.options, expect.anything())
  })
})

describe('scanForPeripherals', () => {
  test('call with correct arguments on scanForPeripherals method', () => {
    const args = {
      centralManager: { id: 1 },
      serviceUUIDs: ['123', '234'],
      options: { allowDuplicates: true }
    }

    const expected = {
      centralId: args.centralManager.id,
      serviceUUIDs: args.serviceUUIDs,
      options: {...args.options}
    }

    central.scanForPeripherals(args.centralManager, args.serviceUUIDs, args.options)
    expect(Native.BleModule.scanForPeripherals).toBeCalledWith(expected.centralId, expected.serviceUUIDs, expected.options, expect.anything())
  })
})

describe('getPeripherals', () => {
  test('call with correct arguments on getPeripherals method', () => {
    const args = {
      centralManager: { id: 1 },
      peripheralIds: ['123', '234'],
    }

    const expected = {
      centralId: args.centralManager.id,
      peripheralIds: args.peripheralIds
    }

    central.getPeripherals(args.centralManager, args.peripheralIds)
    expect(Native.BleModule.getPeripherals).toBeCalledWith(expected.centralId, expected.peripheralIds, expect.anything())
  })
})

describe('monitorDisconnection', () => {
  test('call with correct arguments on getPeripherals method', () => {
    const args = {
      centralManager: { id: 1 },
    }

    const expected = {
      centralId: args.centralManager.id,
    }

    central.monitorDisconnection(args.centralManager, args.peripheralIds)
    expect(Native.BleModule.monitorDisconnection).toBeCalledWith(expected.centralId, expect.anything())
  })
})