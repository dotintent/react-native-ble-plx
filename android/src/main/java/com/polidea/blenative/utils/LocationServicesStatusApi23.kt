package com.polidea.blenative.utils

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.LocationManager
import android.os.Build
import android.os.Process
import android.provider.Settings

class LocationServicesStatusApi23(
        private val context: Context
) : LocationServicesStatus {

    override val isLocationPermissionOk: Boolean
        get() = isLocationPermissionGranted

    override val isLocationProviderOk: Boolean
        get() = !isLocationProviderEnabledRequired || isLocationProviderEnabled

    /**
     * A function that returns true if the location services may be needed to be turned ON. Since there are no official guidelines
     * for Android Wear check is disabled.
     *
     * @see [Google Groups Discussion](https://code.google.com/p/android/issues/detail?id=189090)
     *
     * @return true if Location Services need to be turned ON
     */
    private val isLocationProviderEnabledRequired: Boolean
        get() = !context.isAndroidWear && context.targetSdkVersion >= Build.VERSION_CODES.M

    private val isLocationProviderEnabled: Boolean
        get() {
            val contentResolver = context.contentResolver
            val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
            return try {
                Settings.Secure.getInt(contentResolver, Settings.Secure.LOCATION_MODE) != Settings.Secure.LOCATION_MODE_OFF
            } catch (e: Settings.SettingNotFoundException) {
                locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER) || locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)
            }
        }

    private val isLocationPermissionGranted: Boolean
        get() = isPermissionGranted(context, Manifest.permission.ACCESS_COARSE_LOCATION) || isPermissionGranted(context, Manifest.permission.ACCESS_FINE_LOCATION)

    private fun isPermissionGranted(context: Context, permission: String?): Boolean {
        if (permission == null) {
            throw IllegalArgumentException("permission is null")
        }

        return context.checkPermission(permission, android.os.Process.myPid(), Process.myUid()) == PackageManager.PERMISSION_GRANTED
    }
}