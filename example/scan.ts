import { BleError, BleManager, Device, ScanMode } from 'react-native-ble-plx'

const EDDYSTONE_UUID = '0000feaa-0000-1000-8000-00805f9b34fb'
const AR4_SERVICE_A = 'f0cd1400-95da-4f4b-9ac8-aa55d312af0c' // Old firmware
const AR4_SERVICE_B = '0000fce0-0000-1000-8000-00805f9b34fb' // New firmware

const selectedUUIDs = [EDDYSTONE_UUID, AR4_SERVICE_A, AR4_SERVICE_B]

const theBleManager = new BleManager()

let theScanTimeout: NodeJS.Timeout | null = null
export enum ScanScenario {
  Selected = 'SelectedUUIDs',
  Everything = 'Everything'
}

let theFoundDevices: {
  [key: string]: Device
} = {}

function logDevice(dev: Device) {
  console.log(
    `Scanned device '` +
      `name='${dev.name}' ${
        dev.localName && dev.localName != dev.name ? `localName='${dev.localName}' ` : ''
      }serviceData='${JSON.stringify(dev.serviceData)}' ` +
      `id='${dev.id}' ` +
      `rssi=${dev.rssi} serviceUuids=${JSON.stringify(dev.serviceUUIDs)}` +
      ` overflowServiceUUIDs=${dev.overflowServiceUUIDs} isConnectable=${dev.isConnectable}`
  )
}

//-----------------------------------------------------------------------------
export function scanForDevices(maxSecondsToScan: number, scenario: ScanScenario): void {
  function finishScanning() {
    // console.log(`finishScanning(${maxSecondsToScan}, ${scenario}) `);
    if (!theScanTimeout) {
      return // Already stopped
    }
    clearTimeout(theScanTimeout)
    theScanTimeout = null
    theBleManager.stopDeviceScan()

    console.log('Found devices:')
    const foundUUIDs = {}
    const devices = Object.values(theFoundDevices).map(device => {
      // logDevice(device);
      if (device.serviceUUIDs) {
        for (const uuid of device.serviceUUIDs) {
          if (foundUUIDs[uuid]) {
            foundUUIDs[uuid]++
          } else {
            foundUUIDs[uuid] = 1
          }
        }
      } else {
        foundUUIDs.null = foundUUIDs.null ? foundUUIDs.null + 1 : 1
      }
    })
    console.log(`>>>> ${devices.length} devices found with ${Object.keys(foundUUIDs).length} UUIDs:`)
    console.log(JSON.stringify(foundUUIDs, null, 4))
  }

  theScanTimeout = null
  theBleManager.stopDeviceScan() // Abort scan if already in progress
  theFoundDevices = {}

  // Allow nearest device time to advertise
  const minSecondsToScan = 5.5 // At least target device's ad interval
  console.log(`Scanning scenario '${scenario}' for ${minSecondsToScan}--${Math.round(maxSecondsToScan)} seconds
  } ...`)
  const now = new Date().getTime()
  const earliestEnd = now + minSecondsToScan * 1000
  let scanningDeadline = Math.max(earliestEnd, now + maxSecondsToScan * 1000)
  const serviceUuids =
    scenario == ScanScenario.Selected
      ? selectedUUIDs // Any supported device
      : scenario == ScanScenario.Everything
      ? null // For testing only. will not work in background
      : null // Unexpected scenario
  console.log(`Scanning ${serviceUuids?.length || 'all'} serviceUuids=${JSON.stringify(serviceUuids)}`)

  theScanTimeout = setTimeout(finishScanning, maxSecondsToScan * 1000)
  theBleManager.startDeviceScan(
    serviceUuids,
    { allowDuplicates: true, legacyScan: false },
    (error: BleError | null, scannedDevice: Device | null) => {
      if (error) {
        // Scanning should stop automatically on error
        console.log(`ERROR startDeviceScan: ${error.message}`)
        theScanTimeout = null
        return
      }
      const now = new Date().getTime() // Not shared with outer scope
      console.log(scannedDevice.serviceUUIDs)

      if (!scannedDevice) {
        console.log('falsy scannedDevice ignored')
        if (now > scanningDeadline) {
          finishScanning()
        }
        return
      }

      // logDevice(scannedDevice);
      theFoundDevices[scannedDevice.id] = scannedDevice

      switch (scenario) {
        case ScanScenario.Selected: // User is scanning for any potential supported device
          scanningDeadline = Math.min(scanningDeadline, now + 3000)
          scanningDeadline = Math.max(earliestEnd, scanningDeadline) // Leave time for advertisement
          break
        case ScanScenario.Everything:
          // Keep going until scheduled end
          break
        default:
          finishScanning()
      }

      if (now > scanningDeadline) {
        finishScanning()
      } else {
        // Won't work in BG on Android, but avoids waiting for another find to finish
        theScanTimeout && clearTimeout(theScanTimeout)
        theScanTimeout = setTimeout(finishScanning, scanningDeadline - new Date().getTime())
      }
    }
  )
}
