# react-native-ble-plx
React Native Bluetooth Low Energry library using [RxBluetoothKit](https://github.com/Polidea/RxBluetoothKit) and [RxAndroidBle](https://github.com/Polidea/RxAndroidBle) as it's backend libraries.

### iOS example app installation steps
* Go to example project folder `cd examples/ReactBLEScanner`.
* Install standard packages executing: `npm install`.
* Install local `react-native-ble-plx` module by executing script `./install-ble-lib.sh`.
* Go to folder containing native framework in `cd ./node_modules/react-native-ble-plx/ios/BleClientManager`.
* Fetch required dependencies: `carthage bootstrap --no-build --platform "iOS"`.
* Build all dependencies including local framework: `carthage build --no-skip-current --platform "iOS"` (it will take a while but it's done only once).
* Open Xcode example project in `./examples/ReactBLEScanner/ios/ReactBLEScanner.xcodeproj`.
* Build and run.

You can develop native modules directly from example Xcode project. After work is done you can sync your changes to be visible in git by executing `./sync-ble-lib.sh` from `./examples/ReactBLEScanner` folder. *Note*: Your working files in root directory may be deleted by this operation.

### Installation in fresh react-native project

Installation description will be available as soon as library will be published in npm repository. 