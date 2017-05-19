// @flow
'use strict'

/**
 * Converts UUID to full 128bit, lowercase format which should be used to compare UUID values.
 * 
 * @export
 * @param {string} uuid 16bit, 32bit or 128bit UUID.
 * @returns {string} 128bit lowercase UUID.
 */
export function fullUUID(uuid: string): string {
  if (uuid.length === 4) return '0000' + uuid.toLowerCase() + '-0000-1000-8000-00805f9b34fb'
  if (uuid.length === 8) return uuid.toLowerCase() + '-0000-1000-8000-00805f9b34fb'
  return uuid.toLowerCase()
}
