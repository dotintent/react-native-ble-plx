import { BleManager, Device, Service, Characteristic } from '../index'
import * as Native from '../src/BleModule'

import { NativeEventEmitter } from './Utils'
Native.EventEmitter = NativeEventEmitter

/* eslint-disable no-unused-vars */
var bleManager
const restoreStateFunction = jest.fn()

beforeEach(() => {
  Native.BleModule = {
    createClient: jest.fn(),
    destroyClient: jest.fn(),
    cancelTransaction: jest.fn(),
    setLogLevel: jest.fn(),
    logLevel: jest.fn(),
    enableBluetooth: jest.fn(),
    disableBluetooth: jest.fn(),
    state: jest.fn(),
    startDeviceScan: jest.fn(),
    stopDeviceScan: jest.fn(),
    readRSSIForDevice: jest.fn(),
    connectToDevice: jest.fn(),
    cancelDeviceConnection: jest.fn(),
    isDeviceConnected: jest.fn(),
    discoverAllServicesAndCharacteristicsForDevice: jest.fn(),
    servicesForDevice: jest.fn(),
    characteristicsForDevice: jest.fn(),
    readCharacteristicForDevice: jest.fn(),
    writeCharacteristicForDevice: jest.fn(),
    monitorCharacteristicForDevice: jest.fn(),
    requestMTUForDevice: jest.fn(),
    ScanEvent: 'scan_event',
    ReadEvent: 'read_event',
    StateChangeEvent: 'state_change_event',
    DisconnectionEvent: 'disconnection_event'
  }
  bleManager = new BleManager({
    restoreStateIdentifier: 'identifier',
    restoreStateFunction
  })
})

test('BleModule calls create function when BleManager is constructed', () => {
  expect(Native.BleModule.createClient).toBeCalledWith('identifier')
  expect(Native.BleModule.destroyClient).not.toBeCalled()
})

test('BleModule emits state restoration after BleManager was created', () => {
  const restoredState = {
    connectedPeripherals: [new Device({ id: 'deviceId' }, bleManager)]
  }
  Native.BleModule.emit(Native.BleModule.RestoreStateEvent, restoredState)
  expect(restoreStateFunction).toBeCalledWith(restoredState)
})

test('BleModule calls destroy function when destroyed', () => {
  bleManager.destroy()
  expect(Native.BleModule.createClient).toBeCalled()
  expect(Native.BleModule.destroyClient).toBeCalled()
})

test('BleModule calls setLogLevel function when logLevel is modified', () => {
  bleManager.setLogLevel('Debug')
  expect(Native.BleModule.setLogLevel).toBeCalledWith('Debug')
})

test('BleModule calls logLevel function when logLevel is retrieved', async () => {
  Native.BleModule.logLevel = jest.fn().mockReturnValueOnce(Promise.resolve('Verbose'))
  const logLevel = await bleManager.logLevel()
  expect(Native.BleModule.logLevel).toBeCalled()
  expect(logLevel).toBe('Verbose')
})

test('BleManager state function should return BleModule state', async () => {
  Native.BleModule.state = jest
    .fn()
    .mockReturnValueOnce(Promise.resolve('PoweredOff'))
    .mockReturnValueOnce(Promise.resolve('Resetting'))

  expect(await bleManager.state()).toBe('PoweredOff')
  expect(await bleManager.state()).toBe('Resetting')
})

test('BleModule two emitted state changes are registered by BleManager', () => {
  const newStateCallback = jest.fn()
  bleManager.onStateChange(newStateCallback)
  expect(newStateCallback).not.toBeCalled()
  Native.BleModule.emit(Native.BleModule.StateChangeEvent, 'PoweredOn')
  Native.BleModule.emit(Native.BleModule.StateChangeEvent, 'PoweredOff')
  expect(newStateCallback.mock.calls).toEqual([['PoweredOn'], ['PoweredOff']])
})

test('When BleManager enableBluetooth is called it should call BleModule enableBluetooth', () => {
  bleManager.enableBluetooth()
  expect(Native.BleModule.enableBluetooth).toBeCalled()
})

test('When BleManager disableBluetooth is called it should call BleModule disableBluetooth', () => {
  bleManager.disableBluetooth()
  expect(Native.BleModule.disableBluetooth).toBeCalled()
})

test('When BleManager cancelTransaction is called it should call BleModule cancelTransaction', () => {
  bleManager.cancelTransaction('id')
  expect(Native.BleModule.cancelTransaction).toBeCalledWith('id')
})

test('When BleManager starts scanning it calls BleModule startScanning function', () => {
  const listener = jest.fn()
  bleManager.startDeviceScan(['18a0', '1800'], { allowDuplicates: true }, listener)
  expect(Native.BleModule.startDeviceScan).toBeCalledWith(['18a0', '1800'], {
    allowDuplicates: true
  })
})

