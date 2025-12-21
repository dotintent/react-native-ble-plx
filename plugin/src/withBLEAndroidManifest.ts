import { type ConfigPlugin, withAndroidManifest, AndroidConfig } from '@expo/config-plugins'

type InnerManifest = AndroidConfig.Manifest.AndroidManifest['manifest']
type ManifestPermission = InnerManifest['permission']

type ExtraTools = { 'tools:targetApi'?: string }
type ManifestUsesPermissionWithExtraTools = { $: AndroidConfig.Manifest.ManifestUsesPermission['$'] & ExtraTools }

type AndroidManifest = {
  manifest: InnerManifest & {
    permission?: ManifestPermission
    'uses-permission'?: ManifestUsesPermissionWithExtraTools[]
    'uses-permission-sdk-23'?: ManifestUsesPermissionWithExtraTools[]
    'uses-feature'?: InnerManifest['uses-feature']
    application?: { service?: any[] }[]
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
      config.modResults = addForegroundServiceToManifest(config.modResults)
    }
    return config
  })

export function addLocationPermissionToManifest(androidManifest: AndroidManifest, neverForLocationSinceSdk31: boolean) {
  if (!Array.isArray(androidManifest.manifest['uses-permission-sdk-23'])) {
    androidManifest.manifest['uses-permission-sdk-23'] = []
  }

  const optMaxSdkVersion = neverForLocationSinceSdk31 ? { 'android:maxSdkVersion': '30' } : {}

  const permissions = androidManifest.manifest['uses-permission-sdk-23']
  
  if (!permissions.find(item => item.$['android:name'] === 'android.permission.ACCESS_FINE_LOCATION')) {
    permissions.push({ $: { 'android:name': 'android.permission.ACCESS_FINE_LOCATION', ...optMaxSdkVersion } })
  }

  return androidManifest
}

export function addScanPermissionToManifest(androidManifest: AndroidManifest, neverForLocation: boolean) {
  if (!Array.isArray(androidManifest.manifest['uses-permission'])) {
    androidManifest.manifest['uses-permission'] = []
  }

  const permissions = androidManifest.manifest['uses-permission']
  
  if (!permissions.find(item => item.$['android:name'] === 'android.permission.BLUETOOTH_SCAN')) {
    AndroidConfig.Manifest.ensureToolsAvailable(androidManifest)
    permissions.push({
      $: {
        'android:name': 'android.permission.BLUETOOTH_SCAN',
        ...(neverForLocation ? { 'android:usesPermissionFlags': 'neverForLocation' } : {}),
        'tools:targetApi': '31'
      }
    })
  }
  return androidManifest
}

export function addBLEHardwareFeatureToManifest(androidManifest: AndroidConfig.Manifest.AndroidManifest) {
  if (!Array.isArray(androidManifest.manifest['uses-feature'])) {
    androidManifest.manifest['uses-feature'] = []
  }

  if (!androidManifest.manifest['uses-feature'].find(item => item.$['android:name'] === 'android.hardware.bluetooth_le')) {
    androidManifest.manifest['uses-feature'].push({
      $: { 'android:name': 'android.hardware.bluetooth_le', 'android:required': 'true' }
    })
  }
  return androidManifest
}

export function addForegroundServiceToManifest(androidManifest: any) {
  const application = androidManifest.manifest.application?.[0]
  if (!application) return androidManifest

  if (!Array.isArray(application.service)) {
    application.service = []
  }

  const serviceName = '.service.BleScanForegroundService'
  if (!application.service.find((s: any) => s.$?.['android:name'] === serviceName)) {
    application.service.push({
      $: {
        'android:name': serviceName,
        'android:enabled': 'true',
        'android:exported': 'false',
        'android:foregroundServiceType': 'connectedDevice'
      }
    })
  }

  return androidManifest
}
