#!/bin/bash

set +e

echo no | android create avd --force -n test -t android-28 --abi armeabi-v7a -c 100M
emulator -avd test -no-audio -no-window &
android-wait-for-emulator
adb shell input keyevent 82 &
