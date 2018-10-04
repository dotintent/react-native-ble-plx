jest.mock('../src/BleManager')
const { BleManager } = require('../src/BleManager')
const { Device } = require('../src/Device')

describe("Test if Device is properly calling BleManager's utility function: ", () => {
  const bleManager = new BleManager()
  const device = new Device({ id: 'id' }, bleManager)

  test('readRSSI', async () => {
    await device.readRSSI()
    expect(bleManager.readRSSIForDevice).toBeCalledWith('id', undefined)
    await device.readRSSI('transaction')
    expect(bleManager.readRSSIForDevice).toBeCalledWith('id', 'transaction')
  })

  test('connect', async () => {
    await device.connect({})
    expect(bleManager.connectToDevice).toBeCalledWith('id', {})
  })

  test('cancelConnection', async () => {
    await device.cancelConnection()
    expect(bleManager.cancelDeviceConnection).toBeCalledWith('id')
  })

  test('isConnected', async () => {
    await device.isConnected()
    expect(bleManager.isDeviceConnected).toBeCalledWith('id')
  })

  test('onDisconnected', async () => {
    const listener = jest.fn()
    await device.onDisconnected(listener)
    expect(bleManager.onDeviceDisconnected).toBeCalledWith('id', listener)
  })

  test('discoverAllServicesAndCharacteristics', async () => {
    await device.discoverAllServicesAndCharacteristics('transaction')
    expect(bleManager.discoverAllServicesAndCharacteristicsForDevice).toBeCalledWith('id', 'transaction')
  })

  test('services', async () => {
    await device.services()
    expect(bleManager.servicesForDevice).toBeCalledWith('id')
  })

  test('characteristicsForService', async () => {
    await device.characteristicsForService('aaaa')
    expect(bleManager.characteristicsForDevice).toBeCalledWith('id', 'aaaa')
  })

  test('readCharacteristicForService', async () => {
    await device.readCharacteristicForService('aaaa', 'bbbb', 'id')
    expect(bleManager.readCharacteristicForDevice).toBeCalledWith('id', 'aaaa', 'bbbb', 'id')
  })

  test('writeCharacteristicWithResponseForService', async () => {
    await device.writeCharacteristicWithResponseForService('aaaa', 'bbbb', 'value', 'id')
    expect(bleManager.writeCharacteristicWithResponseForDevice).toBeCalledWith('id', 'aaaa', 'bbbb', 'value', 'id')
  })

  test('writeCharacteristicWithoutResponseForService', async () => {
    await device.writeCharacteristicWithoutResponseForService('aaaa', 'bbbb', 'value', 'id')
    expect(bleManager.writeCharacteristicWithoutResponseForDevice).toBeCalledWith('id', 'aaaa', 'bbbb', 'value', 'id')
  })

  test('monitorCharacteristicForService', async () => {
    const listener = jest.fn()
    await device.monitorCharacteristicForService('aaaa', 'bbbb', listener, 'id')
    expect(bleManager.monitorCharacteristicForDevice).toBeCalledWith('id', 'aaaa', 'bbbb', listener, 'id')
  })

  test('BleManager properly requests the MTU', async () => {
    await device.requestMTU(24, 'tid')
    expect(bleManager.requestMTUForDevice).toBeCalledWith('id', 24, 'tid')
  })

  test('BleManager properly requests connection parameters', async () => {
    await device.requestConnectionPriority(1, 'tid')
    expect(bleManager.requestConnectionPriorityForDevice).toBeCalledWith('id', 1, 'tid')
  })
})
