
import { Platform } from 'react-native'
import type { UUID } from './TypeDefinition'

/**
 * Converts UUID to full 128bit, lowercase format which should be used to compare UUID values.
 *
 * @param {UUID} uuid 16bit, 32bit or 128bit UUID.
 * @returns {UUID} 128bit lowercase UUID.
 */
export function fullUUID(uuid: UUID): UUID {
  if (uuid.length === 4) {
    return '0000' + uuid.toLowerCase() + '-0000-1000-8000-00805f9b34fb'
  }
  if (uuid.length === 8) {
    return uuid.toLowerCase() + '-0000-1000-8000-00805f9b34fb'
  }
  return uuid.toLowerCase()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fillStringWithArguments(value: string, object: any): string {
  return value.replace(/\{([^}]+)\}/g, function (_, arg: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return object[arg] || '?'
  })
}

export const isIOS = Platform.OS === 'ios'
