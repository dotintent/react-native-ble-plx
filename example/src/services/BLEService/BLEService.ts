import {
   BleError,
   BleErrorCode,
   BleManager,
   Device,
   State as BluetoothState,
   LogLevel,
   type UUID,
   Characteristic
} from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';
import Toast from 'react-native-toast-message';

class BLEServiceInstance {
   private readonly manager: BleManager;
   private device: Device | null;

   constructor() {
      this.device = null;
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
         this.showErrorToast('Device is not connected');
         return;
      }
      this.manager
         .cancelDeviceConnection(this.device.id)
         .then(() => this.showErrorToast('Device disconnected'))
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
         this.showErrorToast('Device is not connected');
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
         this.showErrorToast('Device is not connected');
         return;
      }
      this.manager.readCharacteristicForDevice(this.device.id, serviceUUID,characteristicUUID)
         .then(characteristic => {
            resolve(characteristic);
         })
         .catch(error => {
            this.onError(error);
            reject(error)
          });
   });

   public writeCharacteristicWithResponseForDevice = async (serviceUUID: UUID,characteristicUUID: UUID) => new Promise<Characteristic>((resolve, reject) =>   {
      if (!this.device) {
         this.showErrorToast('Device is not connected');
         return;
      }
      this.manager.writeCharacteristicWithResponseForDevice(this.device.id, serviceUUID,characteristicUUID)
         .then(characteristic => {
            resolve(characteristic);
         })
         .catch(error => {
            this.onError(error);
            reject(error)
          });
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
}

export const BLEService = new BLEServiceInstance();
