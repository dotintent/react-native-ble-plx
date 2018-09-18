package com.polidea.blenative.utils

import android.bluetooth.BluetoothGattCharacteristic


object CharacteristicUtils {
    fun isWriteableWithResponse(characteristic: BluetoothGattCharacteristic): Boolean {
        return characteristic.properties and BluetoothGattCharacteristic.PROPERTY_WRITE != 0
    }

    fun isWriteableWithoutResponse(characteristic: BluetoothGattCharacteristic): Boolean {
        return characteristic.properties and BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE != 0
    }

    fun isReadable(characteristic: BluetoothGattCharacteristic): Boolean {
        return characteristic.properties and BluetoothGattCharacteristic.PROPERTY_READ != 0
    }

    fun isNotifiable(characteristic: BluetoothGattCharacteristic): Boolean {
        return characteristic.properties and BluetoothGattCharacteristic.PROPERTY_NOTIFY != 0
    }

    fun isIndicatable(characteristic: BluetoothGattCharacteristic): Boolean {
        return characteristic.properties and BluetoothGattCharacteristic.PROPERTY_INDICATE != 0
    }
}