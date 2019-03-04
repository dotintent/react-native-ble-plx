#!/bin/bash

EMULATOR_NAME=test

echo "Creating emulator..."
echo no | android create avd --force -n $EMULATOR_NAME -t android-25 --abi google_apis/armeabi-v7a
echo "Booting emulator - $EMULATOR_NAME..."
emulator -avd $EMULATOR_NAME -no-window &
sleep 2
echo "Waiting for emulator..."
android-wait-for-emulator
echo "Disabling animations..."
adb shell settings put global window_animation_scale 0 &
adb shell settings put global transition_animation_scale 0 &
adb shell settings put global animator_duration_scale 0 &
echo "Unlocking emulator..."
adb shell input keyevent 82 &

echo "Emulator is ready"
