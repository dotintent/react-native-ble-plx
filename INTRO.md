<p align="center">
  <a href="https://github.com/Polidea/react-native-ble-plx"><img alt="react-native-ble-plx" src="logo.png" /></a>
</p>

This guide is an introduction to BLE stack and APIs exported by this library. All examples
will be based on CC2541 SensorTag.

## Creating BLE Manager

First step is to create BleManager instance which is an entry point to all available APIs.
Make sure to create it after application started its execution. For example we can do it in
Component's constructor:

```js
import { BleManager } from 'react-native-ble-plx';

constructor() {
    super();
    this.manager = new BleManager();
    ...
}
```

Only one instance of BleManager is allowed. When you don't need any BLE functionality you
can destroy created instance by calling `this.manager.destroy()` function. You can then
recreate `BleManager` later on as we did above.

## Waiting for Powered On state

When iOS application launches BLE stack is not immediately available and we need to check its status.
To detect current state and following state changes we can use `onStateChange()` function:

```js
componentWillMount() {
    const subscription = this.manager.onStateChange((state) => {
        if (state === 'PoweredOn') {
            this.scanAndConnect();
            subscription.remove();
        }
    }, true);
}
```

## Scanning devices

Devices needs to be scanned first to be able to connect to them. There is a simple function
which allows only one callback to be registered to handle detected devices:

```js
scanAndConnect() {
    this.manager.startDeviceScan(null, null, (error, device) => {
        if (error) {
            // Handle error (scanning will be stopped automatically)
            return
        }

        // Check if it is a device you are looking for based on advertisement data
        // or other criteria.
        if (device.name === 'TI BLE Sensor Tag' || 
            device.name === 'SensorTag') {
            
            // Stop scanning as it's not necessary if you are scanning for one device.
            this.manager.stopDeviceScan();

            // Proceed with connection.
        }
    });
}
```

It is worth to note that scanning function may emit one device multiple times. However 
when device is connected it won't broadcast and needs to be disconnected from central 
to be scanned again. Only one scanning listener can be registered.

## Connecting and discovering services and characteristics

Once device is scanned it is in disconnected state. We need to connect to it and discover 
all services and characteristics it contains. Services may be understood
as containers grouping characteristics based on their meaning. Characteristic is a
container for a value which can be read, written and monitored based on available
capabilities. For example connection may look like this:

```javascript
device.connect()
    .then((device) => {
        return device.discoverAllServicesAndCharacteristics()
    })
    .then((device) => {
       // Do work on device with services and characteristics
    })
    .catch((error) => {
        // Handle errors
    });
```

Discovery of services and characteristics is required to be executed once per connection\*. 
It can be a long process depending on number of characteristics and services available.

\* Extremely rarely, when peripheral's service/characteristic set can change during a connection 
an additional service discovery may be needed.

## Read, write and monitor values

After successful discovery of services you can call 
* {@link #blemanagerreadcharacteristicfordevice|BleManager.readCharacteristicForDevice()},
* {@link #blemanagerwritecharacteristicwithresponsefordevice|BleManager.writeCharacteristicWithResponseForDevice()}, 
* {@link #blemanagermonitorcharacteristicfordevice|BleManager.monitorCharacteristicForDevice()}

and other functions which are described in detail in documentation.

