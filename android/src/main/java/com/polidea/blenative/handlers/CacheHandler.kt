package com.polidea.blenative.handlers

import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattService
import com.polidea.blenative.utils.ObjectIdGenerators

class CacheHandler {
    private val discoveredDevices = mutableMapOf<Int, BluetoothDevice>()

    private val gatts = mutableMapOf<Int, BluetoothGatt>()

    private val discoveredServices = mutableMapOf<Int, BluetoothGattService>()

    private val discoveredCharacteristics = mutableMapOf<Int, BluetoothGattCharacteristic>()

    private val devicesMtu = mutableMapOf<Int, Int>()

    fun addDevice(device: BluetoothDevice) {
        discoveredDevices[ObjectIdGenerators.devices.idForElement(device)] = device
    }

    fun device(id: Int): BluetoothDevice? = discoveredDevices[id]

    fun addGatt(gatt: BluetoothGatt) {
        gatts[ObjectIdGenerators.devices.idForElement(gatt.device)] = gatt
    }

    fun gatt(device: BluetoothDevice): BluetoothGatt? = gatts[ObjectIdGenerators.devices.idForElement(device)]

    fun removeGatt(gatt: BluetoothGatt) {
        gatts.remove(ObjectIdGenerators.devices.idForElement(gatt.device))
    }

    fun addService(service: BluetoothGattService) {
        discoveredServices[ObjectIdGenerators.services.idForElement(service)] = service
    }

    fun service(id: Int): BluetoothGattService? = discoveredServices[id]

    fun addCharacteristic(characteristic: BluetoothGattCharacteristic) {
        discoveredCharacteristics[ObjectIdGenerators.characteristics.idForElement(characteristic)] = characteristic
    }

    fun characteristic(id: Int): BluetoothGattCharacteristic? = discoveredCharacteristics[id]

    fun updateDeviceMtu(deviceId: Int, mtu: Int) {
        devicesMtu[deviceId] = mtu
    }

    fun deviceMtu(deviceId: Int): Int? = devicesMtu[deviceId]

    fun clearForGatt(gatt: BluetoothGatt) {
        devicesMtu.remove(ObjectIdGenerators.devices.idForElement(gatt.device))
        for (service in gatt.services) {
            discoveredServices.remove(ObjectIdGenerators.services.idForElement(service))
            for (characteristic in service.characteristics) {
                discoveredCharacteristics.remove(ObjectIdGenerators.characteristics.idForElement(characteristic))
            }
        }
    }

    fun clearAll() {
        discoveredDevices.clear()
        gatts.clear()
        discoveredDevices.clear()
        discoveredCharacteristics.clear()
        devicesMtu.clear()
    }
}