#!/bin/bash

cd ./ios/BleClientManager
carthage bootstrap --no-build --platform "iOS"
carthage build --no-skip-current --platform "iOS"
