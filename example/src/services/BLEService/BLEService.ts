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
   type Subscription,
   type DeviceId
} from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';
import Toast from 'react-native-toast-message';

const deviceNotConnectedErrorText = 'Device is not connected';

class BLEServiceInstance {
   private manager: BleManager;
   private device: Device | null;
   private characteristicMonitor: Subscription | null;  
   private isCharacteristicMonitorDisconnectExpected: boolean = false

   constructor() {
      this.device = null;
      this.characteristicMonitor= null;
      this.manager = new BleManager();
      this.manager.setLogLevel(LogLevel.Verbose);
   }

   public getDevice = ()=>{
    return this.device
   }

   public initializeBLE = () => new Promise<void>((resolve, reject) =>  {
      const subscription = this.manager.onStateChange(state => {
         switch (state) {
            case BluetoothState.Unsupported:
               this.showErrorToast('');
               reject('Bluetooth state: ' + BluetoothState.Unsupported)
               break;
            case BluetoothState.PoweredOff:
               this.onBluetoothPowerOff();
               reject('Bluetooth state: ' + BluetoothState.PoweredOff)
               break;
            case BluetoothState.Unauthorized:
               this.requestBluetoothPermission();
               break;
            case BluetoothState.PoweredOn:
               resolve();
               subscription.remove();
               break;
         }
      }, true);
   });

   public disconnectDevice = () => {
      if (!this.device) {
         this.showErrorToast(deviceNotConnectedErrorText);
         throw new Error(deviceNotConnectedErrorText);
      }
      return this.manager
         .cancelDeviceConnection(this.device.id)
         .then(() => this.showSuccessToast('Device disconnected'))
         .catch(error => {
            if (error?.code !== BleErrorCode.DeviceDisconnected) {
               this.onError(error);
            }
         });
   };

   private onBluetoothPowerOff = () => {
      this.showErrorToast('Bluetooth is turned off');
   };

   public scanDevices = async (onDeviceFound: (device: Device) => void, UUIDs: UUID[] | null = null) => {
      this.manager.startDeviceScan(UUIDs, null, (error, device) => {
         if (error) {
            this.onError(error);
            console.error(error.message);
            this.manager.stopDeviceScan();
            return;
         }
         if (device) {
            onDeviceFound(device);
         }
      });
   };

   public connectToDevice = (deviceId: string) => new Promise<Device>((resolve, reject) =>  {
      this.manager.stopDeviceScan();
      this.manager
         .connectToDevice(deviceId)
         .then(device => {
            this.device = device;
            resolve(device)
         })
         .catch(error => {
            if (error.errorCode === BleErrorCode.DeviceAlreadyConnected && this.device) {
              resolve(this.device)
            } else {
               this.onError(error);
               reject(error)
            }
         });
   });

   public discoverAllServicesAndCharacteristicsForDevice = async () => new Promise<Device>((resolve, reject) =>   {
      if (!this.device) {
         this.showErrorToast(deviceNotConnectedErrorText);
          reject(new Error(deviceNotConnectedErrorText));
          return;
      }
      this.manager
         .discoverAllServicesAndCharacteristicsForDevice(this.device.id)
         .then(device => {
            resolve(device);
            this.device = device;
         })
         .catch(error => {
            this.onError(error);
            reject(error)
          });
   });

   public readCharacteristicForDevice = async (serviceUUID: UUID,characteristicUUID: UUID) => new Promise<Characteristic>((resolve, reject) =>   {
      if (!this.device) {
         this.showErrorToast(deviceNotConnectedErrorText);
         reject(new Error(deviceNotConnectedErrorText))
         return;
      }
      this.manager.readCharacteristicForDevice(this.device.id, serviceUUID,characteristicUUID)
         .then(characteristic => {
            resolve(characteristic);
         })
         .catch(error => {
            this.onError(error);
          });
   });

   public writeCharacteristicWithResponseForDevice = async (serviceUUID: UUID,characteristicUUID: UUID,time: Base64) =>   {
      if (!this.device) {
         this.showErrorToast(deviceNotConnectedErrorText);
         throw new Error(deviceNotConnectedErrorText);
      }
     return  this.manager.writeCharacteristicWithResponseForDevice(this.device.id, serviceUUID,characteristicUUID, time)
         .catch(error => {
            this.onError(error);
          });
   };

