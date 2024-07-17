### Monitoring device connection

`onDeviceDisconnected` method allows you to monitor the disconnection of a device, more about the method can be found {@link #here|BleManager.onDeviceDisconnected()}. Using it you can implement your own logic to handle the disconnection event. For example, you can try to reconnect to the device or show a notification to the user.

Note: connection will be monitored only when app is in foreground.

```ts
const setupOnDeviceDisconnected = (deviceIdToMonitor: String) => {
  bleManagerInstance.onDeviceDisconnected(deviceIdToMonitor, disconnectedListener)
}

const disconnectedListener = (error: BleError | null, device: Device | null) => {
  if (error) {
    console.error(JSON.stringify(error, null, 4))
  }
  if (device) {
    console.info(JSON.stringify(device, null, 4))

    // reconnect to the device
    device.connect()
  }
}
```

### Reading and writing to characteristics

#### Prepare the connection with your device

The first thing you need to do is connect to your device. Once the connection is established you can only perform basic operations without the possibility of interacting with the services on the device. To be able to interact with the services on the device, so you need to call an additional command `device.discoverAllServicesAndCharacteristics()` because even though you know what service and characteristics are on the device, they all must be visible to the GATT client, which handles all operations.

```js
device
  .connect()
  .then(device => {
    return device.discoverAllServicesAndCharacteristics()
  })
  .then(device => {
    // A fully functional connection you can use, now you can read, write and monitor values
  })
  .catch(error => {
    // Handle errors
  })
```

#### Reading from a characteristic

To read a value from a characteristic, you need to call the `readCharacteristic` method on the device object. The method returns a promise that resolves to the characteristic value.

```js
device
  .readCharacteristicForService(serviceUUID, characteristicUUID)
  .then(characteristic => {
    console.log('Read characteristic value:', characteristic.value)
  })
  .catch(error => {
    console.error('Read characteristic error:', error)
  })
```

#### Writing to a characteristic

To write a value to a characteristic, you need to call the `writeCharacteristicWithResponse` or `writeCharacteristicWithoutResponse` method on the device object. The method returns a promise that resolves when the write operation is completed.

```js
device
  .writeCharacteristicWithResponseForService(serviceUUID, characteristicUUID, value)
  .then(() => {
    console.log('Write characteristic success')
  })
  .catch(error => {
    console.error('Write characteristic error:', error)
  })
```

### Connecting to a device that is already connected to the OS

If you want to connect to a device that isn't discoverable because it is already connected to the system, you can use the `getConnectedDevices` method to get a list of connected devices. Then you can use the `connect` method on the device object to connect to the device, after making sure that the device is not already connected.

```js
bleManagerInstance
  .getConnectedDevices([serviceUUIDs])
  .then(devices => {
    const device = devices.find(d => d.id === deviceIdWeWantToConnectTo)

    if (device && !device.isConnected) {
      device.connect()
    }
  })
  .catch(error => {
    console.error('Get connected devices error:', error)
  })
```

### Collecting native logs

If you encounter any issues with the library, you can enable native logs to get more information about what is happening under the hood. To enable native logs, you need to set the `logLevel` property on the BleManager instance to `LogLevel.Verbose`.

```js
bleManagerInstance.setLogLevel(LogLevel.Verbose)
```

#### Android

To collect native logs on Android, you can open the Logcat in Android Studio and set filters to `package:mine (tag:BluetoothGatt | tag:ReactNativeJS | RxBle)`.

#### iOS

To collect native logs on iOS, you can open the Xcode console.
