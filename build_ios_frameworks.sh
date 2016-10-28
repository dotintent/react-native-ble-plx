#!/bin/bash

command -v carthage >/dev/null 2>&1 || { 
  echo >&2 "Warning: Carthage is required to compile frameworks for iOS backend. You can install it with brew: brew install carthage. After installation go to ./node_modules/react-native-ble-plx and run ./build_ios_frameworks.sh or reinstall node module."
  exit 0 
}

cd ./ios/BleClientManager
carthage bootstrap --no-build --platform "iOS"
carthage build --toolchain com.apple.dt.toolchain.Swift_2_3 --no-skip-current --platform "iOS"
