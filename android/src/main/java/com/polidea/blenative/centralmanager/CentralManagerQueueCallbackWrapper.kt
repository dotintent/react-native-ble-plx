package com.polidea.blenative.centralmanager

import android.annotation.SuppressLint
import android.bluetooth.BluetoothGattCharacteristic
import com.polidea.blenative.handlers.GattQueueHandler
import com.polidea.blenative.handlers.NotificationHandler
import com.polidea.blenative.handlers.RequestHandler
import com.polidea.blenative.models.*
import com.polidea.blenative.utils.Base64Converter
import com.polidea.blenative.utils.ObjectIdGenerators
import com.polidea.blenative.utils.setNotificationEnabled

class CentralManagerQueueCallbackWrapper(
        private val requestHandler: RequestHandler,
        private val notificationHandler: NotificationHandler
) : GattQueueHandler.Callback {
    override fun processItem(item: GattQueueItem): Boolean {
        when (item) {
            is GattDisconnectQueueItem -> return handleDisconnect(item)
            is GattDiscoverServicesQueueItem -> return handleDiscoverService(item)
            is GattReadRemoteRssiQueueItem -> return handleReadRemoteRssi(item)
            is GattRequestMtuQueueItem -> return handleRequestMtu(item)
            is GattReadCharacteristicQueueItem -> return handleReadCharacteristic(item)
            is GattWriteCharacteristicQueueItem -> return handleWriteCharacteristic(item)
            is GattSetNotificationEnabledQueueItem -> return handleSetNotificationEnabled(item)
        }
        return false
    }

    private fun handleDisconnect(item: GattDisconnectQueueItem): Boolean {
        item.gatt.disconnect()
        return true
    }

    private fun handleDiscoverService(item: GattDiscoverServicesQueueItem): Boolean {
        val gatt = item.gatt
        val deviceId = ObjectIdGenerators.devices.idForElement(gatt.device)
        val request = requestHandler.findRequest(deviceId, RequestType.DISCOVER_SERVICES)
                ?: return false
        if (!gatt.discoverServices()) {
            request.callback(BleError.servicesDiscoveryFailed(gatt.device.address, reason = "Could not start discoverServices").asErrorResult())
            requestHandler.removeRequest(request)
            return false
        }
        return true
    }

    private fun handleReadRemoteRssi(item: GattReadRemoteRssiQueueItem): Boolean {
        val gatt = item.gatt
        val deviceId = ObjectIdGenerators.devices.idForElement(gatt.device)
        val request = requestHandler.findRequest(deviceId, RequestType.READ_RSSI) ?: return false
        if (!gatt.readRemoteRssi()) {
            request.callback.invoke(
                    BleError.peripheralRssiReadFailed(gatt.device.address, reason = "Could not start readRemoteRssi").asErrorResult()
            )
            requestHandler.removeRequest(request)
            return false
        }
        return true
    }

    @SuppressLint("NewApi")
    private fun handleRequestMtu(item: GattRequestMtuQueueItem): Boolean {
        val gatt = item.gatt
        val deviceId = ObjectIdGenerators.devices.idForElement(gatt.device)
        val request = requestHandler.findRequest(deviceId, RequestType.MTU) ?: return false
        if (!gatt.requestMtu(item.mtu)) {
            request.callback.invoke(
                    BleError.peripheralMtuChangeFailed(gatt.device.address, reason = "Could not start requestMtu").asErrorResult()
            )
            requestHandler.removeRequest(request)
            return false
        }
        return true
    }

    private fun handleReadCharacteristic(item: GattReadCharacteristicQueueItem): Boolean {
        val gatt = item.gatt
        val characteristic = item.characteristic

        val characteristicId = ObjectIdGenerators.characteristics.idForElement(characteristic)
        val request = requestHandler.findRequest(characteristicId, RequestType.READ)
                ?: return false
        if (!gatt.readCharacteristic(characteristic)) {
            request.callback.invoke(
                    BleError(
                            BleErrorCode.CHARACTERISTIC_READ_FAILED,
                            deviceID = gatt.device.address,
                            serviceUUID = characteristic.service.uuid.toString(),
                            characteristicUUID = characteristic.uuid.toString(),
                            reason = "Could not start readCharacteristic"
                    ).asErrorResult()
            )
            requestHandler.removeRequest(request)
            return false
        }
        return true
    }

    private fun handleWriteCharacteristic(item: GattWriteCharacteristicQueueItem): Boolean {
        val gatt = item.gatt
        val characteristic = item.characteristic

        val characteristicId = ObjectIdGenerators.characteristics.idForElement(characteristic)
        val request = requestHandler.findRequest(characteristicId, RequestType.WRITE)
                ?: return false

        characteristic.writeType = if (item.response) BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT else BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE
        characteristic.value = Base64Converter.decode(item.valueBase64)

        if (!gatt.writeCharacteristic(characteristic)) {
            request.callback.invoke(
                    BleError(
                            BleErrorCode.CHARACTERISTIC_WRITE_FAILED,
                            deviceID = gatt.device.address,
                            serviceUUID = characteristic.service.uuid.toString(),
                            characteristicUUID = characteristic.uuid.toString(),
                            reason = "Could not start writeCharacteristic"
                    ).asErrorResult()
            )
            requestHandler.removeRequest(request)
            return false
        }
        return true
    }

    private fun handleSetNotificationEnabled(item: GattSetNotificationEnabledQueueItem): Boolean {
        val gatt = item.gatt
        val characteristic = item.characteristic

        val characteristicId = ObjectIdGenerators.characteristics.idForElement(characteristic)
        val callbacks = notificationHandler.enabledCallbacksForId(characteristicId) ?: return false

        if (!gatt.setNotificationEnabled(characteristic, item.enabled)) {
            val errorResult = BleError(
                    BleErrorCode.CHARACTERISTIC_NOTIFY_CHANGE_FAILED,
                    deviceID = gatt.device.address,
                    serviceUUID = characteristic.service.uuid.toString(),
                    characteristicUUID = characteristic.uuid.toString(),
                    reason = "Could not start setNotificationEnabled"
            ).asErrorResult()
            callbacks.forEach { it(errorResult) }
            notificationHandler.removeEnabledCallbacksForId(characteristicId)
            return false
        }
        return true
    }
}