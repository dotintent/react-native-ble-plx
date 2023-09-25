import {
  BleError,
  BleErrorCode,
  BleManager,
  Device,
  State as BluetoothState,
  LogLevel,
  type TransactionId,
  type UUID,
  type Characteristic,
  type Base64,
  type Subscription
} from 'react-native-ble-plx'
import { PermissionsAndroid, Platform } from 'react-native'
import Toast from 'react-native-toast-message'

const deviceNotConnectedErrorText = 'Device is not connected'

class BLEServiceInstance {
  manager: BleManager

  device: Device | null

  characteristicMonitor: Subscription | null

  isCharacteristicMonitorDisconnectExpected = false

  constructor() {
    this.device = null
    this.characteristicMonitor = null
    this.manager = new BleManager()
    this.manager.setLogLevel(LogLevel.Verbose)
  }

  getDevice = () => this.device

  initializeBLE = () =>
    new Promise<void>(resolve => {
      const subscription = this.manager.onStateChange(state => {
        switch (state) {
          case BluetoothState.Unsupported:
            this.showErrorToast('')
            break
          case BluetoothState.PoweredOff:
            this.onBluetoothPowerOff()
            this.manager.enable().catch((error: BleError) => {
              if (error.errorCode === BleErrorCode.BluetoothUnauthorized) {
                this.requestBluetoothPermission()
              }
            })
            break
          case BluetoothState.Unauthorized:
            this.requestBluetoothPermission()
            break
          case BluetoothState.PoweredOn:
            resolve()
            subscription.remove()
            break
          default:
            console.error('Unsupported state: ', state)
        }
      }, true)
    })

  disconnectDevice = () => {
    if (!this.device) {
      this.showErrorToast(deviceNotConnectedErrorText)
      throw new Error(deviceNotConnectedErrorText)
    }
    return this.manager
      .cancelDeviceConnection(this.device.id)
      .then(() => this.showSuccessToast('Device disconnected'))
      .catch(error => {
        if (error?.code !== BleErrorCode.DeviceDisconnected) {
          this.onError(error)
        }
      })
  }

  onBluetoothPowerOff = () => {
    this.showErrorToast('Bluetooth is turned off')
  }

  scanDevices = async (onDeviceFound: (device: Device) => void, UUIDs: UUID[] | null = null) => {
    this.manager.startDeviceScan(UUIDs, null, (error, device) => {
      if (error) {
        this.onError(error)
        console.error(error.message)
        this.manager.stopDeviceScan()
        return
      }
      if (device) {
        onDeviceFound(device)
      }
    })
  }

  connectToDevice = (deviceId: string) =>
    new Promise<Device>((resolve, reject) => {
      this.manager.stopDeviceScan()
      this.manager
        .connectToDevice(deviceId)
        .then(device => {
          this.device = device
          resolve(device)
        })
        .catch(error => {
          if (error.errorCode === BleErrorCode.DeviceAlreadyConnected && this.device) {
            resolve(this.device)
          } else {
            this.onError(error)
            reject(error)
          }
        })
    })

  discoverAllServicesAndCharacteristicsForDevice = async () =>
    new Promise<Device>((resolve, reject) => {
      if (!this.device) {
        this.showErrorToast(deviceNotConnectedErrorText)
        reject(new Error(deviceNotConnectedErrorText))
        return
      }
      this.manager
        .discoverAllServicesAndCharacteristicsForDevice(this.device.id)
        .then(device => {
          resolve(device)
          this.device = device
        })
        .catch(error => {
          this.onError(error)
          reject(error)
        })
    })

  readCharacteristicForDevice = async (serviceUUID: UUID, characteristicUUID: UUID) =>
    new Promise<Characteristic>((resolve, reject) => {
      if (!this.device) {
        this.showErrorToast(deviceNotConnectedErrorText)
        reject(new Error(deviceNotConnectedErrorText))
        return
      }
      this.manager
        .readCharacteristicForDevice(this.device.id, serviceUUID, characteristicUUID)
        .then(characteristic => {
          resolve(characteristic)
        })
        .catch(error => {
          this.onError(error)
        })
    })

