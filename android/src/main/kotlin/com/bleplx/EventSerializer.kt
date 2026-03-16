package com.bleplx

import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattService
import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap

/**
 * Serializes native BLE objects into the Codegen event types
 * defined in NativeBlePlx.ts (ScanResult, DeviceInfo, etc.)
 */
object EventSerializer {

    // ---- ScanResult ----

    fun serializeScanResult(
        deviceAddress: String,
        deviceName: String?,
        rssi: Int,
        serviceUuids: List<String>,
        manufacturerData: ByteArray?
    ): WritableMap {
        val map = Arguments.createMap()
        map.putString("id", deviceAddress)
        if (deviceName != null) map.putString("name", deviceName) else map.putNull("name")
        map.putInt("rssi", rssi)
        val uuidsArray = Arguments.createArray()
        serviceUuids.forEach { uuidsArray.pushString(it) }
        map.putArray("serviceUuids", uuidsArray)
        if (manufacturerData != null) {
            map.putString("manufacturerData", Base64.encodeToString(manufacturerData, Base64.NO_WRAP))
        } else {
            map.putNull("manufacturerData")
        }
        return map
    }

    // ---- DeviceInfo ----

    fun serializeDeviceInfo(
        deviceAddress: String,
        deviceName: String?,
        rssi: Int = 0,
        mtu: Int = 23,
        isConnectable: Boolean? = null,
        serviceUuids: List<String> = emptyList(),
        manufacturerData: ByteArray? = null
    ): WritableMap {
        val map = Arguments.createMap()
        map.putString("id", deviceAddress)
        if (deviceName != null) map.putString("name", deviceName) else map.putNull("name")
        map.putInt("rssi", rssi)
        map.putInt("mtu", mtu)
        if (isConnectable != null) map.putBoolean("isConnectable", isConnectable) else map.putNull("isConnectable")
        val uuidsArray = Arguments.createArray()
        serviceUuids.forEach { uuidsArray.pushString(it) }
        map.putArray("serviceUuids", uuidsArray)
        if (manufacturerData != null) {
            map.putString("manufacturerData", Base64.encodeToString(manufacturerData, Base64.NO_WRAP))
        } else {
            map.putNull("manufacturerData")
        }
        return map
    }

    // ---- CharacteristicInfo ----

    fun serializeCharacteristic(
        deviceId: String,
        serviceUuid: String,
        characteristic: BluetoothGattCharacteristic,
        value: ByteArray? = null
    ): WritableMap {
        val map = Arguments.createMap()
        map.putString("deviceId", deviceId)
        map.putString("serviceUuid", serviceUuid)
        map.putString("uuid", characteristic.uuid.toString())
        if (value != null) {
            map.putString("value", Base64.encodeToString(value, Base64.NO_WRAP))
        } else {
            map.putNull("value")
        }
        val props = characteristic.properties
        map.putBoolean("isNotifying", false) // Will be updated by monitor logic
        map.putBoolean("isIndicatable", props and BluetoothGattCharacteristic.PROPERTY_INDICATE != 0)
        map.putBoolean("isReadable", props and BluetoothGattCharacteristic.PROPERTY_READ != 0)
        map.putBoolean("isWritableWithResponse", props and BluetoothGattCharacteristic.PROPERTY_WRITE != 0)
        map.putBoolean("isWritableWithoutResponse", props and BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE != 0)
        return map
    }

    fun serializeCharacteristicSimple(
        deviceId: String,
        serviceUuid: String,
        characteristicUuid: String,
        value: ByteArray?,
        isNotifying: Boolean = false,
        properties: Int = 0
    ): WritableMap {
        val map = Arguments.createMap()
        map.putString("deviceId", deviceId)
        map.putString("serviceUuid", serviceUuid)
        map.putString("uuid", characteristicUuid)
        if (value != null) {
            map.putString("value", Base64.encodeToString(value, Base64.NO_WRAP))
        } else {
            map.putNull("value")
        }
        map.putBoolean("isNotifying", isNotifying)
        map.putBoolean("isIndicatable", properties and BluetoothGattCharacteristic.PROPERTY_INDICATE != 0)
        map.putBoolean("isReadable", properties and BluetoothGattCharacteristic.PROPERTY_READ != 0)
        map.putBoolean("isWritableWithResponse", properties and BluetoothGattCharacteristic.PROPERTY_WRITE != 0)
        map.putBoolean("isWritableWithoutResponse", properties and BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE != 0)
        return map
    }

    // ---- ConnectionStateEvent ----

    fun serializeConnectionStateEvent(
        deviceId: String,
        state: String,
        errorCode: Int? = null,
        errorMessage: String? = null
    ): WritableMap {
        val map = Arguments.createMap()
        map.putString("deviceId", deviceId)
        map.putString("state", state)
        if (errorCode != null) map.putInt("errorCode", errorCode) else map.putNull("errorCode")
        if (errorMessage != null) map.putString("errorMessage", errorMessage) else map.putNull("errorMessage")
        return map
    }

    // ---- CharacteristicValueEvent ----

    fun serializeCharacteristicValueEvent(
        deviceId: String,
        serviceUuid: String,
        characteristicUuid: String,
        value: ByteArray,
        transactionId: String? = null
    ): WritableMap {
        val map = Arguments.createMap()
        map.putString("deviceId", deviceId)
        map.putString("serviceUuid", serviceUuid)
        map.putString("characteristicUuid", characteristicUuid)
        map.putString("value", Base64.encodeToString(value, Base64.NO_WRAP))
        if (transactionId != null) map.putString("transactionId", transactionId) else map.putNull("transactionId")
        return map
    }

    // ---- StateChangeEvent ----

    fun serializeStateChangeEvent(state: String): WritableMap {
        val map = Arguments.createMap()
        map.putString("state", state)
        return map
    }

    // ---- RestoreStateEvent ----

    fun serializeRestoreStateEvent(devices: WritableArray): WritableMap {
        val map = Arguments.createMap()
        map.putArray("devices", devices)
        return map
    }
}
