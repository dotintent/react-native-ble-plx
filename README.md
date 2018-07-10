<p align="center">
  <img alt="react-native-ble-plx" src="docs/logo.png" />
</p>

React Native Bluetooth Low Energy library using [RxBluetoothKit](https://github.com/Polidea/RxBluetoothKit) and [RxAndroidBle](https://github.com/Polidea/RxAndroidBle) as it's backend libraries.

Example apps are available in [Google Play](https://play.google.com/store/apps/details?id=com.polidea.sniffator) and [App Store](https://itunes.apple.com/us/app/sniffator/id1147266354?ls=1&mt=8)!

[![GooglePlay](docs/googleplay.png)](https://play.google.com/store/apps/details?id=com.polidea.sniffator) [![AppStore](docs/appstore.png)](https://itunes.apple.com/us/app/sniffator/id1147266354?ls=1&mt=8)

---

[![NPM](https://nodei.co/npm/react-native-ble-plx.png?downloads=true)](https://nodei.co/npm/react-native-ble-plx/)

---

## About this library

What this library supports:

* [observing device's Bluetooth adapter state](https://github.com/Polidea/react-native-ble-plx/wiki/Bluetooth-Adapter-State)
* [scanning BLE devices](https://github.com/Polidea/react-native-ble-plx/wiki/Bluetooth-Scanning)
* [making connections to peripherals](https://github.com/Polidea/react-native-ble-plx/wiki/Device-Connecting)
* [discovering services/characteristics](https://github.com/Polidea/react-native-ble-plx/wiki/Device-Service-Discovery)
* [reading](https://github.com/Polidea/react-native-ble-plx/wiki/Characteristic-Reading)/[writing](https://github.com/Polidea/react-native-ble-plx/wiki/Characteristic-Writing) characteristics
* [observing characteristic notifications/indications](https://github.com/Polidea/react-native-ble-plx/wiki/Characteristic-Notifying)
* [reading RSSI](https://github.com/Polidea/react-native-ble-plx/wiki/RSSI-Reading)
* [negotiating MTU](https://github.com/Polidea/react-native-ble-plx/wiki/MTU-Negotiation)

What this library does NOT support:

* turning the device's Bluetooth adapter on
* [bonding peripherals](https://github.com/Polidea/react-native-ble-plx/wiki/Device-Bonding)

## Recent Changes

**0.9.2**

* Update RxAndroidBle dependency to 1.6.0.
* Propagate `androidErrorCode` properly for `DeviceDisconnected` error.

[All previous changes](CHANGELOG.md)

## Documentation & Support

Documentation can be found [here](https://polidea.github.io/react-native-ble-plx/).

Contact us at [Gitter](https://gitter.im/RxBLELibraries/react-native-ble) if you have any questions, feedback or want to help!

## Configuration & Installation

### Important

If you do not have [Carthage](https://github.com/Carthage/Carthage) (ver. 0.21+) installed yet and
wish to set up for iOS, please install it first and only then follow the steps given below

### Automatically

```bash
npm install --save react-native-ble-plx
react-native link react-native-ble-plx
```

Both on iOS and Android continue manually from step 7.

### Manually

#### iOS

1. Add `react-native-ble-plx` to a project as a dependency in `package.json` file.
   For example `"react-native-ble-plx": "Polidea/react-native-ble-plx"` will install
   latest version from Polidea's Github repository.
2. Make sure that you have [Carthage](https://github.com/Carthage/Carthage) installed on your system.
3. Execute `npm install` to fetch and install a library.
4. Open iOS project located in `./ios` folder.
5. Move `BleClient.xcodeproj` located in `.node_modules/react-native-ble-plx/ios`
   using drag & drop to `Libraries` folder in your project.
6. In general settings of a target add `libBleClient.a` to Linked Frameworks and Libraries.
7. In `Build Settings`/`Search Paths`/`Framework search paths` add path: `$(SRCROOT)/../node_modules/react-native-ble-plx/ios/BleClientManager/Carthage/Build/iOS`.
8. In `Build Settings`/`Build Options`/`Always Embed Swift Standard Libraries` set to `Yes`.
9. In `Build Phases` click on top left button and add `New Run Script Phase`.

* Shell command: `/usr/local/bin/carthage copy-frameworks`
* Input Files:
  * `$(SRCROOT)/../node_modules/react-native-ble-plx/ios/BleClientManager/Carthage/Build/iOS/BleClientManager.framework`
  * `$(SRCROOT)/../node_modules/react-native-ble-plx/ios/BleClientManager/Carthage/Build/iOS/RxSwift.framework`
  * `$(SRCROOT)/../node_modules/react-native-ble-plx/ios/BleClientManager/Carthage/Build/iOS/RxBluetoothKit.framework`

10. Minimal supported version of iOS is 8.0
11. If you want to support background mode:
    * In your application target go to `Capabilities` tab and enable `Uses Bluetooth LE Accessories` in
      `Background Modes` section.
    * Pass `restoreStateIdentifier` and `restoreStateFunction` to `BleManager` constructor.

#### Android

1. Add `react-native-ble-plx` to a project as a dependency in `package.json` file.
   For example `"react-native-ble-plx": "Polidea/react-native-ble-plx"` will install
   latest version from Polidea's Github repository.
2. Execute `npm install` to fetch and install a library.
3. Open Android project located in `./android` folder.
4. In `settings.gradle` add following lines:

```groovy
include ':react-native-ble-plx'
project(':react-native-ble-plx').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-ble-plx/android')
```

5. In `MainApplication.getPackages` import and add BleModule package:

```java
import com.polidea.reactnativeble.BlePackage;
...

public class MainApplication extends Application implements ReactApplication {
    ...

    @Override
    protected List<ReactPackage> getPackages() {
      return Arrays.<ReactPackage>asList(
        new MainReactPackage(),
        new BlePackage()
      );
}
```

6. In `build.gradle` of `app` module add following dependency:

```groovy
dependencies {
   ...
   compile project(':react-native-ble-plx')
   ...
```

7. Additionaly make sure that min SDK version is at least 18:

```groovy
android {
    ...
    defaultConfig {
        minSdkVersion 18
        ...
```

8. In `AndroidManifest.xml`, add Bluetooth permissions and update `<uses-sdk/>`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    ...
    <uses-permission android:name="android.permission.BLUETOOTH"/>
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN"/>
    <uses-permission-sdk-23 android:name="android.permission.ACCESS_COARSE_LOCATION"/>

    <!-- Add this line if your application always requires BLE. More info can be found on:
         https://developer.android.com/guide/topics/connectivity/bluetooth-le.html#permissions
      -->
    <uses-feature android:name="android.hardware.bluetooth_le" android:required="true"/>

    <uses-sdk
        android:minSdkVersion="18"
        ...
```

## Expo

Currently [02.02.2018] to use this library with Expo one must first detach (eject) the project and follow the above instructions. Additionally on iOS there is a must to add a `Header Search Path` to other dependencies which are managed using `Pods`. To do so one has to add `$(SRCROOT)/../../../ios/Pods/Headers/Public/**` to `Header Search Path` in `BleClient` module using `XCode`. This can be further automated by a `git apply patch` executed as a `postinstall` script defined in `package.json`.

## Troubleshooting

### Problems with Proguard

Add this to your `app/proguard-rules.pro`

```
-dontwarn com.polidea.reactnativeble.**
```
