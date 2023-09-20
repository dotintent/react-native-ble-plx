jest.mock('../src/BleManager')
const { BleManager } = require('../src/BleManager')
const { Descriptor } = require('../src/Descriptor')

describe("Test if Descriptor is properly calling BleManager's utility function:", () => {
  const bleManager = new BleManager()
  const descriptor = new Descriptor(
    {
      id: 'dId',
      uuid: 'uuid',
      characteristicUUID: 'characteristricUUID',
      serviceUUID: 'serviceUUID',
      deviceID: 'deviceId'
    },
    bleManager
  )

  test('read', async () => {
    await descriptor.read('id')
    expect(bleManager._readDescriptor).toBeCalledWith('dId', 'id')
  })

  test('write', async () => {
    await descriptor.write('value', 'id')
    expect(bleManager._writeDescriptor).toBeCalledWith('dId', 'value', 'id')
  })
})
