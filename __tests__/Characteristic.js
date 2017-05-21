jest.mock('../src/BleManager')
import { BleManager } from '../src/BleManager'
import { Characteristic } from '../src/Characteristic'

describe("Test if Device is properly calling BleManager's utility function: ", () => {
  const bleManager = new BleManager()
  const characteristic = new Characteristic({ uuid: 'bbbb', serviceUUID: 'aaaa', deviceID: 'id' }, bleManager)

  test('read', async () => {
    await characteristic.read('id')
    expect(bleManager.readCharacteristicForDevice).toBeCalledWith('id', 'aaaa', 'bbbb', 'id')
  })

  test('writeWithResponse', async () => {
    await characteristic.writeWithResponse('value', 'id')
    expect(bleManager.writeCharacteristicWithResponseForDevice).toBeCalledWith('id', 'aaaa', 'bbbb', 'value', 'id')
  })

  test('writeWithoutResponse', async () => {
    await characteristic.writeWithoutResponse('value', 'id')
    expect(bleManager.writeCharacteristicWithoutResponseForDevice).toBeCalledWith('id', 'aaaa', 'bbbb', 'value', 'id')
  })

  test('monitor', async () => {
    const listener = jest.fn()
    await characteristic.monitor(listener, 'id')
    expect(bleManager.monitorCharacteristicForDevice).toBeCalledWith('id', 'aaaa', 'bbbb', listener, 'id')
  })
})
