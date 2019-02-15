#!/bin/bash -x

echo no | ${ANDROID_HOME}tools/bin/avdmanager create avd --force -n test -k "system-images;android-22;default;armeabi-v7a"
${ANDROID_HOME}tools/emulator -avd test -no-audio -no-window &
android-wait-for-emulator
adb shell settings put global window_animation_scale 0 &
adb shell settings put global transition_animation_scale 0 &
adb shell settings put global animator_duration_scale 0 &
adb shell input keyevent 82 &

echo "Emulator is ready"
