import { ConfigPlugin, withAndroidManifest, AndroidConfig } from '@expo/config-plugins'

type InnerManifest = AndroidConfig.Manifest.AndroidManifest['manifest']

type ManifestPermission = InnerManifest['permission']

// TODO: add to `AndroidManifestAttributes` in @expo/config-plugins
type ExtraTools = {
  // https://developer.android.com/studio/write/tool-attributes#toolstargetapi
  'tools:targetApi'?: string
}

type ManifestUsesPermissionWithExtraTools = {
  $: AndroidConfig.Manifest.ManifestUsesPermission['$'] & ExtraTools
}

type AndroidManifest = {
  manifest: InnerManifest & {
    permission?: ManifestPermission
    'uses-permission'?: ManifestUsesPermissionWithExtraTools[]
    'uses-permission-sdk-23'?: ManifestUsesPermissionWithExtraTools[]
    'uses-feature'?: InnerManifest['uses-feature']
  }
}

export const withBLEAndroidManifest: ConfigPlugin<{
  isBackgroundEnabled: boolean
  neverForLocation: boolean
}> = (config, { isBackgroundEnabled, neverForLocation }) =>
  withAndroidManifest(config, config => {
    config.modResults = addLocationPermissionToManifest(config.modResults, neverForLocation)
    config.modResults = addScanPermissionToManifest(config.modResults, neverForLocation)
    if (isBackgroundEnabled) {
      config.modResults = addBLEHardwareFeatureToManifest(config.modResults)
    }
    return config
  })

/**
 * Add location permissions
 *  - 'android.permission.ACCESS_COARSE_LOCATION' for Android SDK 28 (Android 9) and lower
 *  - 'android.permission.ACCESS_FINE_LOCATION' for Android SDK 29 (Android 10) and higher.
 *    From Android SDK 31 (Android 12) it might not be required if BLE is not used for location.
 */
export function addLocationPermissionToManifest(androidManifest: AndroidManifest, neverForLocationSinceSdk31: boolean) {
  if (!Array.isArray(androidManifest.manifest['uses-permission-sdk-23'])) {
    androidManifest.manifest['uses-permission-sdk-23'] = []
  }

  const optMaxSdkVersion = neverForLocationSinceSdk31
    ? {
        'android:maxSdkVersion': '30'
      }
    : {}

  if (
    !androidManifest.manifest['uses-permission-sdk-23'].find(
      item => item.$['android:name'] === 'android.permission.ACCESS_COARSE_LOCATION'
    )
  ) {
    androidManifest.manifest['uses-permission-sdk-23'].push({
      $: {
        'android:name': 'android.permission.ACCESS_COARSE_LOCATION',
        ...optMaxSdkVersion
      }
    })
  }

  if (
    !androidManifest.manifest['uses-permission-sdk-23'].find(
      item => item.$['android:name'] === 'android.permission.ACCESS_FINE_LOCATION'
    )
  ) {
    androidManifest.manifest['uses-permission-sdk-23'].push({
      $: {
        'android:name': 'android.permission.ACCESS_FINE_LOCATION',
        ...optMaxSdkVersion
      }
    })
  }

  return androidManifest
}

/**
 * Add 'android.permission.BLUETOOTH_SCAN'.
 * Required since Android SDK 31 (Android 12).
 */
export function addScanPermissionToManifest(androidManifest: AndroidManifest, neverForLocation: boolean) {
  if (!Array.isArray(androidManifest.manifest['uses-permission'])) {
    androidManifest.manifest['uses-permission'] = []
  }

  if (
    !androidManifest.manifest['uses-permission'].find(
      item => item.$['android:name'] === 'android.permission.BLUETOOTH_SCAN'
    )
  ) {
    AndroidConfig.Manifest.ensureToolsAvailable(androidManifest)
    androidManifest.manifest['uses-permission']?.push({
      $: {
        'android:name': 'android.permission.BLUETOOTH_SCAN',
        ...(neverForLocation
          ? {
              'android:usesPermissionFlags': 'neverForLocation'
            }
          : {}),
        'tools:targetApi': '31'
      }
    })
  }
  return androidManifest
}

// Add this line if your application always requires BLE. More info can be found on: https://developer.android.com/guide/topics/connectivity/bluetooth-le.html#permissions
export function addBLEHardwareFeatureToManifest(androidManifest: AndroidConfig.Manifest.AndroidManifest) {
  // Add `<uses-feature android:name="android.hardware.bluetooth_le" android:required="true"/>` to the AndroidManifest.xml
  if (!Array.isArray(androidManifest.manifest['uses-feature'])) {
    androidManifest.manifest['uses-feature'] = []
  }

  if (
    !androidManifest.manifest['uses-feature'].find(item => item.$['android:name'] === 'android.hardware.bluetooth_le')
  ) {
    androidManifest.manifest['uses-feature']?.push({
      $: {
        'android:name': 'android.hardware.bluetooth_le',
        'android:required': 'true'
      }
    })
  }
  return androidManifest
}
