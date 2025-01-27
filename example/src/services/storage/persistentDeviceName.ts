import { useAsyncStorage } from '@react-native-async-storage/async-storage'
import { useState, useEffect, useCallback } from 'react'

export const PERSISTENT_DEVICE_NAME_KEY = 'PERSISTENT_DEVICE_NAME'

export const usePersistentDeviceName = () => {
  const { getItem, setItem } = useAsyncStorage(PERSISTENT_DEVICE_NAME_KEY)
  const [deviceName, setName] = useState<string>()

  useEffect(() => {
    ;(async () => {
      if (!deviceName) {
        const name = await getItem()
        if (name) {
          setName(name)
        }
      }
    })()
  }, [deviceName, setName, getItem])

  const setDeviceName = useCallback(
    (name: string) => {
      setItem(name)
      setName(name)
    },
    [setItem, setName]
  )

  return { deviceName, setDeviceName }
}
