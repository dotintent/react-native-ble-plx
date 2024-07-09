import base64 from 'react-native-base64'
import { getDateUint8Array } from './getDateUint8Array'

export const getCurrentDateAsBase64 = () => {
  const date = new Date()
  const dateToSend = getDateUint8Array(
    date.getFullYear(),
    date.getMonth(),
    date.getDay(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds()
  )
  return base64.encodeFromByteArray(dateToSend)
}
