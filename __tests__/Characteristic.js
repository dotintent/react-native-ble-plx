jest.mock('../src/BleManager')
const { BleManager } = require('../src/BleManager')
const { Characteristic } = require('../src/Characteristic')

describe("Test if Characteristic is properly calling BleManager's utility function: ", () => {
  const bleManager = new BleManager()
  const characteristic = new Characteristic(
    { id: 'cId', uuid: 'uuid', serviceUUID: 'serviceUUID', deviceID: 'deviceId' },
    bleManager
  )

  test('descriptors', async () => {
    await characteristic.descriptors()
    expect(bleManager._descriptorsForCharacteristic).toBeCalledWith('cId')
  })

  test('read', async () => {
    await characteristic.read('id')
    expect(bleManager._readCharacteristic).toBeCalledWith('cId', 'id')
  })

  test('writeWithResponse', async () => {
    await characteristic.writeWithResponse('value', 'id')
    expect(bleManager._writeCharacteristicWithResponse).toBeCalledWith('cId', 'value', 'id')
  })

  test('writeWithoutResponse', async () => {
    await characteristic.writeWithoutResponse('value', 'id')
    expect(bleManager._writeCharacteristicWithoutResponse).toBeCalledWith('cId', 'value', 'id')
  })

  test('monitor', async () => {
    const listener = jest.fn()
    await characteristic.monitor(listener, 'id')
    expect(bleManager._monitorCharacteristic).toBeCalledWith('cId', listener, 'id')
  })

  test('readDescriptor', async () => {
    await characteristic.readDescriptor('uuid', 'transId')
    expect(bleManager._readDescriptorForCharacteristic).toBeCalledWith('cId', 'uuid', 'transId')
  })

  test('writeDescriptor', async () => {
    await characteristic.writeDescriptor('uuid', 'value', 'transId')
    expect(bleManager._writeDescriptorForCharacteristic).toBeCalledWith('cId', 'uuid', 'value', 'transId')
  })
})
