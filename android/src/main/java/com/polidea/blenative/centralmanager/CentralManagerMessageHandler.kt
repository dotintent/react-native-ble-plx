package com.polidea.blenative.centralmanager

import android.annotation.SuppressLint
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCharacteristic
import android.content.Context
import android.os.Handler
import android.os.Message
import com.polidea.blenative.Constants
import com.polidea.blenative.handlers.CacheHandler
import com.polidea.blenative.handlers.NotificationHandler
import com.polidea.blenative.handlers.RequestHandler
import com.polidea.blenative.models.BleError
import com.polidea.blenative.models.BleErrorCode
import com.polidea.blenative.models.RequestType
import com.polidea.blenative.utils.*

class CentralManagerMessageHandler(
        private val context: Context,
        private val peripheralDelegateHandler: PeripheralDelegateHandler,
        private val requestHandler: RequestHandler,
        private val cacheHandler: CacheHandler,
        private val notificationHandler: NotificationHandler
) : Handler.Callback {

    override fun handleMessage(msg: Message): Boolean {
        BleLog.d("CentralManagerMessageHandler handleMessage(what: ${msg.what})")
        when (msg.what) {
            Constants.CentralAction.CONNECT_TO_PERIPHERAL ->
                handleConnectToPeripheral(msg.device!!, msg.autoConnect!!)
            Constants.CentralAction.DISCONNECT ->
                handleDisconnect(msg.gatt!!)
            Constants.CentralAction.DISCOVER_SERVICES ->
                handleDiscoverServices(msg.gatt!!)
            Constants.CentralAction.READ_REMOTE_RSSI ->
                handleReadRemoteRssi(msg.gatt!!)
            Constants.CentralAction.REQUEST_MTU ->
                handleRequestMtu(msg.gatt!!, msg.mtu!!)
            Constants.CentralAction.READ_CHARACTERISTIC ->
                handleReadCharacteristic(msg.gatt!!, msg.characteristic!!)
            Constants.CentralAction.WRITE_CHARACTERISTIC ->
                handleWriteCharacteristic(msg.gatt!!, msg.characteristic!!, msg.characteristicResponse!!, msg.characteristicValueBase64!!)
            Constants.CentralAction.SET_NOTIFICATION_ENABLED ->
                handleSetNotificationEnabled(msg.gatt!!, msg.characteristic!!, msg.characteristicEnabled!!)
        }
        return true
    }

    private fun handleConnectToPeripheral(device: BluetoothDevice, autoConnect: Boolean) {
        val gatt = device.connectGatt(context, autoConnect, peripheralDelegateHandler)
        if (gatt == null) {
            val deviceId = ObjectIdGenerators.devices.idForElement(device)
            val request = requestHandler.removeRequest(deviceId, RequestType.CONNECT)
            request?.callback?.invoke(BleError.peripheralConnectionFailed(device.address, reason = "Could not create Gatt").asErrorResult())
            return
        }
        cacheHandler.addGatt(gatt)
    }

    private fun handleDisconnect(gatt: BluetoothGatt) {
        gatt.disconnect()
    }

    private fun handleDiscoverServices(gatt: BluetoothGatt) {
        val deviceId = ObjectIdGenerators.devices.idForElement(gatt.device)
        val request = requestHandler.findRequest(deviceId, RequestType.DISCOVER_SERVICES) ?: return
        if (!gatt.discoverServices()) {
            request.callback(BleError.servicesDiscoveryFailed(gatt.device.address, reason = "Could not start discoverServices").asErrorResult())
            requestHandler.removeRequest(request)
        }
    }

    private fun handleReadRemoteRssi(gatt: BluetoothGatt) {
        val deviceId = ObjectIdGenerators.devices.idForElement(gatt.device)
        val request = requestHandler.findRequest(deviceId, RequestType.READ_RSSI) ?: return
        if (!gatt.readRemoteRssi()) {
            request.callback.invoke(
                    BleError.peripheralRssiReadFailed(gatt.device.address, reason = "Could not start readRemoteRssi").asErrorResult()
            )
            requestHandler.removeRequest(request)
        }
    }

    @SuppressLint("NewApi")
    private fun handleRequestMtu(gatt: BluetoothGatt, mtu: Int) {
        val deviceId = ObjectIdGenerators.devices.idForElement(gatt.device)
        val request = requestHandler.findRequest(deviceId, RequestType.MTU) ?: return
        if (!gatt.requestMtu(mtu)) {
            request.callback.invoke(
                    BleError.peripheralMtuChangeFailed(gatt.device.address, reason = "Could not start requestMtu").asErrorResult()
            )
            requestHandler.removeRequest(request)
        }
    }

    private fun handleReadCharacteristic(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
        val characteristicId = ObjectIdGenerators.characteristics.idForElement(characteristic)
        val request = requestHandler.removeRequest(characteristicId, RequestType.READ) ?: return
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
        }
    }

    private fun handleWriteCharacteristic(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic, response: Boolean, valueBase64: String) {
        val characteristicId = ObjectIdGenerators.characteristics.idForElement(characteristic)
        val request = requestHandler.removeRequest(characteristicId, RequestType.WRITE) ?: return

        characteristic.writeType = if (response) BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT else BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE
        characteristic.value = Base64Converter.decode(valueBase64)

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
        }
    }

    private fun handleSetNotificationEnabled(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic, characteristicEnabled: Boolean) {
        val characteristicId = ObjectIdGenerators.characteristics.idForElement(characteristic)
        val callbacks = notificationHandler.enabledCallbacksForId(characteristicId) ?: return

        if (!gatt.setNotificationEnabled(characteristic, characteristicEnabled)) {
            val errorResult = BleError(
                    BleErrorCode.CHARACTERISTIC_NOTIFY_CHANGE_FAILED,
                    deviceID = gatt.device.address,
                    serviceUUID = characteristic.service.uuid.toString(),
                    characteristicUUID = characteristic.uuid.toString(),
                    reason = "Could not start setNotificationEnabled"
            ).asErrorResult()
            callbacks.forEach { it(errorResult) }
            notificationHandler.removeEnabledCallbacksForId(characteristicId)
        }
    }
}