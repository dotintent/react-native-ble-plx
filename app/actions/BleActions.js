export const bleStartScanAction = {
  create: () => {
    return {
      type: 'BLE_START_SCAN_ACTION'
    }
  },
  type: 'BLE_START_SCAN_ACTION'
}

export const bleStopScanAction = {
  create: () => {
    return {
      type: 'BLE_STOP_SCAN_ACTION'
    }
  },
  type: 'BLE_STOP_SCAN_ACTION'
}

export const blePeripheralFoundAction = {
  create: (peripheral) => {
    return {
      type: 'BLE_PERIPHERAL_FOUND_ACTION',
      peripheral: peripheral
    }
  },
  type: 'BLE_PERIPHERAL_FOUND_ACTION'
}
