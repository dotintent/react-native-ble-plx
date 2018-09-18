package com.polidea.blenative.utils

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build

val Context.targetSdkVersion: Int
    get() = packageManager.getApplicationInfo(packageName, 0).targetSdkVersion

val Context.isAndroidWear: Boolean
    get() = Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT_WATCH && packageManager.hasSystemFeature(PackageManager.FEATURE_WATCH)