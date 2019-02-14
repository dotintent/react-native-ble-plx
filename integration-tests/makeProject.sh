#!/bin/bash

set -eo pipefail

RN_VERSION=$1

react-native init --version="$RN_VERSION" Setup
cd Setup
npm install ../.. --save
npm install ../on-device-diagnose --save
react-native link react-native-ble-plx
bash ../applyPatches.sh $RN_VERSION
cd ..
ruby enableSwift.rb