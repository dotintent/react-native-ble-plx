package com.polidea.blenative.centralmanager

import android.bluetooth.*
import android.os.Handler
import android.os.Looper
import android.os.Message
import com.polidea.blenative.Constants
import com.polidea.blenative.handlers.BufferHandler
import com.polidea.blenative.handlers.CacheHandler
import com.polidea.blenative.handlers.NotificationHandler
import com.polidea.blenative.handlers.RequestHandler
import com.polidea.blenative.models.BleError
import com.polidea.blenative.models.BleErrorCode
import com.polidea.blenative.models.BufferType
import com.polidea.blenative.models.RequestType
import com.polidea.blenative.utils.*

class PeripheralDelegateHandler(
        private val centralId: Int,
        private val requestHandler: RequestHandler,
        private val cacheHandler: CacheHandler,
        private val bufferHandler: BufferHandler,
        private val notificationHandler: NotificationHandler
) : BluetoothGattCallback(), Handler.Callback {
    private val handler = Handler(Looper.myLooper(), this)

    override fun handleMessage(msg: Message): Boolean {
        BleLog.d("PeripheralDelegateHandler handleMessage(what: ${msg.what})")
        when (msg.what) {
            Constants.PeripheralCallback.ON_READ_REMOTE_RSSI ->
                handleOnReadRemoteRssi(msg.gatt!!, msg.rssi!!, msg.status!!)
            Constants.PeripheralCallback.ON_CHARACTERISTIC_READ ->
                handleOnCharacteristicRead(msg.gatt!!, msg.characteristic!!, msg.status!!)
            Constants.PeripheralCallback.ON_CHARACTERISTIC_WRITE ->
                handleOnCharacteristicWrite(msg.gatt!!, msg.characteristic!!, msg.status!!)
            Constants.PeripheralCallback.ON_SERVICES_DISCOVERED ->
                handleOnServicesDiscovered(msg.gatt!!, msg.status!!)
            Constants.PeripheralCallback.ON_MTU_CHANGED ->
                handleOnMtuChanged(msg.gatt!!, msg.mtu!!, msg.status!!)
            Constants.PeripheralCallback.ON_DESCRIPTOR_WRITE ->
                handleOnDescriptorWrite(msg.gatt!!, msg.descriptor!!, msg.status!!)
            Constants.PeripheralCallback.ON_CHARACTERISTIC_CHANGED ->
                handleOnCharacteristicChanged(msg.gatt!!, msg.characteristic!!)
            Constants.PeripheralCallback.ON_CONNECTION_STATE_CHANGE ->
                handleOnConnectionStateChange(msg.gatt!!, msg.status!!, msg.newState!!)
        }
        return true
    }

    private fun handleOnReadRemoteRssi(gatt: BluetoothGatt, rssi: Int, status: Int) {
        val device = gatt.device
        val deviceId = ObjectIdGenerators.devices.idForElement(device)

        val request = requestHandler.removeRequest(deviceId, RequestType.READ_RSSI)
                ?: return
        if (status == BluetoothGatt.GATT_SUCCESS) {
            request.callback(ResultUtils.createSuccessResult(rssi))
        } else {
            request.callback(BleError.peripheralRssiReadFailed(device.address, status).asErrorResult())
        }
    }

    private fun handleOnCharacteristicRead(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic, status: Int) {
        val device = gatt.device
        val characteristicId = ObjectIdGenerators.characteristics.idForElement(characteristic)

        val request = requestHandler.removeRequest(characteristicId, RequestType.READ)
        request?.let {
            if (status == BluetoothGatt.GATT_SUCCESS) {
                it.callback(ResultUtils.createSuccessResult(characteristic.valueBase64))
            } else {
                it.callback(
                        BleError(
                                BleErrorCode.CHARACTERISTIC_READ_FAILED,
                                deviceID = device.address,
                                serviceUUID = characteristic.service.uuid.toString(),
                                characteristicUUID = characteristic.uuid.toString()
                        ).asErrorResult()
                )
            }
        }
    }

    private fun handleOnCharacteristicWrite(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic, status: Int) {
        val device = gatt.device
        val characteristicId = ObjectIdGenerators.characteristics.idForElement(characteristic)

        val request = requestHandler.removeRequest(characteristicId, RequestType.WRITE)
        request?.let {
            if (status == BluetoothGatt.GATT_SUCCESS) {
                request.callback(ResultUtils.createSuccessResult(null))
            } else {
                request.callback(
                        BleError(
                                BleErrorCode.CHARACTERISTIC_WRITE_FAILED,
                                deviceID = device.address,
                                serviceUUID = characteristic.service.uuid.toString(),
                                characteristicUUID = characteristic.uuid.toString()
                        ).asErrorResult()
                )
            }
        }
    }

    private fun handleOnServicesDiscovered(gatt: BluetoothGatt, status: Int) {
        val device = gatt.device
        val deviceId = ObjectIdGenerators.devices.idForElement(device)

        val request = requestHandler.removeRequest(deviceId, RequestType.DISCOVER_SERVICES)
                ?: return
        if (status == BluetoothGatt.GATT_SUCCESS) {
            gatt.services.forEach {
                cacheHandler.addService(it)
                it.characteristics.forEach {
                    cacheHandler.addCharacteristic(it)
                }
            }
            request.callback(ResultUtils.createSuccessResult(null))
        } else {
            request.callback(BleError.servicesDiscoveryFailed(device.address, status).asErrorResult())
        }
    }

    private fun handleOnMtuChanged(gatt: BluetoothGatt, mtu: Int, status: Int) {
        val device = gatt.device
        val deviceId = ObjectIdGenerators.devices.idForElement(device)

        cacheHandler.updateDeviceMtu(deviceId, mtu)

        val request = requestHandler.removeRequest(deviceId, RequestType.MTU) ?: return
        if (status == BluetoothGatt.GATT_SUCCESS) {
            request.callback(ResultUtils.createSuccessResult(mtu))
        } else {
            request.callback(BleError.peripheralMtuChangeFailed(device.address, status).asErrorResult())
        }

        val updatedBuffers = bufferHandler.appendBufferElement(mtu, BufferType.MTU, deviceId)
        BufferUtils.updateBuffersRequests(updatedBuffers, requestHandler, bufferHandler)
    }

    private fun handleOnDescriptorWrite(gatt: BluetoothGatt, descriptor: BluetoothGattDescriptor, status: Int) {
        if (descriptor.uuid == Constants.CHARACTERISTIC_UPDATE_NOTIFICATION_DESCRIPTOR) {
            val characteristicId = ObjectIdGenerators.characteristics.idForElement(descriptor.characteristic)
            val callbacks = notificationHandler.enabledCallbacksForId(characteristicId)
            if (callbacks != null) {
                val data = if (status == BluetoothGatt.GATT_SUCCESS && descriptor.value?.contentEquals(BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE) == true) {
                    descriptor.characteristic.asSuccessResult(centralId, gatt.device.address)
                } else {
                    BleError(
                            BleErrorCode.CHARACTERISTIC_NOTIFY_CHANGE_FAILED,
                            deviceID = gatt.device.address,
                            serviceUUID = descriptor.characteristic.service.uuid.toString(),
                            characteristicUUID = descriptor.characteristic.uuid.toString(),
                            descriptorUUID = descriptor.uuid.toString()
                    ).asErrorResult()
                }
                callbacks.forEach { it(data) }
                notificationHandler.removeEnabledCallbacksForId(characteristicId)
            }
        }
    }

    private fun handleOnCharacteristicChanged(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
        val characteristicId = ObjectIdGenerators.characteristics.idForElement(characteristic)
        val updatedBuffers = bufferHandler.appendBufferElement(
                characteristic.valueBase64,
                BufferType.VALUE_CHANGE,
                characteristicId
        )
        BufferUtils.updateBuffersRequests(updatedBuffers, requestHandler, bufferHandler)
    }

    private fun handleOnConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
        cacheHandler.clearForGatt(gatt)

        val device = gatt.device
        val deviceId = ObjectIdGenerators.devices.idForElement(device)

        val connectRequest = requestHandler.removeRequest(deviceId, RequestType.CONNECT)
        if (connectRequest != null) {
            val success = status == BluetoothGatt.GATT_SUCCESS && newState == BluetoothProfile.STATE_CONNECTED
            if (success) {
                connectRequest.callback(device.asSuccessResult(centralId))
            } else {
                connectRequest.callback(BleError.peripheralConnectionFailed(device.address, status).asErrorResult())
            }
            return
        }

        if (newState == BluetoothProfile.STATE_DISCONNECTED) {
            val disconnectRequest = requestHandler.removeRequest(deviceId, RequestType.DISCONNECT)
            if (disconnectRequest != null) {
                disconnectRequest.callback(device.asSuccessResult(centralId))
            }

            val updatedBuffers = bufferHandler.appendBufferElement(device.asDataObject(centralId), BufferType.DISCONNECT)
            BufferUtils.updateBuffersRequests(updatedBuffers, requestHandler, bufferHandler)

            val error = BleError.peripheralNotConnected(device.address)
            val invalidatedBuffers = bufferHandler.markBuffersInvalidated(error, deviceId, listOf(BufferType.DISCONNECT))
            BufferUtils.invalidateBufferRequests(invalidatedBuffers, error, requestHandler)

            gatt.close()

            cacheHandler.removeGatt(gatt)
        }
    }

    override fun onReadRemoteRssi(gatt: BluetoothGatt, rssi: Int, status: Int) {
        BleLog.d("GATT(${gatt.device.address}) onReadRemoteRssi(rssi: $rssi, status: $status)")
        handler.onReadRemoteRssiMessage(gatt, rssi, status).sendToTarget()
    }

    override fun onCharacteristicRead(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic, status: Int) {
        BleLog.d("GATT(${gatt.device.address}) onCharacteristicRead(characteristic: ${characteristic.uuid}, status: $status)")
        handler.onCharacteristicReadMessage(gatt, characteristic, status).sendToTarget()
    }

    override fun onCharacteristicWrite(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic, status: Int) {
        BleLog.d("GATT(${gatt.device.address}) onCharacteristicWrite(characteristic: ${characteristic.uuid}, status: $status)")
        handler.onCharacteristicWriteMessage(gatt, characteristic, status).sendToTarget()
    }

    override fun onServicesDiscovered(gatt: BluetoothGatt, status: Int) {
        BleLog.d("GATT(${gatt.device.address}) onServiceDiscovered(status: $status)")
        handler.onServicesDiscoveredMessage(gatt, status).sendToTarget()
    }

    override fun onPhyUpdate(gatt: BluetoothGatt, txPhy: Int, rxPhy: Int, status: Int) {
        BleLog.d("GATT(${gatt.device.address}) onPhyUpdate(txPhy: $txPhy, rxPhy: $rxPhy, status: $status)")
    }

    override fun onMtuChanged(gatt: BluetoothGatt, mtu: Int, status: Int) {
        BleLog.d("GATT(${gatt.device.address}) onMtuChanged(mtu: $mtu, status: $status)")
        handler.onMtuChangedMessage(gatt, mtu, status).sendToTarget()
    }

    override fun onReliableWriteCompleted(gatt: BluetoothGatt, status: Int) {
        BleLog.d("GATT(${gatt.device.address}) onReliableWriteCompleted(status: $status)")
    }

    override fun onDescriptorWrite(gatt: BluetoothGatt, descriptor: BluetoothGattDescriptor, status: Int) {
        BleLog.d("GATT(${gatt.device.address}) onDescriptorWrite(characteristic: ${descriptor.characteristic.uuid} descriptor: ${descriptor.uuid} status: $status)")
        handler.onDescriptorWriteMessage(gatt, descriptor, status).sendToTarget()
    }

    override fun onCharacteristicChanged(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
        BleLog.d("GATT(${gatt.device.address}) onCharacteristicChanged(characteristic: ${characteristic.uuid})")
        handler.onCharacteristicChangedMessage(gatt, characteristic).sendToTarget()
    }

    override fun onDescriptorRead(gatt: BluetoothGatt, descriptor: BluetoothGattDescriptor, status: Int) {
        BleLog.d("GATT(${gatt.device.address}) onDescriptorRead(characteristic: ${descriptor.characteristic.uuid} descriptor: ${descriptor.uuid} status: $status)")
    }

    override fun onPhyRead(gatt: BluetoothGatt, txPhy: Int, rxPhy: Int, status: Int) {
        BleLog.d("GATT(${gatt.device.address}) onPhyRead(txPhy: $txPhy, rxPhy: $rxPhy, status: $status)")
    }

    override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
        BleLog.d("GATT(${gatt.device.address}) onConnectionStateChange(status: $status, newState: $newState)")
        handler.onConnectionStateChangeMessage(gatt, status, newState).sendToTarget()
    }
}