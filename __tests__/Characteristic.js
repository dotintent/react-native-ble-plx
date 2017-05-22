jest.mock('../src/BleManager')
import { BleManager } from '../src/BleManager'
import { Characteristic } from '../src/Characteristic'

describe("Test if Characteristic is properly calling BleManager's utility function: ", () => {
  const bleManager = new BleManager()
  const characteristic = new Characteristic(
    { id: 'cId', uuid: 'uuid', serviceUUID: 'serviceUUID', deviceID: 'deviceId' },
    bleManager
  )

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
})
