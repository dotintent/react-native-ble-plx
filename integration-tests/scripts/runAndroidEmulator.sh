#!/bin/bash -x

echo no | android create avd --force -n test -t android-22 --abi google_apis/armeabi-v7a
emulator -avd test -no-audio -no-window &
android-wait-for-emulator
android-wait-for-emulator
adb shell settings put global window_animation_scale 0 &
adb shell settings put global transition_animation_scale 0 &
adb shell settings put global animator_duration_scale 0 &
adb shell input keyevent 82 &

echo "Emulator is ready"
