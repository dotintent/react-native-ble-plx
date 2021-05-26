/* eslint-disable flowtype/no-types-missing-file-annotation */

import {
  ConfigPlugin,
  withAndroidManifest,
  AndroidConfig,
} from "@expo/config-plugins";

type InnerManifest = AndroidConfig.Manifest.AndroidManifest['manifest'];

type ManifestPermission = InnerManifest["permission"];

type AndroidManifest = {
  manifest: InnerManifest & {
    permission?: ManifestPermission;
    "uses-permission"?: InnerManifest["uses-permission"];
    "uses-permission-sdk-23"?: InnerManifest["uses-permission"];
    "uses-feature"?: InnerManifest["uses-feature"];
  };
};

export const withBLEAndroidManifest: ConfigPlugin<{
  isBackgroundEnabled: boolean;
}> = (config, { isBackgroundEnabled }) => {
  return withAndroidManifest(config, (config) => {
    config.modResults = addFineControlPermissionToManifest(config.modResults);
    if (isBackgroundEnabled) {
      config.modResults = addBLEHardwareFeatureToManifest(config.modResults);
    }
    return config;
  });
};

export function addFineControlPermissionToManifest(
  androidManifest: AndroidManifest
) {
  // Add `<uses-permission-sdk-23 android:name="android.permission.ACCESS_FINE_LOCATION"/>` to the AndroidManifest.xml
  if (!Array.isArray(androidManifest.manifest["uses-permission-sdk-23"])) {
    androidManifest.manifest["uses-permission-sdk-23"] = [];
  }

  if (
    !androidManifest.manifest["uses-permission-sdk-23"].find(
      (item) =>
        item.$["android:name"] === "android.permission.ACCESS_FINE_LOCATION"
    )
  ) {
    androidManifest.manifest["uses-permission-sdk-23"]?.push({
      $: {
        "android:name": "android.permission.ACCESS_FINE_LOCATION",
      },
    });
  }
  return androidManifest;
}

// Add this line if your application always requires BLE. More info can be found on: https://developer.android.com/guide/topics/connectivity/bluetooth-le.html#permissions
export function addBLEHardwareFeatureToManifest(
  androidManifest: AndroidConfig.Manifest.AndroidManifest
) {
  // Add `<uses-feature android:name="android.hardware.bluetooth_le" android:required="true"/>` to the AndroidManifest.xml
  if (!Array.isArray(androidManifest.manifest["uses-feature"])) {
    androidManifest.manifest["uses-feature"] = [];
  }

  if (
    !androidManifest.manifest["uses-feature"].find(
      (item) => item.$["android:name"] === "android.hardware.bluetooth_le"
    )
  ) {
    androidManifest.manifest["uses-feature"]?.push({
      $: {
        "android:name": "android.hardware.bluetooth_le",
        "android:required": "true",
      },
    });
  }
  return androidManifest;
}
