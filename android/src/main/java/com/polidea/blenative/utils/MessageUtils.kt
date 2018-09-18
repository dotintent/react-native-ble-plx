package com.polidea.blenative.utils

import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.os.Handler
import android.os.Message
import com.polidea.blenative.Constants
import com.polidea.blenative.centralmanager.Callback
import java.util.function.BinaryOperator

fun Handler.onReadRemoteRssiMessage(gatt: BluetoothGatt, rssi: Int, status: Int): Message {
    return obtainMessage(Constants.PeripheralCallback.ON_READ_REMOTE_RSSI, mapOf(
            Pair("gatt", gatt),
            Pair("rssi", rssi),
            Pair("status", status)
    ))
}

fun Handler.onCharacteristicReadMessage(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic, status: Int): Message {
    return obtainMessage(Constants.PeripheralCallback.ON_CHARACTERISTIC_READ, mapOf(
            Pair("gatt", gatt),
            Pair("characteristic", characteristic),
            Pair("status", status)
    ))
}

fun Handler.onCharacteristicWriteMessage(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic, status: Int): Message {
    return obtainMessage(Constants.PeripheralCallback.ON_CHARACTERISTIC_WRITE, mapOf(
            Pair("gatt", gatt),
            Pair("characteristic", characteristic),
            Pair("status", status)
    ))
}

fun Handler.onServicesDiscoveredMessage(gatt: BluetoothGatt, status: Int): Message {
    return obtainMessage(Constants.PeripheralCallback.ON_SERVICES_DISCOVERED, mapOf(
            Pair("gatt", gatt),
            Pair("status", status)
    ))
}

fun Handler.onMtuChangedMessage(gatt: BluetoothGatt, mtu: Int, status: Int): Message {
    return obtainMessage(Constants.PeripheralCallback.ON_MTU_CHANGED, mapOf(
            Pair("gatt", gatt),
            Pair("mtu", mtu),
            Pair("status", status)
    ))
}

fun Handler.onDescriptorWriteMessage(gatt: BluetoothGatt, descriptor: BluetoothGattDescriptor, status: Int): Message {
    return obtainMessage(Constants.PeripheralCallback.ON_DESCRIPTOR_WRITE, mapOf(
            Pair("gatt", gatt),
            Pair("descriptor", descriptor),
            Pair("status", status)
    ))
}

fun Handler.onCharacteristicChangedMessage(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic): Message {
    return obtainMessage(Constants.PeripheralCallback.ON_CHARACTERISTIC_CHANGED, mapOf(
            Pair("gatt", gatt),
            Pair("characteristic", characteristic)
    ))
}

fun Handler.onConnectionStateChangeMessage(gatt: BluetoothGatt, status: Int, newState: Int): Message {
    return obtainMessage(Constants.PeripheralCallback.ON_CONNECTION_STATE_CHANGE, mapOf(
            Pair("gatt", gatt),
            Pair("status", status),
            Pair("newState", newState)
    ))
}

fun Handler.connectToPeripheralMessage(device: BluetoothDevice, autoConnect: Boolean): Message {
    return obtainMessage(Constants.CentralAction.CONNECT_TO_PERIPHERAL, mapOf(
            Pair("device", device),
            Pair("autoConnect", autoConnect)
    ))
}

fun Handler.disconnectMessage(gatt: BluetoothGatt): Message {
    return obtainMessage(Constants.CentralAction.DISCONNECT, mapOf(
            Pair("gatt", gatt)
    ))
}

fun Handler.discoverServicesMessage(gatt: BluetoothGatt): Message {
    return obtainMessage(Constants.CentralAction.DISCOVER_SERVICES, mapOf(
            Pair("gatt", gatt)
    ))
}

fun Handler.readRemoteRssiMessage(gatt: BluetoothGatt): Message {
    return obtainMessage(Constants.CentralAction.READ_REMOTE_RSSI, mapOf(
            Pair("gatt", gatt)
    ))
}

fun Handler.requestMtu(gatt: BluetoothGatt, mtu: Int): Message {
    return obtainMessage(Constants.CentralAction.REQUEST_MTU, mapOf(
            Pair("gatt", gatt),
            Pair("mtu", mtu)
    ))
}

fun Handler.readCharacteristic(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic): Message {
    return obtainMessage(Constants.CentralAction.READ_CHARACTERISTIC, mapOf(
            Pair("gatt", gatt),
            Pair("characteristic", characteristic)
    ))
}

fun Handler.writeCharacteristic(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic, response: Boolean, valueBase64: String): Message {
    return obtainMessage(Constants.CentralAction.WRITE_CHARACTERISTIC, mapOf(
            Pair("gatt", gatt),
            Pair("characteristic", characteristic),
            Pair("characteristicResponse", response),
            Pair("characteristicValueBase64", valueBase64)
    ))
}

fun Handler.setNotificationEnabledMessage(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic, enabled: Boolean): Message {
    return obtainMessage(Constants.CentralAction.SET_NOTIFICATION_ENABLED, mapOf(
            Pair("gatt", gatt),
            Pair("characteristic", characteristic),
            Pair("characteristicEnabled", enabled)
    ))
}

val Message.gatt: BluetoothGatt?
    get() = (obj as? Map<*, *>)?.get("gatt") as? BluetoothGatt

val Message.rssi: Int?
    get() = (obj as? Map<*, *>)?.get("rssi") as? Int

val Message.status: Int?
    get() = (obj as? Map<*, *>)?.get("status") as? Int

val Message.characteristic: BluetoothGattCharacteristic?
    get() = (obj as? Map<*, *>)?.get("characteristic") as? BluetoothGattCharacteristic

val Message.mtu: Int?
    get() = (obj as? Map<*, *>)?.get("mtu") as? Int

val Message.descriptor: BluetoothGattDescriptor?
    get() = (obj as? Map<*, *>)?.get("descriptor") as? BluetoothGattDescriptor

val Message.newState: Int?
    get() = (obj as? Map<*, *>)?.get("newState") as? Int

val Message.autoConnect: Boolean?
    get() = (obj as? Map<*, *>)?.get("autoConnect") as? Boolean

val Message.device: BluetoothDevice?
    get() = (obj as? Map<*, *>)?.get("device") as? BluetoothDevice

val Message.characteristicResponse: Boolean?
    get() = (obj as? Map<*, *>)?.get("characteristicResponse") as? Boolean

val Message.characteristicValueBase64: String?
    get() = (obj as? Map<*, *>)?.get("characteristicValueBase64") as? String

val Message.characteristicEnabled: Boolean?
    get() = (obj as? Map<*, *>)?.get("characteristicEnabled") as? Boolean