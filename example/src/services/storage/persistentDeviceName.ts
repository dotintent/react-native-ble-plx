import { useMMKVString } from 'react-native-mmkv'

export const PERSISTENT_DEVICE_NAME_KEY = 'PERSISTENT_DEVICE_NAME'

export const usePersistentDeviceName = () => useMMKVString(PERSISTENT_DEVICE_NAME_KEY)
