import { AndroidConfig, type ConfigPlugin, createRunOncePlugin } from '@expo/config-plugins'

import { withBLEAndroidManifest } from './withBLEAndroidManifest'
import { BackgroundMode, withBLEBackgroundModes } from './withBLEBackgroundModes'
import { withBluetoothPermissions } from './withBluetoothPermissions'

const pkg = { name: 'react-native-ble-plx', version: '4.0.0' }

const withBLE: ConfigPlugin<{
  isBackgroundEnabled?: boolean
  neverForLocation?: boolean
  modes?: BackgroundMode[]
  bluetoothAlwaysPermission?: string | false
} | void> = (config, props = {}) => {
  const _props = props || {}
  const isBackgroundEnabled = _props.isBackgroundEnabled ?? false
  const neverForLocation = _props.neverForLocation ?? false

  config = withBluetoothPermissions(config, _props)
  config = withBLEBackgroundModes(config, _props.modes || [])

  config = AndroidConfig.Permissions.withPermissions(config, [
    'android.permission.BLUETOOTH_SCAN',
    'android.permission.BLUETOOTH_CONNECT',
    'android.permission.BLUETOOTH_ADVERTISE',
    ...(isBackgroundEnabled ? [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_CONNECTED_DEVICE',
      'android.permission.POST_NOTIFICATIONS'
    ] : [])
  ])
  
  config = withBLEAndroidManifest(config, { isBackgroundEnabled, neverForLocation })

  return config
}

export { BackgroundMode }
export default createRunOncePlugin(withBLE, pkg.name, pkg.version)
