package com.polidea.blenative.centralmanager

import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattService
import android.bluetooth.BluetoothProfile
import android.content.pm.PackageManager
import com.polidea.blenative.handlers.RequestTimeout
import com.polidea.blenative.models.BleError
import com.polidea.blenative.models.Buffer
import com.polidea.blenative.models.BufferType
import com.polidea.blenative.utils.*

val CentralManager.currentState: BleState
    get() {
        if (!supportsBluetoothLowEnergy) {
            return BleState.UNSUPPORTED
        }

        val bluetoothAdapter = bluetoothManager.adapter
        return BleState.fromNativeState(bluetoothAdapter.state)
    }

val CentralManager.supportsBluetoothLowEnergy: Boolean
    get() = context.packageManager.hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE)

private fun CentralManager.stopMonitoringBuffer(buffer: Buffer) {
    val characteristicId = buffer.relatedIdentifier ?: return
    val characteristic = cacheHandler.characteristic(characteristicId) ?: return
    val gatt = retrieveGattForService(characteristic.service)
    if (!bufferHandler.hasBuffer(buffer.type, characteristicId) && gatt != null) {
        // it may happen that it will fail. Maybe in feature we should double check it?
        gatt.setNotificationEnabled(characteristic, false)
    }
}

internal fun CentralManager.handleOnBufferRemoved(buffer: Buffer) {
    when (buffer.type) {
        BufferType.SCAN -> stopScanningBuffer()
        BufferType.VALUE_CHANGE -> stopMonitoringBuffer(buffer)
        BufferType.STATE, BufferType.MTU, BufferType.DISCONNECT, BufferType.STATE_RESTORE, BufferType.NAME -> Unit
    }
}

internal fun CentralManager.timeoutFrom(cancelOptions: Map<String, Any>): RequestTimeout? {
    val timeout = cancelOptions.timeout ?: return null
    val ignoreCancelled = cancelOptions.ignoreCancelled ?: false
    return RequestTimeout(timeout) {
        val buffer = bufferHandler.buffer(it.relatedIdentifier)
        val options = it.options
        if (ignoreCancelled && it.type.isBufferRequest() && buffer != null && options != null) {
            val items = bufferHandler.actionOnBuffer(buffer, options, false) ?: emptyList()
            it.callback(ResultUtils.createSuccessResult(items))
        } else {
            it.callback(BleError.cancelled().asErrorResult())
        }
    }
}

internal fun CentralManager.ensureLocationServicesStatus(callback: Callback): Boolean {
    if (!locationServicesStatus.isLocationPermissionOk) {
        callback(BleError.locationServicesDisabled().asErrorResult())
        return false
    } else if (!locationServicesStatus.isLocationProviderOk) {
        callback(BleError.locationProviderDisabled().asErrorResult())
        return false
    }
    return true
}

internal fun CentralManager.ensureState(callback: Callback): Boolean {
    val state = currentState
    return if (state != BleState.POWERED_ON) {
        callback(BleError.invalidManagerState(state).asErrorResult())
        false
    } else ensureLocationServicesStatus(callback)
}

internal fun CentralManager.retrieveDevice(address: String, callback: Callback): BluetoothDevice? {
    val device = bluetoothManager.adapter.getRemoteDevice(address)
    if (device == null) {
        callback(BleError.invalidIdentifier(address).asErrorResult())
    }
    return device
}

internal fun CentralManager.retrieveConnectedDevice(address: String, callback: Callback): BluetoothDevice? {
    val connectedDevices = bluetoothManager.getConnectedDevices(BluetoothProfile.GATT)
    val connectedDevice = connectedDevices.findLast { it.address == address }
    if (connectedDevice == null) {
        callback(BleError.peripheralNotConnected(address).asErrorResult())
    }
    return connectedDevice
}

internal fun CentralManager.retrieveConnectedDeviceGatt(address: String, callback: Callback): BluetoothGatt? {
    val connectedDevice = retrieveConnectedDevice(address, callback) ?: return null
    val gatt = cacheHandler.gatt(connectedDevice)
    if (gatt == null) {
        callback(BleError.peripheralNotConnected(address).asErrorResult())
    }
    return gatt
}

internal fun CentralManager.retrieveGattForService(service: BluetoothGattService, callback: Callback): BluetoothGatt? {
    val gatt = retrieveGattForService(service)
    if (gatt == null) {
        callback(BleError.peripheralNotConnected("Unknown").asErrorResult())
    }
    return gatt
}

internal fun CentralManager.retrieveGattForService(service: BluetoothGattService): BluetoothGatt? {
    var gatt: BluetoothGatt? = null
    for (connectedDevice in bluetoothManager.getConnectedDevices(BluetoothProfile.GATT)) {
        val cachedGatt = cacheHandler.gatt(connectedDevice) ?: continue
        if (cachedGatt.services.contains(service)) {
            gatt = cachedGatt
            break
        }
    }
    return gatt
}