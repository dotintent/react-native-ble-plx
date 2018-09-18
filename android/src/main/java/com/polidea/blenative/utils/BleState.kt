package com.polidea.blenative.utils

import android.bluetooth.BluetoothAdapter

enum class BleState(val value: String) {
    UNKNOWN("Unknown"),
    RESETTING("Resetting"),
    UNSUPPORTED("Unsupported"),
    UNAUTHORIZED("Unauthorized"),
    POWERED_OFF("PoweredOff"),
    POWERED_ON("PoweredOn");

    companion object {
        fun fromNativeState(state: Int) = when (state) {
            BluetoothAdapter.STATE_OFF -> BleState.POWERED_OFF
            BluetoothAdapter.STATE_ON -> BleState.POWERED_ON
            BluetoothAdapter.STATE_TURNING_OFF, BluetoothAdapter.STATE_TURNING_ON -> BleState.RESETTING
            else -> BleState.UNKNOWN
        }
    }
}