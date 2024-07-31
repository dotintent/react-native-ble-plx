import { ConnectionPriority, LogLevel } from 'react-native-ble-plx'
import { BLEService } from '../../../services'
import { deviceTimeCharacteristic, deviceTimeService } from '../../../consts/nRFDeviceConsts'

const TEST_DEVICE_ID = '5F:0A:E8:F1:11:11'

export const functionsToTest: { name: string; functionToCall: () => Promise<any> }[] = [
  {
    name: 'setLogLevel',
    functionToCall: () => BLEService.manager.setLogLevel(LogLevel.Verbose)
  },
  {
    name: 'cancelTransaction',
    functionToCall: () => BLEService.manager.cancelTransaction('transactionId')
  },
  {
    name: 'state',
    functionToCall: () => BLEService.manager.state()
  },
  {
    name: 'startDeviceScan',
    functionToCall: () => BLEService.manager.startDeviceScan(null, null, () => {})
  },
  {
    name: 'stopDeviceScan',
    functionToCall: () => BLEService.manager.stopDeviceScan()
  },
  {
    name: 'requestConnectionPriorityForDevice',
    functionToCall: () => BLEService.manager.requestConnectionPriorityForDevice(TEST_DEVICE_ID, ConnectionPriority.High)
  },
  {
    name: 'readRSSIForDevice',
    functionToCall: () => BLEService.manager.readRSSIForDevice(TEST_DEVICE_ID)
  },
  {
    name: 'requestMTUForDevice',
    functionToCall: () => BLEService.manager.requestMTUForDevice(TEST_DEVICE_ID, 300)
  },
  {
    name: 'devices',
    functionToCall: () => BLEService.manager.devices([TEST_DEVICE_ID])
  },
  {
    name: 'connectedDevices',
    functionToCall: () => BLEService.manager.connectedDevices([deviceTimeService])
  },
  {
    name: 'connectToDevice',
    functionToCall: () => BLEService.manager.connectToDevice(TEST_DEVICE_ID)
  },
  {
    name: 'cancelDeviceConnection',
    functionToCall: () => BLEService.manager.cancelDeviceConnection(TEST_DEVICE_ID)
  },
  {
    name: 'isDeviceConnected',
    functionToCall: () => BLEService.manager.isDeviceConnected(TEST_DEVICE_ID)
  },
  {
    name: 'discoverAllServicesAndCharacteristicsForDevice',
    functionToCall: () => BLEService.manager.discoverAllServicesAndCharacteristicsForDevice(TEST_DEVICE_ID)
  },
  {
    name: 'servicesForDevice',
    functionToCall: () => BLEService.manager.servicesForDevice(TEST_DEVICE_ID)
  },
  {
    name: 'characteristicsForDevice',
    functionToCall: () => BLEService.manager.characteristicsForDevice(TEST_DEVICE_ID, deviceTimeService)
  },
  {
    name: 'descriptorsForDevice',
    functionToCall: () =>
      BLEService.manager.descriptorsForDevice(TEST_DEVICE_ID, deviceTimeService, deviceTimeCharacteristic)
  },
  {
    name: 'readCharacteristicForDevice',
    functionToCall: () =>
      BLEService.manager.readCharacteristicForDevice(TEST_DEVICE_ID, deviceTimeService, deviceTimeCharacteristic)
  },
  {
    name: 'writeCharacteristicWithResponseForDevice',
    functionToCall: () =>
      BLEService.manager.writeCharacteristicWithResponseForDevice(
        TEST_DEVICE_ID,
        deviceTimeService,
        deviceTimeCharacteristic,
        'base64Value'
      )
  },
  {
    name: 'writeCharacteristicWithoutResponseForDevice',
    functionToCall: () =>
      BLEService.manager.writeCharacteristicWithoutResponseForDevice(
        TEST_DEVICE_ID,
        deviceTimeService,
        deviceTimeCharacteristic,
        'base64Value'
      )
  },
  {
    name: 'readDescriptorForDevice',
    functionToCall: () =>
      BLEService.manager.readDescriptorForDevice(
        TEST_DEVICE_ID,
        deviceTimeService,
        deviceTimeCharacteristic,
        deviceTimeCharacteristic
      )
  },
  {
    name: 'writeDescriptorForDevice',
    functionToCall: () =>
      BLEService.manager.writeDescriptorForDevice(
        TEST_DEVICE_ID,
        deviceTimeService,
        deviceTimeCharacteristic,
        deviceTimeCharacteristic,
        'Base64'
      )
  },
  {
    name: 'disable',
    functionToCall: () => BLEService.manager.disable()
  },
  {
    name: 'enable',
    functionToCall: () => BLEService.manager.enable()
  }
] as const
