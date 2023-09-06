import {
   BleError,
   BleErrorCode,
   BleManager,
   Device,
   NativeDevice,
   State as BluetoothState,
   LogLevel,
} from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';
import Toast from 'react-native-toast-message';

class BLEServiceInstance {
   private readonly manager: BleManager;
   private device: NativeDevice | null;

   constructor() {
      this.device = null;
      this.manager = new BleManager();
      this.manager.setLogLevel(LogLevel.Verbose);
   }

   public initializeBLE = (onBLEReady: () => void) => {
      const subscription = this.manager.onStateChange(state => {
         console.log('manager state', state);
         switch (state) {
            case BluetoothState.Unsupported:
               this.showErrorToast('');
               break;
            case BluetoothState.PoweredOff:
               this.onBluetoothPowerOff();
               break;
            case BluetoothState.Unauthorized:
               this.requestBluetoothPermission();
               break;
            case BluetoothState.PoweredOn:
               onBLEReady();
               subscription.remove();
               break;
         }
      }, true);
   };

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

   public scanDevices = async (onDeviceFound: (device: Device) => void) => {
      this.manager.startDeviceScan(null, null, (error, device) => {
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

   public connectToDevice = async (deviceId: string) => {
      this.manager.stopDeviceScan();
      console.log('connecting to ', deviceId);
      this.manager
         .connectToDevice(deviceId)
         .then(device => {
            console.log('connected to ', deviceId);
            this.device = device;
            return this.discoverServicesAndCharacteristics();
         })
         .catch(error => {
            if (error.errorCode === BleErrorCode.DeviceAlreadyConnected) {
               return this.discoverServicesAndCharacteristics();
            } else {
               this.onError(error);
            }
         });
   };

   private discoverServicesAndCharacteristics = () => {
      if (!this.device) {
         this.showErrorToast('Device is not connected');
         return;
      }
      console.log(
         'discovering all services and characteristics for device ',
         this.device.id,
      );
      this.manager
         .discoverAllServicesAndCharacteristicsForDevice(this.device.id)
         .then(device => {
            this.device = device;
            console.log(
               'discovered all services and characteristics for device ',
               this.device.id,
            );
         })
         .catch(error => this.onError(error));
   };

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
