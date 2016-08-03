#!/bin/bash
rsync -a --delete --progress ../../ ./node_modules/react-native-ble-plx \
 --exclude examples \
 --exclude '.*' \
 --exclude ios/BleClientManager/Carthage \
 --exclude android/build \
 --exclude android/react-native-ble-plx.iml \
 --exclude README.md

