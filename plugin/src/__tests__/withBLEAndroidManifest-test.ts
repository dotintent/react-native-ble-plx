import { AndroidConfig, XML } from '@expo/config-plugins'

import { resolve } from 'path'

import { addBLEHardwareFeatureToManifest, addFineControlPermissionToManifest } from '../withBLEAndroidManifest'

const { readAndroidManifestAsync } = AndroidConfig.Manifest

const sampleManifestPath = resolve(__dirname, 'fixtures/AndroidManifest.xml')

describe('addFineControlPermissionToManifest', () => {
  it(`adds element`, async () => {
    let androidManifest = await readAndroidManifestAsync(sampleManifestPath)
    androidManifest = await addFineControlPermissionToManifest(androidManifest)
    expect(androidManifest.manifest['uses-permission-sdk-23']).toStrictEqual([
      { $: { 'android:name': 'android.permission.ACCESS_FINE_LOCATION' } }
    ])
    // Sanity
    expect(XML.format(androidManifest)).toMatch(
      /<uses-permission-sdk-23 android:name="android\.permission\.ACCESS_FINE_LOCATION"\/>/
    )
  })
})
describe('addBLEHardwareFeatureToManifest', () => {
  it(`adds element`, async () => {
    let androidManifest = await readAndroidManifestAsync(sampleManifestPath)
    androidManifest = await addBLEHardwareFeatureToManifest(androidManifest)

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
