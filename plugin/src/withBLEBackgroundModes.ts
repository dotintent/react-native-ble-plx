import { type ConfigPlugin, withInfoPlist } from '@expo/config-plugins'

export enum BackgroundMode {
  Central = 'central',
  Peripheral = 'peripheral'
}

const ensureKey = (arr: string[], key: string) => arr.includes(key) ? arr : [...arr, key]

export const withBLEBackgroundModes: ConfigPlugin<BackgroundMode[]> = (c, modes) =>
  withInfoPlist(c, config => {
    if (!Array.isArray(config.modResults.UIBackgroundModes)) {
      config.modResults.UIBackgroundModes = []
    }

    let bgModes = config.modResults.UIBackgroundModes

    if (modes.includes(BackgroundMode.Central)) {
      bgModes = ensureKey(bgModes, 'bluetooth-central')
    }
    if (modes.includes(BackgroundMode.Peripheral)) {
      bgModes = ensureKey(bgModes, 'bluetooth-peripheral')
    }

    config.modResults.UIBackgroundModes = bgModes.length ? bgModes : undefined
    return config
  })