  writeCharacteristicWithResponseForDevice = async (serviceUUID: UUID, characteristicUUID: UUID, time: Base64) => {
    if (!this.device) {
      this.showErrorToast(deviceNotConnectedErrorText)
      throw new Error(deviceNotConnectedErrorText)
    }
    return this.manager
      .writeCharacteristicWithResponseForDevice(this.device.id, serviceUUID, characteristicUUID, time)
      .catch(error => {
        this.onError(error)
      })
  }

  writeCharacteristicWithoutResponseForDevice = async (serviceUUID: UUID, characteristicUUID: UUID, time: Base64) => {
    if (!this.device) {
      this.showErrorToast(deviceNotConnectedErrorText)
      throw new Error(deviceNotConnectedErrorText)
    }
    return this.manager
      .writeCharacteristicWithoutResponseForDevice(this.device.id, serviceUUID, characteristicUUID, time)
      .catch(error => {
        this.onError(error)
      })
  }

  setupMonitor = (
    serviceUUID: UUID,
    characteristicUUID: UUID,
    onCharacteristicReceived: (characteristic: Characteristic) => void,
    onError: (error: Error) => void,
    transactionId?: TransactionId,
    hideErrorDisplay?: boolean
  ) => {
    if (!this.device) {
      this.showErrorToast(deviceNotConnectedErrorText)
      throw new Error(deviceNotConnectedErrorText)
    }
    this.characteristicMonitor = this.manager.monitorCharacteristicForDevice(
      this.device?.id,
      serviceUUID,
      characteristicUUID,
      (error, characteristic) => {
        if (error) {
          if (error.errorCode === 2 && this.isCharacteristicMonitorDisconnectExpected) {
            this.isCharacteristicMonitorDisconnectExpected = false
            return
          }
          onError(error)
          if (!hideErrorDisplay) {
            this.onError(error)
            this.characteristicMonitor?.remove()
          }
          return
        }
        if (characteristic) {
          onCharacteristicReceived(characteristic)
        }
      },
      transactionId
    )
  }

  finishMonitor = () => {
    this.isCharacteristicMonitorDisconnectExpected = true
    this.characteristicMonitor?.remove()
  }

  writeDescriptorForDevice = async (
    serviceUUID: UUID,
    characteristicUUID: UUID,
    descriptorUUID: UUID,
    data: Base64
  ) => {
    if (!this.device) {
      this.showErrorToast(deviceNotConnectedErrorText)
      throw new Error(deviceNotConnectedErrorText)
    }
    return this.manager
      .writeDescriptorForDevice(this.device.id, serviceUUID, characteristicUUID, descriptorUUID, data)
      .catch(error => {
        this.onError(error)
      })
  }

  readDescriptorForDevice = async (serviceUUID: UUID, characteristicUUID: UUID, descriptorUUID: UUID) => {
    if (!this.device) {
      this.showErrorToast(deviceNotConnectedErrorText)
      throw new Error(deviceNotConnectedErrorText)
    }
    return this.manager
      .readDescriptorForDevice(this.device.id, serviceUUID, characteristicUUID, descriptorUUID)
      .catch(error => {
        this.onError(error)
      })
  }

  getServicesForDevice = () => {
    if (!this.device) {
      this.showErrorToast(deviceNotConnectedErrorText)
      throw new Error(deviceNotConnectedErrorText)
    }
    return this.manager.servicesForDevice(this.device.id).catch(error => {
      this.onError(error)
    })
  }

  getCharacteristicsForDevice = (serviceUUID: string) => {
    if (!this.device) {
      this.showErrorToast(deviceNotConnectedErrorText)
      throw new Error(deviceNotConnectedErrorText)
    }
    return this.manager.characteristicsForDevice(this.device.id, serviceUUID).catch(error => {
      this.onError(error)
    })
  }

  getDescriptorsForDevice = (serviceUUID: string, characteristicUUID: string) => {
    if (!this.device) {
      this.showErrorToast(deviceNotConnectedErrorText)
      throw new Error(deviceNotConnectedErrorText)
    }
    return this.manager.descriptorsForDevice(this.device.id, serviceUUID, characteristicUUID).catch(error => {
      this.onError(error)
    })
  }

