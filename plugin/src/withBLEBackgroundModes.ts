import { ConfigPlugin, withInfoPlist } from '@expo/config-plugins'

export enum BackgroundMode {
  Central = 'central',
  Peripheral = 'peripheral'
}

function ensureKey(arr: string[], key: string) {
  if (!arr.find(mode => mode === key)) {
    arr.push(key)
  }
  return arr
}

const centralKey = 'bluetooth-central'
const peripheralKey = 'bluetooth-peripheral'

/**
 * Append `UIBackgroundModes` to the `Info.plist`.
 */
export const withBLEBackgroundModes: ConfigPlugin<BackgroundMode[]> = (c, modes) =>
  withInfoPlist(c, config => {
    if (!Array.isArray(config.modResults.UIBackgroundModes)) {
      config.modResults.UIBackgroundModes = []
    }

    if (modes.includes(BackgroundMode.Central)) {
      config.modResults.UIBackgroundModes = ensureKey(config.modResults.UIBackgroundModes, centralKey)
    }
    if (modes.includes(BackgroundMode.Peripheral)) {
      config.modResults.UIBackgroundModes = ensureKey(config.modResults.UIBackgroundModes, peripheralKey)
    }

    // Prevent empty array
    if (!config.modResults.UIBackgroundModes.length) {
      delete config.modResults.UIBackgroundModes
    }

    return config
  })
