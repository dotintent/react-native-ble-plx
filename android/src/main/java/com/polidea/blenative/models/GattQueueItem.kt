package com.polidea.blenative.models

import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCharacteristic

interface GattQueueItem {
    val gatt: BluetoothGatt
}

data class GattDisconnectQueueItem(override val gatt: BluetoothGatt) : GattQueueItem

data class GattDiscoverServicesQueueItem(override val gatt: BluetoothGatt) : GattQueueItem

data class GattReadRemoteRssiQueueItem(override val gatt: BluetoothGatt) : GattQueueItem

data class GattRequestMtuQueueItem(override val gatt: BluetoothGatt, val mtu: Int) : GattQueueItem

data class GattReadCharacteristicQueueItem(override val gatt: BluetoothGatt, val characteristic: BluetoothGattCharacteristic) : GattQueueItem

data class GattWriteCharacteristicQueueItem(
        override val gatt: BluetoothGatt,
        val characteristic: BluetoothGattCharacteristic,
        val response: Boolean,
        val valueBase64: String
) : GattQueueItem

data class GattSetNotificationEnabledQueueItem(
        override val gatt: BluetoothGatt,
        val characteristic: BluetoothGattCharacteristic,
        val enabled: Boolean
) : GattQueueItem