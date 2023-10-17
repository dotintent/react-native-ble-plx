import { type ConfigPlugin, withInfoPlist } from '@expo/config-plugins'

const BLUETOOTH_ALWAYS = 'Allow $(PRODUCT_NAME) to connect to bluetooth devices'

export const withBluetoothPermissions: ConfigPlugin<{
  bluetoothAlwaysPermission?: string | false
}> = (c, { bluetoothAlwaysPermission }) =>
  withInfoPlist(c, config => {
    if (bluetoothAlwaysPermission !== false) {
      config.modResults.NSBluetoothAlwaysUsageDescription =
        bluetoothAlwaysPermission || config.modResults.NSBluetoothAlwaysUsageDescription || BLUETOOTH_ALWAYS
    }
    return config
  })