   public writeCharacteristicWithoutResponseForDevice = async (serviceUUID: UUID,characteristicUUID: UUID,time: Base64) => {
      if (!this.device) {
         this.showErrorToast(deviceNotConnectedErrorText);
         throw new Error(deviceNotConnectedErrorText);
      }
      return this.manager.writeCharacteristicWithoutResponseForDevice(this.device.id, serviceUUID,characteristicUUID, time)
         .catch(error => {
            this.onError(error);
          });
   };

    public setupMonitor = (serviceUUID: UUID,characteristicUUID: UUID, onCharacteristicReceived: (characteristic: Characteristic)=> void, onError: (error:Error)=>void,transactionId?: TransactionId,hideErrorDisplay?: boolean) => {
      if (!this.device) {
         this.showErrorToast(deviceNotConnectedErrorText);
         throw new Error(deviceNotConnectedErrorText);
      }
      this.characteristicMonitor = this.manager.monitorCharacteristicForDevice(
          this.device?.id,
          serviceUUID,
          characteristicUUID,
          (error, characteristic) => {
            if (error) {
              if(error.errorCode === 2 && this.isCharacteristicMonitorDisconnectExpected){
                this.isCharacteristicMonitorDisconnectExpected = false;
                return;
              }
              onError(error)
              if(!hideErrorDisplay){
                this.onError(error);
                this.characteristicMonitor?.remove();
              }
              return;
            }
            if (characteristic) {
                onCharacteristicReceived(characteristic);
            }
          },transactionId
      );
   };

   public finishMonitor = ()=> {
    this.isCharacteristicMonitorDisconnectExpected = true
    this.characteristicMonitor?.remove()
  }

    public writeDescriptorForDevice = async (serviceUUID: UUID,characteristicUUID: UUID,descriptorUUID: UUID, data: Base64) => {
      if (!this.device) {
         this.showErrorToast(deviceNotConnectedErrorText);
         throw new Error(deviceNotConnectedErrorText);
      }
      return this.manager.writeDescriptorForDevice(this.device.id, serviceUUID, characteristicUUID, descriptorUUID, data)
         .catch(error => {
            this.onError(error);
          });
    };

    public readDescriptorForDevice = async (serviceUUID: UUID,characteristicUUID: UUID,descriptorUUID: UUID) => {
      if (!this.device) {
         this.showErrorToast(deviceNotConnectedErrorText);
         throw new Error(deviceNotConnectedErrorText);
      }
      return this.manager.readDescriptorForDevice(this.device.id, serviceUUID, characteristicUUID, descriptorUUID)
         .catch(error => {
            this.onError(error);
          });
    };

    public getServicesForDevice = ()=> {
      if (!this.device) {
         this.showErrorToast(deviceNotConnectedErrorText);
         throw new Error(deviceNotConnectedErrorText);
      }
      return this.manager.servicesForDevice(this.device.id).catch(error => {
            this.onError(error);
          });
    }

    public getCharacteristicsForDevice= (serviceUUID: string)=> {
      if (!this.device) {
         this.showErrorToast(deviceNotConnectedErrorText);
         throw new Error(deviceNotConnectedErrorText);
      }
       return this.manager.characteristicsForDevice(this.device.id, serviceUUID).catch(error => {
            this.onError(error);
          });
    }

    public getDescriptorsForDevice = (serviceUUID: string, characteristicUUID: string)=> {
       if (!this.device) {
         this.showErrorToast(deviceNotConnectedErrorText);
         throw new Error(deviceNotConnectedErrorText);
       }
       return this.manager.descriptorsForDevice(this.device.id, serviceUUID, characteristicUUID).catch(error => {
            this.onError(error);
          });
    }

    public isDeviceConnected = () => {
       if (!this.device) {
         this.showErrorToast(deviceNotConnectedErrorText);
         throw new Error(deviceNotConnectedErrorText);
       }
       return this.manager.isDeviceConnected(this.device.id).catch(error => {
            this.onError(error);
          });
    }

