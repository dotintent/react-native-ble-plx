package com.polidea.blenative.utils

import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattService

object ObjectIdGenerators {
    val devices = ObjectIdGenerator<BluetoothDevice>()
    val services = ObjectIdGenerator<BluetoothGattService>()
    val characteristics = ObjectIdGenerator<BluetoothGattCharacteristic>()
}

class ObjectIdGenerator<Element> {
    private var objectToIdentifier = mutableMapOf<Element, Int>()

    private var currentId = 0

    fun idForElement(element: Element): Int {
        val identifier = objectToIdentifier[element]
        if (identifier != null) {
            return identifier
        }
        objectToIdentifier[element] = ++currentId
        return currentId
    }
}