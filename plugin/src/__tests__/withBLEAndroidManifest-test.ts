import { AndroidConfig, XML } from '@expo/config-plugins'
import { resolve } from 'path'

import {
  addLocationPermissionToManifest,
  addScanPermissionToManifest,
  addBLEHardwareFeatureToManifest
} from '../withBLEAndroidManifest'

const { readAndroidManifestAsync } = AndroidConfig.Manifest

const sampleManifestPath = resolve(__dirname, 'fixtures/AndroidManifest.xml')

describe('addLocationPermissionToManifest', () => {
  it(`adds elements`, async () => {
    let androidManifest = await readAndroidManifestAsync(sampleManifestPath)
    androidManifest = addLocationPermissionToManifest(androidManifest, false)
    expect(androidManifest.manifest['uses-permission-sdk-23']).toContainEqual({
      $: {
        'android:name': 'android.permission.ACCESS_COARSE_LOCATION'
      }
    })
    expect(androidManifest.manifest['uses-permission-sdk-23']).toContainEqual({
      $: {
        'android:name': 'android.permission.ACCESS_FINE_LOCATION'
      }
    })
    // Sanity
    expect(XML.format(androidManifest)).toMatch(
      /<uses-permission-sdk-23 android:name="android\.permission\.ACCESS_COARSE_LOCATION"\/>/
    )
    expect(XML.format(androidManifest)).toMatch(
      /<uses-permission-sdk-23 android:name="android\.permission\.ACCESS_FINE_LOCATION"\/>/
    )
  })
  it(`adds elements with SDK limit`, async () => {
    let androidManifest = await readAndroidManifestAsync(sampleManifestPath)
    androidManifest = addLocationPermissionToManifest(androidManifest, true)
    expect(androidManifest.manifest['uses-permission-sdk-23']).toContainEqual({
      $: {
        'android:name': 'android.permission.ACCESS_COARSE_LOCATION',
        'android:maxSdkVersion': '30'
      }
    })
    expect(androidManifest.manifest['uses-permission-sdk-23']).toContainEqual({
      $: {
        'android:name': 'android.permission.ACCESS_FINE_LOCATION',
        'android:maxSdkVersion': '30'
      }
    })
    // Sanity
    expect(XML.format(androidManifest)).toMatch(
      /<uses-permission-sdk-23 android:name="android\.permission\.ACCESS_COARSE_LOCATION" android:maxSdkVersion="30"\/>/
    )
    expect(XML.format(androidManifest)).toMatch(
      /<uses-permission-sdk-23 android:name="android\.permission\.ACCESS_FINE_LOCATION" android:maxSdkVersion="30"\/>/
    )
  })
})

describe('addScanPermissionToManifest', () => {
  it(`adds element`, async () => {
    let androidManifest = await readAndroidManifestAsync(sampleManifestPath)
    androidManifest = addScanPermissionToManifest(androidManifest, false)
    expect(androidManifest.manifest['uses-permission']).toContainEqual({
      $: {
        'android:name': 'android.permission.BLUETOOTH_SCAN',
        'tools:targetApi': '31'
      }
    })
    // Sanity
    expect(XML.format(androidManifest)).toMatch(
      /<uses-permission android:name="android\.permission\.BLUETOOTH_SCAN" tools:targetApi="31"\/>/
    )
  })
  it(`adds element with 'neverForLocation' attribute`, async () => {
    let androidManifest = await readAndroidManifestAsync(sampleManifestPath)
    androidManifest = addScanPermissionToManifest(androidManifest, true)
    expect(androidManifest.manifest['uses-permission']).toContainEqual({
      $: {
        'android:name': 'android.permission.BLUETOOTH_SCAN',
        'android:usesPermissionFlags': 'neverForLocation',
        'tools:targetApi': '31'
      }
    })
    // Sanity
    expect(XML.format(androidManifest)).toMatch(
      /<uses-permission android:name="android\.permission\.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" tools:targetApi="31"\/>/
    )
  })
})

describe('addBLEHardwareFeatureToManifest', () => {
  it(`adds element`, async () => {
    let androidManifest = await readAndroidManifestAsync(sampleManifestPath)
    androidManifest = addBLEHardwareFeatureToManifest(androidManifest)

    expect(androidManifest.manifest['uses-feature']).toStrictEqual([
      {
        $: {
          'android:name': 'android.hardware.bluetooth_le',
          'android:required': 'true'
        }
      }
    ])
    // Sanity
    expect(XML.format(androidManifest)).toMatch(
      /<uses-feature android:name="android\.hardware\.bluetooth_le" android:required="true"\/>/
    )
  })
})
jest.mock('expo/config', () => ({
  getNameFromConfig: () => ({ appName: 'App', webName: 'App' }),
  getConfig: () => ({ exp: { name: 'App', slug: 'app', web: {}, ios: {}, android: {} } })
}))