    public getConnectedDevices = (expectedServices: UUID[]) => {
       if (!this.device) {
         this.showErrorToast(deviceNotConnectedErrorText);
         throw new Error(deviceNotConnectedErrorText);
       }
       return this.manager.connectedDevices(expectedServices).catch(error => {
            this.onError(error);
          });
    }

    public requestMTUForDevice = (mtu: number) => {
       if (!this.device) {
         this.showErrorToast(deviceNotConnectedErrorText);
         throw new Error(deviceNotConnectedErrorText);
       }
       return this.manager.requestMTUForDevice(this.device.id, mtu).catch(error => {
        this.onError(error);
       });
    }

    public onDeviceDisconnected = (listener: (error: BleError | null, device: Device | null) => void) => {
       if (!this.device) {
         this.showErrorToast(deviceNotConnectedErrorText);
         throw new Error(deviceNotConnectedErrorText);
       }
       return this.manager.onDeviceDisconnected(this.device.id, listener)
    }

    public readRSSIForDevice = () => {
       if (!this.device) {
         this.showErrorToast(deviceNotConnectedErrorText);
         throw new Error(deviceNotConnectedErrorText);
       }
       return this.manager.readRSSIForDevice(this.device.id).catch(error => {
            this.onError(error);
          });
    }

    public getDevices = () => {
       if (!this.device) {
         this.showErrorToast(deviceNotConnectedErrorText);
         throw new Error(deviceNotConnectedErrorText);
       }
       return this.manager.devices([this.device.id]).catch(error => {
            this.onError(error);
          });
    }

    public cancelTransaction = (transactionId: string) => this.manager.cancelTransaction(transactionId)
    public enable = () => this.manager.enable().catch(error => {
            this.onError(error);
          });
    public disable = () => this.manager.disable().catch(error => {
            this.onError(error);
          });

    public getState = () => this.manager.state().catch(error => {
            this.onError(error);
          });

   private onError = (error: BleError) => {
      switch (error.errorCode) {
         case BleErrorCode.BluetoothUnauthorized:
            this.requestBluetoothPermission();
            break;
         case BleErrorCode.LocationServicesDisabled:
            this.showErrorToast('Location services are disabled');
            break;
         default:
            this.showErrorToast(JSON.stringify(error, null, 4));
      }
   };

   public requestConnectionPriorityForDevice = (priority: 0 | 1 | 2)=> {
    if (!this.device) {
      this.showErrorToast(deviceNotConnectedErrorText);
      throw new Error(deviceNotConnectedErrorText);
    }
    return this.manager.requestConnectionPriorityForDevice(this.device?.id, priority)
  }

   public cancelDeviceConnection = ()=> {
    if (!this.device) {
      this.showErrorToast(deviceNotConnectedErrorText);
      throw new Error(deviceNotConnectedErrorText);
    }
    return this.manager.cancelDeviceConnection(this.device?.id)
  }

   public requestBluetoothPermission = async () => {
      try {
         const grantedLocation = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
         );
         const grantedScan = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
         );
         const grantedConnect = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
         );
         console.log({
            grantedLocation,
            grantedScan,
            grantedConnect,
         });
         const commonPermissionGranted =
            grantedLocation === PermissionsAndroid.RESULTS.GRANTED;
         const android12PermissionGranted =
            (grantedScan === PermissionsAndroid.RESULTS.GRANTED &&
               grantedConnect === PermissionsAndroid.RESULTS.GRANTED) ||
            parseInt(Platform.Version.toString(), 10) < 31;
         if (!commonPermissionGranted || !android12PermissionGranted) {
            this.showErrorToast('Permits have not been granted');
         }
      } catch (error: any) {
         console.warn(error);
      }
   };

   private showErrorToast = (error: string) => {
      Toast.show({
         type: 'error',
         text1: 'Error',
         text2: error,
      });
      console.error(error);
   };

   private showSuccessToast = (info: string) => {
      Toast.show({
         type: 'success',
         text1: 'Success',
         text2: info,
      });
   };
}

export const BLEService = new BLEServiceInstance();
