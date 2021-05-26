/* eslint-disable flowtype/no-types-missing-file-annotation */

import { AndroidConfig, ConfigPlugin, createRunOncePlugin } from '@expo/config-plugins'

import { withBLEAndroidManifest } from './withBLEAndroidManifest'
import { BackgroundMode, withBLEBackgroundModes } from './withBLEBackgroundModes'
import { withBluetoothAlwaysPermission } from './withBluetoothAlwaysPermission'

const pkg = require('react-native-ble-plx/package.json')

/**
 * Apply BLE configuration for Expo SDK 41 projects.
 */
const withBLE: ConfigPlugin<{
  isBackgroundEnabled?: boolean,
  modes?: BackgroundMode[],
  bluetoothAlwaysPermission?: string | false
} | void> = (config, props = {}) => {
  const _props = props || {}
  const isBackgroundEnabled = _props.isBackgroundEnabled ?? false

  // iOS
  config = withBluetoothAlwaysPermission(config, _props)
  config = withBLEBackgroundModes(config, _props.modes || [])

  // Android
  config = AndroidConfig.Permissions.withPermissions(config, [
    'android.permission.BLUETOOTH',
    'android.permission.BLUETOOTH_ADMIN'
  ])
  config = withBLEAndroidManifest(config, { isBackgroundEnabled })

  return config
}

export { BackgroundMode }

export default createRunOncePlugin(withBLE, pkg.name, pkg.version)
