#!/bin/bash
rsync -a --delete --progress ../../ ./node_modules/react-native-ble-plx --exclude examples --exclude '.*' --exclude ios/BleClientManager/Carthage

