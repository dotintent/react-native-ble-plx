# Error mapping for react-native-ble-plx

## Platform specific errors

On iOS there are two domains of errors, [GATT domain](https://developer.apple.com/reference/corebluetooth/1613347-core_bluetooth_constants/1665655-core_bluetooth_attribute_protoco) 
and [CB domain](https://developer.apple.com/reference/corebluetooth/1613347-core_bluetooth_constants/1665448-core_bluetooth_error_domain). 
[GATT errors](https://developer.apple.com/reference/corebluetooth/cbatterror.code) are defined by using standard code 
points specified in VOL 3,F,3.4.1.1. [Core Bluetooth errors](https://developer.apple.com/reference/corebluetooth/cberror.code) are platform specific.
Android also uses ATT code points for [GATT exceptions](https://android.googlesource.com/platform/external/bluetooth/bluedroid/+/android-5.1.1_r13/stack/include/gatt_api.h).

## Available errors

|RxAndroidBLE                                    | Reason                                       | RNBLEPLX       |
|------------------------------------------------|----------------------------------------------|----------------|
|BleAlreadyConnectedException                    | Tried to connect to already connected device | ???            |
|BleCannotSetCharacteristicNotificationException | Unable to change notification value          | ???            |
|BleCharacteristicNotFoundException              | Characteristic doesn't exists                | ???            |
|BleConflictingNotificationAlreadySetException   | Already set indication or notification       | ???            |
|BleDisconnectedException                        | Disconnected/failed before connection        | ???            |
|BleException                                    | Generic error                                | ???            |
|BleGattCannotStartException (+context)          | Couldn't start GATT operation                | ???            |
|BleGattException (+context, +gattcode)          | GATT specific exception                      | ???            |
| :: CONNECTION_STATE                            | When connection changes state                | ???            | 
| :: SERVICE_DISCOVERY                           | During service discovery                     | ???            |
| :: CHARACTERISTIC_READ                         | Reading characteristic                       | ???            |
| :: CHARACTERISTIC_WRITE                        | Writing characteristic                       | ???            |
| :: CHARACTERISTIC_CHANGED                      | Not used ???                                 | ???            |
| :: DESCRIPTOR_READ                             | Reading descriptor                           | ???            |
| :: DESCRIPTOR_WRITE                            | Writing descriptor                           | ???            |
| :: RELIABLE_WRITE_COMPLETED                    | Reliably writing (what??)                    | ???            |
| :: READ_RSSI                                   | Reading RSSI                                 | ???            |
| :: ON_MTU_CHANGED                              | Mtu changed                                  | ???            |
|BleScanException                                | During scanning                              | ???            |
| :: BLUETOOTH_CANNOT_START                      | Cannot start scanning for some reason        | ???            |
| :: BLUETOOTH_DISABLED                          | Bluetooth is disabled                        | ???            |
| :: BLUETOOTH_NOT_AVAILABLE                     | Bluetooth not Available                      | ???            |
| :: LOCATION_PERMISSION_MISSING                 | Missing location permission                  | ???            |
| :: LOCATION_SERVICES_DISABLED                  | Location services disabled                   | ???            |
| :: UNKNOWN                                     | ???                                          | ???            |

| CoreBluetooth           | Reason                                                    | RNBLEPLX |
|-------------------------|-----------------------------------------------------------|----------|
| unknown                 | ???                                                       | ???      |
| invalidParameters       | The specified parameters are invalid.                     | ???      |
| invalidHandle           | The specified attribute handle is invalid.                | ???      |
| notConnected            | The device is not currently connected.                    | ???      |
| outOfSpace              | The device has run out of space to complete operation.    | ???      |
| operationCancelled      | The operation is canceled.                                | ???      |
| connectionTimeout       | The connection timed out                                  | ???      |
| peripheralDisconnected  | The peripheral disconnected.                              | ???      |
| uuidNotAllowed          | The specified UUID is not permitted.                      | ???      |
| alreadyAdvertising      | The peripheral is already advertising. (peripheral mode?) | ???      |
| connectionFailed        | The connection failed.                                    | ???      |
| connectionLimitReached  | The device already has the maximum number of connections. | ???      |
| maxConnection           | The device already has the maximum number of connections. | ???      |
| gattErrors (look above) | GATT specific errors VOL 3,F,3.4.1.1                      | ???      |

| RxBluetoothKit           | Reason                                                    | RNBLEPLX |
|--------------------------|-----------------------------------------------------------|----------|
| bluetoothUnsupported     | Bluetooth unsupported                                     | ???      |
| bluetoothUnauthorized    | Bluetooth unauthorized                                    | ???      |
| bluetoothPoweredOff      | Bluetooth powered off                                     | ???      |
| bluetoothInUnknownState  | Bluetooth in unknown state                                | ???      |
| bluetoothResetting       | Bluetooth resetting                                       | ???      |
| peripheralConnectionFailed(Peripheral, Error?) | Peripheral connection failed        | ???      |
| peripheralDisconnected(Peripheral, Error?)     | Peripheral disconnected             | ???      |
| peripheralDisconnected(Peripheral, Error?)     | Peripheral disconnected             | ???      | 
| peripheralRSSIReadFailed(Peripheral, Error?)   | After RSSI read                     | ???      |
| servicesDiscoveryFailed(Peripheral, Error?)    | Services failed                     | ???      |
| includedServicesDiscoveryFailed(Peripheral, Error?) | Fixme: Should be service?      | ???      |
| characteristicsDiscoveryFailed(Service, Error?)     | Characteristic discovery       | ???      |
| characteristicWriteFailed(Characteristic, Error?)   | Characteristic write           | ???      |
| characteristicReadFailed(Characteristic, Error?)    | Chracteristic read             | ???      |
| characteristicNotifyChangeFailed(Characteristic, Error?) | Notify change             | ???      |
| descriptorsDiscoveryFailed(Characteristic, Error?) | Descriptor discovery            | ???      |
| descriptorWriteFailed(Descriptor, Error?) | Descriptor write                         | ???      |
| descriptorReadFailed(Descriptor, Error?) | Descriptor read                           | ???      |

## Potential fixes:

*Android*
  * BleDisconnectedException - add mac address?
  * BleGattException - add context as peripheral/characteristic/etc...

*iOS*:
  * servicesDiscoveryFailed - add services parameter
  * includedServicesDiscoveryFailed - should have service instead of peripheral


## react-native-ble-plx Error structure:

To be decided