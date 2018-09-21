package com.polidea.blenative.utils

import android.bluetooth.BluetoothGattCharacteristic

val BluetoothGattCharacteristic.isWritableWithResponse: Boolean
    get() = properties and BluetoothGattCharacteristic.PROPERTY_WRITE != 0

val BluetoothGattCharacteristic.isWritableWithoutResponse: Boolean
    get() = properties and BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE != 0

val BluetoothGattCharacteristic.isReadable: Boolean
    get() = properties and BluetoothGattCharacteristic.PROPERTY_READ != 0

val BluetoothGattCharacteristic.isNotifiable: Boolean
    get() = properties and BluetoothGattCharacteristic.PROPERTY_NOTIFY != 0

val BluetoothGattCharacteristic.isIndicatable: Boolean
    get() = properties and BluetoothGattCharacteristic.PROPERTY_INDICATE != 0