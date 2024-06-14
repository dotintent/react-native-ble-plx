import type { BleError, Device } from 'react-native-ble-plx'
import React, { useCallback, useEffect, useState } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ThemeProvider } from 'styled-components'
import Toast from 'react-native-toast-message'
import { commonTheme } from './theme/theme'
import { BLEService } from './services'

export function App() {
  const [devices, setDevices] = useState<{ id: string; name: string }[]>([])
  const [error, setError] = useState<BleError | null>(null)

  const onDeviceFound = useCallback(
    (device: Device) => {
      const simpleDevice = { id: device.id, name: device.name || 'Unknown' }
      console.log('onDeviceFound', simpleDevice)
      // clearTimer()

      // should be setDevices((prev) => [...prev, simpleDevice]) devices will always be empty because it's run by useEffect with no dependencies
      setDevices([...devices, simpleDevice])
    },
    [devices]
  )

  const onScanError = useCallback((error: BleError) => {
    //  clearTimer()
    setError(error)
  }, [])

  const scanForDevices = useCallback(async () => {
    //  startTimer()
    await BLEService.initializeBLE()
    await BLEService.scanDevices(onDeviceFound, onScanError)
  }, [onDeviceFound, onScanError]) // the dependency array does not matter as `scanForDevices` is called by useEffect with no dependencies

  useEffect(() => {
    scanForDevices()
  }, [])

  return (
    <SafeAreaProvider>
      <ThemeProvider theme={commonTheme}>
        <Toast />
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
