import { type ConfigPlugin, withAndroidManifest, AndroidConfig } from '@expo/config-plugins'

/**
 * Add foreground service permissions and service declaration to AndroidManifest.xml
 *
 * This enables background BLE operations on Android by:
 * 1. Adding FOREGROUND_SERVICE permission
 * 2. Adding FOREGROUND_SERVICE_CONNECTED_DEVICE permission (Android 14+)
 * 3. Declaring the BlePlxForegroundService in the manifest
 */
export const withBLEAndroidForegroundService: ConfigPlugin<{
  enableAndroidForegroundService: boolean
}> = (config, { enableAndroidForegroundService }) => {
  if (!enableAndroidForegroundService) {
    return config
  }

  return withAndroidManifest(config, config => {
    const androidManifest = config.modResults

    // Add foreground service permissions
    addForegroundServicePermissions(androidManifest)

    // Add the service declaration
    addForegroundServiceDeclaration(androidManifest)

    return config
  })
}

/**
 * Add FOREGROUND_SERVICE and FOREGROUND_SERVICE_CONNECTED_DEVICE permissions
 */
function addForegroundServicePermissions(
  androidManifest: AndroidConfig.Manifest.AndroidManifest
): void {
  const manifest = androidManifest.manifest

  if (!Array.isArray(manifest['uses-permission'])) {
    manifest['uses-permission'] = []
  }

  const permissions = manifest['uses-permission']

  // Add FOREGROUND_SERVICE permission
  const hasForegroundService = permissions.some(
    item => item.$?.['android:name'] === 'android.permission.FOREGROUND_SERVICE'
  )

  if (!hasForegroundService) {
    permissions.push({
      $: {
        'android:name': 'android.permission.FOREGROUND_SERVICE'
      }
    })
  }

  // Add FOREGROUND_SERVICE_CONNECTED_DEVICE permission (Android 14+)
  const hasForegroundServiceConnectedDevice = permissions.some(
    item => item.$?.['android:name'] === 'android.permission.FOREGROUND_SERVICE_CONNECTED_DEVICE'
  )

  if (!hasForegroundServiceConnectedDevice) {
    AndroidConfig.Manifest.ensureToolsAvailable(androidManifest)
    // Cast to any to add the tools:targetApi attribute
    permissions.push({
      $: {
        'android:name': 'android.permission.FOREGROUND_SERVICE_CONNECTED_DEVICE',
        'tools:targetApi': '34' // upside_down_cake = Android 14
      }
    } as AndroidConfig.Manifest.ManifestUsesPermission)
  }
}

/**
 * Add BlePlxForegroundService declaration to the application
 */
function addForegroundServiceDeclaration(
  androidManifest: AndroidConfig.Manifest.AndroidManifest
): void {
  const manifest = androidManifest.manifest

  // Ensure application array exists
  if (!Array.isArray(manifest.application)) {
    return
  }

  const application = manifest.application[0]
  if (!application) {
    return
  }

  // Initialize service array if needed - use type assertion for extended manifest
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const app = application as any
  if (!Array.isArray(app.service)) {
    app.service = []
  }

  // Check if service is already declared
  const serviceName = 'com.bleplx.BlePlxForegroundService'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serviceExists = app.service.some((service: any) => {
    const name = service.$?.['android:name']
    return name === serviceName || name === '.BlePlxForegroundService'
  })

  if (!serviceExists) {
    AndroidConfig.Manifest.ensureToolsAvailable(androidManifest)
    app.service.push({
      $: {
        'android:name': serviceName,
        'android:enabled': 'true',
        'android:exported': 'false',
        'android:foregroundServiceType': 'connectedDevice',
        'tools:targetApi': '29' // Android Q
      }
    })
  }
}

export default withBLEAndroidForegroundService