  isDeviceConnected = () => {
    if (!this.device) {
      this.showErrorToast(deviceNotConnectedErrorText)
      throw new Error(deviceNotConnectedErrorText)
    }
    return this.manager.isDeviceConnected(this.device.id).catch(error => {
      this.onError(error)
    })
  }

  getConnectedDevices = (expectedServices: UUID[]) => {
    if (!this.device) {
      this.showErrorToast(deviceNotConnectedErrorText)
      throw new Error(deviceNotConnectedErrorText)
    }
    return this.manager.connectedDevices(expectedServices).catch(error => {
      this.onError(error)
    })
  }

  requestMTUForDevice = (mtu: number) => {
    if (!this.device) {
      this.showErrorToast(deviceNotConnectedErrorText)
      throw new Error(deviceNotConnectedErrorText)
    }
    return this.manager.requestMTUForDevice(this.device.id, mtu).catch(error => {
      this.onError(error)
    })
  }

  onDeviceDisconnected = (listener: (error: BleError | null, device: Device | null) => void) => {
    if (!this.device) {
      this.showErrorToast(deviceNotConnectedErrorText)
      throw new Error(deviceNotConnectedErrorText)
    }
    return this.manager.onDeviceDisconnected(this.device.id, listener)
  }

  readRSSIForDevice = () => {
    if (!this.device) {
      this.showErrorToast(deviceNotConnectedErrorText)
      throw new Error(deviceNotConnectedErrorText)
    }
    return this.manager.readRSSIForDevice(this.device.id).catch(error => {
      this.onError(error)
    })
  }

  getDevices = () => {
    if (!this.device) {
      this.showErrorToast(deviceNotConnectedErrorText)
      throw new Error(deviceNotConnectedErrorText)
    }
    return this.manager.devices([this.device.id]).catch(error => {
      this.onError(error)
    })
  }

  cancelTransaction = (transactionId: string) => this.manager.cancelTransaction(transactionId)

  enable = () =>
    this.manager.enable().catch(error => {
      this.onError(error)
    })

  disable = () =>
    this.manager.disable().catch(error => {
      this.onError(error)
    })

  getState = () =>
    this.manager.state().catch(error => {
      this.onError(error)
    })

  onError = (error: BleError) => {
    switch (error.errorCode) {
      case BleErrorCode.BluetoothUnauthorized:
        this.requestBluetoothPermission()
        break
      case BleErrorCode.LocationServicesDisabled:
        this.showErrorToast('Location services are disabled')
        break
      default:
        this.showErrorToast(JSON.stringify(error, null, 4))
    }
  }

  requestConnectionPriorityForDevice = (priority: 0 | 1 | 2) => {
    if (!this.device) {
      this.showErrorToast(deviceNotConnectedErrorText)
      throw new Error(deviceNotConnectedErrorText)
    }
    return this.manager.requestConnectionPriorityForDevice(this.device?.id, priority)
  }

  cancelDeviceConnection = () => {
    if (!this.device) {
      this.showErrorToast(deviceNotConnectedErrorText)
      throw new Error(deviceNotConnectedErrorText)
    }
    return this.manager.cancelDeviceConnection(this.device?.id)
  }

  requestBluetoothPermission = async () => {
    let arePermissionsGranted: boolean = Platform.OS === 'ios'
    if (Platform.OS === 'android' && PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION) {
      const apiLevel = parseInt(Platform.Version.toString(), 10)

      if (apiLevel < 31) {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)
        arePermissionsGranted = granted === PermissionsAndroid.RESULTS.GRANTED
      } else if (PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN && PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT) {
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        ])

        arePermissionsGranted =
          result['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
          result['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
          result['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
      }
    }

    if (!arePermissionsGranted) {
      this.showErrorToast('Permission have not been granted')
    }

    return arePermissionsGranted
  }

  showErrorToast = (error: string) => {
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: error
    })
    console.error(error)
  }

  showSuccessToast = (info: string) => {
    Toast.show({
      type: 'success',
      text1: 'Success',
      text2: info
    })
  }
}

export const BLEService = new BLEServiceInstance()
