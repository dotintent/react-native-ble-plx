import { fullUUID } from 'react-native-ble-plx'
import base64 from 'react-native-base64'
import { getDateAsBase64 } from '../utils/getDateAsBase64'

export const deviceTimeService = fullUUID('1847')
export const currentTimeCharacteristic = fullUUID('2A2B')
export const deviceTimeCharacteristic = fullUUID('2B90')
export const currentTimeCharacteristicTimeTriggerDescriptor = fullUUID('290E')

export const writeWithResponseBase64Time = getDateAsBase64(new Date('2022-08-11T08:17:19Z'))
export const writeWithoutResponseBase64Time = getDateAsBase64(new Date('2023-09-12T10:12:16Z'))
export const monitorExpectedMessage = 'Hi, it works!'
export const currentTimeCharacteristicTimeTriggerDescriptorValue = base64.encode('BLE-PLX')
