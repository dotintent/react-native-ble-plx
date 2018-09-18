package com.polidea.blenative.utils

import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import com.polidea.blenative.Constants

fun BluetoothGatt.setNotificationEnabled(characteristic: BluetoothGattCharacteristic, enabled: Boolean): Boolean {
    setCharacteristicNotification(characteristic, enabled)

    val descriptor = characteristic.getDescriptor(Constants.CHARACTERISTIC_UPDATE_NOTIFICATION_DESCRIPTOR)
    descriptor.value = if (enabled) BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE else BluetoothGattDescriptor.DISABLE_NOTIFICATION_VALUE
    val succeeded = writeDescriptor(descriptor)
    if (!succeeded) {
        setCharacteristicNotification(characteristic, !enabled)
    }
    return succeeded
}

fun BluetoothGatt.isNotificationEnabled(characteristic: BluetoothGattCharacteristic): Boolean {
    val descriptor = characteristic.getDescriptor(Constants.CHARACTERISTIC_UPDATE_NOTIFICATION_DESCRIPTOR)
    return descriptor.value?.contentEquals(BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE) ?: false
}
