import { Platform } from 'react-native'

export const isAndroidSdkAbove34 = Platform.OS === 'android' && Platform.Version >= 34
