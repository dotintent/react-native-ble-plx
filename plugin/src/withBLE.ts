import { AndroidConfig, type ConfigPlugin, createRunOncePlugin, WarningAggregator, withInfoPlist } from '@expo/config-plugins'
// eslint-disable-next-line @typescript-eslint/no-var-requires
// Path is ../../package.json because this file is compiled to plugin/build/withBLE.js
const pkg = require('../../package.json')
import { withBLEAndroidManifest } from './withBLEAndroidManifest'
import { BackgroundMode, withBLEBackgroundModes } from './withBLEBackgroundModes'
import { withBluetoothPermissions } from './withBluetoothPermissions'
import { withBLERestorationPodfile } from './withBLERestorationPodfile'

/**
 * Apply BLE native configuration.
 */
const withBLE: ConfigPlugin<
  {
    isBackgroundEnabled?: boolean
    neverForLocation?: boolean
    modes?: BackgroundMode[]
    bluetoothAlwaysPermission?: string | false
    /** Enable iOS BLE state restoration support (Restoration subspec) */
    iosEnableRestoration?: boolean
    /** Optional custom restoration identifier passed to iOS central manager */
    iosRestorationIdentifier?: string
  } | void
> = (config, props = {}) => {
  console.log('[BLEPLX_PLUGIN] Plugin running with props:', JSON.stringify(props))
  console.log('[BLEPLX_PLUGIN] Package name from pkg.json:', pkg.name)

  const _props = props || {}
  const isBackgroundEnabled = _props.isBackgroundEnabled ?? false
  const neverForLocation = _props.neverForLocation ?? false
  const iosEnableRestoration = _props.iosEnableRestoration ?? false
  const iosRestorationIdentifier = _props.iosRestorationIdentifier ?? 'com.reactnativebleplx.restore'

  console.log('[BLEPLX_PLUGIN] iosEnableRestoration:', iosEnableRestoration)

  if ('bluetoothPeripheralPermission' in _props) {
    WarningAggregator.addWarningIOS(
      'bluetoothPeripheralPermission',
      `The iOS permission \`NSBluetoothPeripheralUsageDescription\` is fully deprecated as of iOS 13 (lowest iOS version in Expo SDK 47+). Remove the \`bluetoothPeripheralPermission\` property from the \`@config-plugins/react-native-ble-plx\` config plugin.`
    )
  }

  // iOS
  config = withBluetoothPermissions(config, _props)
  config = withBLEBackgroundModes(config, _props.modes || [])

  if (iosEnableRestoration) {
    console.log('[BLEPLX_PLUGIN] ✓ iosEnableRestoration is TRUE - adding Restoration subspec')
    console.log('[BLEPLX_PLUGIN] Setting BlePlxRestoreIdentifier in Info.plist:', iosRestorationIdentifier)

    // Persist the identifier in Info.plist so the Swift adapter can read it
    config = withInfoPlist(config, conf => {
      conf.modResults.BlePlxRestoreIdentifier = iosRestorationIdentifier
      return conf
    })

    console.log('[BLEPLX_PLUGIN] Calling withBLERestorationPodfile with pkgName:', pkg.name)
    // Inject Restoration subspec into Podfile
    config = withBLERestorationPodfile(config, { pkgName: pkg.name })
  } else {
    console.log('[BLEPLX_PLUGIN] ✗ iosEnableRestoration is FALSE - skipping Restoration subspec')
  }

  // Android
  config = AndroidConfig.Permissions.withPermissions(config, [
    'android.permission.BLUETOOTH',
    'android.permission.BLUETOOTH_ADMIN',
    'android.permission.BLUETOOTH_CONNECT' // since Android SDK 31
  ])
  config = withBLEAndroidManifest(config, {
    isBackgroundEnabled,
    neverForLocation
  })

  return config
}

export { BackgroundMode }

export default createRunOncePlugin(withBLE, pkg.name, pkg.version)
