package com.bleplx

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat

/**
 * Runtime permission checks for BLE operations on Android.
 *
 * API < 31:  BLUETOOTH + ACCESS_FINE_LOCATION
 * API 31+:   BLUETOOTH_SCAN + BLUETOOTH_CONNECT
 */
object PermissionHelper {

    enum class PermissionGroup {
        SCAN,
        CONNECT
    }

    /**
     * Returns the list of missing permissions for the requested group.
     * Empty list means all permissions are granted.
     */
    fun getMissingPermissions(context: Context, group: PermissionGroup): List<String> {
        val required = getRequiredPermissions(group)
        return required.filter {
            ContextCompat.checkSelfPermission(context, it) != PackageManager.PERMISSION_GRANTED
        }
    }

    fun hasPermissions(context: Context, group: PermissionGroup): Boolean {
        return getMissingPermissions(context, group).isEmpty()
    }

    fun getRequiredPermissions(group: PermissionGroup): List<String> {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            // API 31+ (Android 12+)
            when (group) {
                PermissionGroup.SCAN -> listOf(Manifest.permission.BLUETOOTH_SCAN)
                PermissionGroup.CONNECT -> listOf(Manifest.permission.BLUETOOTH_CONNECT)
            }
        } else {
            // API < 31
            when (group) {
                PermissionGroup.SCAN -> listOf(
                    Manifest.permission.BLUETOOTH,
                    Manifest.permission.ACCESS_FINE_LOCATION
                )
                PermissionGroup.CONNECT -> listOf(
                    Manifest.permission.BLUETOOTH
                )
            }
        }
    }

    /**
     * Quick check if Bluetooth adapter is available.
     */
    fun isBluetoothSupported(context: Context): Boolean {
        val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? android.bluetooth.BluetoothManager
        return manager?.adapter != null
    }

    /**
     * Check if Bluetooth is currently enabled.
     */
    fun isBluetoothEnabled(context: Context): Boolean {
        val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? android.bluetooth.BluetoothManager
        return manager?.adapter?.isEnabled == true
    }
}
