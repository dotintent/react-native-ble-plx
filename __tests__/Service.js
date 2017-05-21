jest.mock('../src/BleManager')
import { BleManager } from '../src/BleManager'
import { Service } from '../src/Service'

describe("Test if Device is properly calling BleManager's utility function: ", () => {
  const bleManager = new BleManager()
  const service = new Service({ uuid: 'aaaa', deviceID: 'id' }, bleManager)

  test('characteristics', async () => {
    await service.characteristics()
    expect(bleManager.characteristicsForDevice).toBeCalledWith('id', 'aaaa')
  })

  test('readCharacteristic', async () => {
    await service.readCharacteristic('bbbb', 'id')
    expect(bleManager.readCharacteristicForDevice).toBeCalledWith('id', 'aaaa', 'bbbb', 'id')
  })

  test('writeCharacteristicWithResponse', async () => {
    await service.writeCharacteristicWithResponse('bbbb', 'value', 'id')
    expect(bleManager.writeCharacteristicWithResponseForDevice).toBeCalledWith('id', 'aaaa', 'bbbb', 'value', 'id')
  })

  test('writeCharacteristicWithoutResponse', async () => {
    await service.writeCharacteristicWithoutResponse('bbbb', 'value', 'id')
    expect(bleManager.writeCharacteristicWithoutResponseForDevice).toBeCalledWith('id', 'aaaa', 'bbbb', 'value', 'id')
  })

  test('monitorCharacteristic', async () => {
    const listener = jest.fn()
    await service.monitorCharacteristic('bbbb', listener, 'id')
    expect(bleManager.monitorCharacteristicForDevice).toBeCalledWith('id', 'aaaa', 'bbbb', listener, 'id')
  })
})