test('When BleManager stops scanning it calls BleModule stopScanning function', () => {
  bleManager.stopDeviceScan()
  expect(Native.BleModule.stopDeviceScan).toBeCalled()
})

test('When BleManager readRSSI is called it should call BleModule readRSSI', () => {
  bleManager.readRSSIForDevice('id')
  expect(Native.BleModule.readRSSIForDevice).toBeCalledWith('id', '2')
  bleManager.readRSSIForDevice('id', 'transaction')
  expect(Native.BleModule.readRSSIForDevice).toBeCalledWith('id', 'transaction')
})

test('When BleManager scans two devices it passes them to callback function', () => {
  Native.BleModule.emit(Native.BleModule.ScanEvent, [null, { id: '1' }])
  const listener = jest.fn()

  bleManager.startDeviceScan(null, null, listener)
  Native.BleModule.emit(Native.BleModule.ScanEvent, [null, { id: '2' }])
  Native.BleModule.emit(Native.BleModule.ScanEvent, [null, { id: '3' }])
  bleManager.stopDeviceScan()
  Native.BleModule.emit(Native.BleModule.ScanEvent, [null, { id: '4' }])

  expect(listener.mock.calls.length).toBe(2)
  expect(listener.mock.calls[0][0]).toBeFalsy()
  expect(listener.mock.calls[0][1].id).toBe('2')
  expect(listener.mock.calls[1][0]).toBeFalsy()
  expect(listener.mock.calls[1][1].id).toBe('3')
  expect(Native.BleModule.startDeviceScan).toBeCalled()
  expect(Native.BleModule.stopDeviceScan).toBeCalled()
})

test('When BleManager calls connectToDevice equivalent BleModule function should be called', async () => {
  Native.BleModule.connectToDevice = jest.fn().mockReturnValue(Promise.resolve({ id: 'id' }))
  expect(await bleManager.connectToDevice('id', {})).toBeInstanceOf(Device)
  expect(Native.BleModule.connectToDevice).toBeCalledWith('id', {})
  expect((await bleManager.connectToDevice('id', {})).id).toBe('id')
})

test('When BleManager calls cancelDeviceConnection equivalent BleModule function should be called', async () => {
  Native.BleModule.cancelDeviceConnection = jest.fn().mockReturnValue(Promise.resolve({ id: 'id' }))
  expect(await bleManager.cancelDeviceConnection('id')).toBeInstanceOf(Device)
  expect(Native.BleModule.cancelDeviceConnection).toBeCalledWith('id')
  expect((await bleManager.cancelDeviceConnection('id')).id).toBe('id')
})

test('BleManager monitors device disconnection properly', () => {
  const listener = jest.fn()

  Native.BleModule.emit(Native.BleModule.DisconnectionEvent, [null, { id: 'id' }])
  const subscription = bleManager.onDeviceDisconnected('id', listener)
  Native.BleModule.emit(Native.BleModule.DisconnectionEvent, [null, { id: 'id2' }])
  Native.BleModule.emit(Native.BleModule.DisconnectionEvent, [null, { id: 'id' }])
  subscription.remove()
  Native.BleModule.emit(Native.BleModule.DisconnectionEvent, [null, { id: 'id' }])

  expect(listener.mock.calls.length).toBe(1)
  expect(listener.mock.calls[0][0]).toBeFalsy()
  expect(listener.mock.calls[0][1]).toBeInstanceOf(Device)
  expect(listener.mock.calls[0][1].id).toBe('id')
})

test('BleManager calls BleModule isDeviceConnected function properly', async () => {
  Native.BleModule.isDeviceConnected = jest
    .fn()
    .mockReturnValueOnce(false)
    .mockReturnValueOnce(true)
  expect(await bleManager.isDeviceConnected('id')).toBe(false)
  expect(await bleManager.isDeviceConnected('id')).toBe(true)
  expect(Native.BleModule.isDeviceConnected.mock.calls.length).toBe(2)
})

test('BleManager properly calls BleModule discovery function', async () => {
  Native.BleModule.discoverAllServicesAndCharacteristicsForDevice = jest
    .fn()
    .mockReturnValueOnce(Promise.resolve({ id: 'id' }))
  const device = await bleManager.discoverAllServicesAndCharacteristicsForDevice('id')
  expect(device).toBeInstanceOf(Device)
  expect(device.id).toBe('id')
  expect(Native.BleModule.discoverAllServicesAndCharacteristicsForDevice).toBeCalledWith('id')
})

