# Migration build from version 1.1.0 to 2.0.0

1) Open `./ios/Podfile` file and remove following line:
   ```ruby
   pod 'react-native-ble-plx-swift', :path => '../node_modules/react-native-ble-plx'
   ```