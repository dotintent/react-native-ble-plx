/* eslint-disable flowtype/no-types-missing-file-annotation */

import { ConfigPlugin, withInfoPlist } from '@expo/config-plugins'

const BLUETOOTH_ALWAYS = 'Allow $(PRODUCT_NAME) to connect to bluetooth devices'

export const withBluetoothAlwaysPermission: ConfigPlugin<{
  bluetoothAlwaysPermission?: string | false
}> = (c, { bluetoothAlwaysPermission } = {}) => {
  if (bluetoothAlwaysPermission === false) {
    return c
  }
  return withInfoPlist(c, config => {
    config.modResults.NSBluetoothAlwaysUsageDescription =
      bluetoothAlwaysPermission || config.modResults.NSBluetoothAlwaysUsageDescription || BLUETOOTH_ALWAYS
    return config
  })
}