test('BleManager properly calls servicesForDevice BleModule function', async () => {
  Native.BleModule.servicesForDevice = jest
    .fn()
    .mockReturnValueOnce(Promise.resolve([{ uuid: 'a', deviceId: 'id' }, { uuid: 'b', deviceId: 'id' }]))
  const services = await bleManager.servicesForDevice('id')
  expect(services.length).toBe(2)
  expect(services[0]).toBeInstanceOf(Service)
  expect(services[1]).toBeInstanceOf(Service)
  expect(services[0].uuid).toBe('a')
  expect(services[1].uuid).toBe('b')
  expect(Native.BleModule.servicesForDevice).toBeCalledWith('id')
})

test('BleManager properly calls characteristicsForDevice BleModule function', async () => {
  Native.BleModule.characteristicsForDevice = jest
    .fn()
    .mockReturnValueOnce(Promise.resolve([{ uuid: 'a', deviceId: 'id' }, { uuid: 'b', deviceId: 'id' }]))
  const characteristics = await bleManager.characteristicsForDevice('id', 'aa')
  expect(characteristics.length).toBe(2)
  expect(characteristics[0]).toBeInstanceOf(Characteristic)
  expect(characteristics[1]).toBeInstanceOf(Characteristic)
  expect(characteristics[0].uuid).toBe('a')
  expect(characteristics[1].uuid).toBe('b')
  expect(Native.BleModule.characteristicsForDevice).toBeCalledWith('id', 'aa')
})

test('BleManager properly reads characteristic value', async () => {
  Native.BleModule.readCharacteristicForDevice = jest
    .fn()
    .mockReturnValueOnce(Promise.resolve({ uuid: 'aaaa', value: '=AA' }))
  const newCharacteristicValue = await bleManager.readCharacteristicForDevice('id', 'bbbb', 'aaaa', 'ok')
  expect(newCharacteristicValue).toBeInstanceOf(Characteristic)
  expect(newCharacteristicValue.uuid).toBe('aaaa')
  expect(newCharacteristicValue.value).toBe('=AA')
  expect(Native.BleModule.readCharacteristicForDevice).toBeCalledWith('id', 'bbbb', 'aaaa', 'ok')
})

test('BleManager properly writes characteristic value', async () => {
  Native.BleModule.writeCharacteristicForDevice = jest
    .fn()
    .mockReturnValue(Promise.resolve({ uuid: 'aaaa', value: '=AA' }))

  const options = [
    {
      response: true,
      function: bleManager.writeCharacteristicWithResponseForDevice.bind(bleManager)
    },
    {
      response: false,
      function: bleManager.writeCharacteristicWithoutResponseForDevice.bind(bleManager)
    }
  ]

  for (let option of options) {
    const characteristic = await option.function('id', 'aaaa', 'bbbb', '=AA', 'trans')
    expect(characteristic).toBeInstanceOf(Characteristic)
    expect(characteristic.uuid).toBe('aaaa')
    expect(characteristic.value).toBe('=AA')
    expect(Native.BleModule.writeCharacteristicForDevice).toBeCalledWith(
      'id',
      'aaaa',
      'bbbb',
      '=AA',
      option.response,
      'trans'
    )
  }
})

test('BleManager properly monitors characteristic value', async () => {
  const listener = jest.fn()
  Native.BleModule.monitorCharacteristicForDevice = jest.fn().mockReturnValue(Promise.resolve(null))

  Native.BleModule.emit(Native.BleModule.ReadEvent, [null, { id: 'a', value: 'a' }, 'id'])
  Native.BleModule.emit(Native.BleModule.ReadEvent, [null, { id: 'a', value: 'b' }, 'x'])
  const subscription = bleManager.monitorCharacteristicForDevice('id', 'aaaa', 'bbbb', listener, 'x')
  Native.BleModule.emit(Native.BleModule.ReadEvent, [null, { id: 'a', value: 'b' }, 'x'])
  Native.BleModule.emit(Native.BleModule.ReadEvent, [null, { id: 'a', value: 'b' }, 'x'])
  Native.BleModule.emit(Native.BleModule.ReadEvent, [null, { id: 'a', value: 'c' }, 'x2'])
  subscription.remove()
  expect(listener).toHaveBeenCalledTimes(2)
  expect(Native.BleModule.cancelTransaction).toBeCalledWith('x')
  expect(Native.BleModule.monitorCharacteristicForDevice).toBeCalledWith('id', 'aaaa', 'bbbb', 'x')
})

test('BleManager properly requests the MTU', async () => {
  bleManager.requestMTUForDevice('id', 99, 'trId')
  expect(Native.BleModule.requestMTUForDevice).toBeCalledWith('id', 99, 'trId')
})
