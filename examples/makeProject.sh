#!/bin/sh

RN_VERSION=$1

react-native init --version="$RN_VERSION" Setup
cd Setup
npm install -S ../..
react-native link react-native-ble-plx
bash ../applyPatches.sh $RN_VERSION