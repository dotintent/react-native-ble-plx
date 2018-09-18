package com.polidea.blenative.utils

import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattService
import com.polidea.blenative.*
import com.polidea.blenative.centralmanager.Result
import com.polidea.blenative.models.AdvertisementData
import com.polidea.blenative.models.BleScanResult
import com.polidea.blenative.models.Buffer


fun BleState.asDataObject() = value
fun BleState.asSuccessResult() = ResultUtils.createSuccessResult(asDataObject())

fun Buffer.asDataObject(centralId: Int) = mapOf<String, Any>(
        Pair("id", id),
        Pair("centralId", centralId)
)

fun Buffer.asSuccessResult(centralId: Int) = ResultUtils.createSuccessResult(asDataObject(centralId))

fun BleScanResult.asDataObject(centralId: Int): Map<String, Any?> {
    val advData = AdvertisementData.parseScanResponseData(scanRecord)

    val manufacturerData = advData.manufacturerData
    val convertedManufacturerData = if (manufacturerData != null) Base64Converter.encode(manufacturerData) else null

    val serviceData = advData.serviceData
    var convertedServiceData: Map<String, String>? = null
    if (serviceData != null) {
        val map = mutableMapOf<String, String>()
        serviceData.forEach { uuid, byteArray ->
            map[UUIDConverter.fromUUID(uuid)] = Base64Converter.encode(byteArray)
        }
        convertedServiceData = map
    }

    val serviceUUIDs = advData.serviceUUIDs
    var convertedServiceUUIDs: List<String>? = null
    if (serviceUUIDs != null) {
        convertedServiceUUIDs = serviceUUIDs.map { UUIDConverter.fromUUID(it) }
    }

    val solicitedServiceUUIDs = advData.solicitedServiceUUIDs
    var convertedSolicitedServiceUUIDs: List<String>? = null
    if (solicitedServiceUUIDs != null) {
        convertedSolicitedServiceUUIDs = solicitedServiceUUIDs.map { UUIDConverter.fromUUID(it) }
    }

    return mapOf(
            Pair("id", bleDevice.address),
            Pair("centralId", centralId),
            Pair("rssi", rssi),
            Pair("mtu", Constants.MINIMUM_MTU),
            Pair("manufacturerData", convertedManufacturerData),
            Pair("serviceData", convertedServiceData),
            Pair("serviceUUIDs", convertedServiceUUIDs),
            Pair("localName", advData.localName),
            Pair("txPowerLevel", advData.txPowerLevel),
            Pair("solicitedServiceUUIDs", convertedSolicitedServiceUUIDs),
            Pair("isConnectable", null),
            Pair("overflowServiceUUIDs", null)
    )
}

fun BluetoothDevice.asDataObject(centralId: Int) = mapOf<String, Any>(
        Pair("id", address),
        Pair("centralId", centralId)
)

fun BluetoothDevice.asSuccessResult(centralId: Int): Result {
    return ResultUtils.createSuccessResult(asDataObject(centralId))
}

fun BluetoothGattService.asDataObject(centralId: Int, deviceAddress: String) = mapOf(
        Pair("id", ObjectIdGenerators.services.idForElement(this)),
        Pair("centralId", centralId),
        Pair("uuid", uuid.toString()),
        Pair("deviceID", deviceAddress),
        Pair("isPrimary", type == BluetoothGattService.SERVICE_TYPE_PRIMARY)
)

fun BluetoothGattService.asSuccessResult(centralId: Int, deviceAddress: String): Result {
    return ResultUtils.createSuccessResult(asDataObject(centralId, deviceAddress))
}

val BluetoothGattCharacteristic.valueBase64: String
    get() = Base64Converter.encode(value)

fun BluetoothGattCharacteristic.asDataObject(centralId: Int, deviceAddress: String) = mapOf(
        Pair("id", ObjectIdGenerators.characteristics.idForElement(this)),
        Pair("centralId", centralId),
        Pair("uuid", uuid.toString()),
        Pair("serviceID", ObjectIdGenerators.services.idForElement(service)),
        Pair("serviceUUID", service.uuid.toString()),
        Pair("deviceID", deviceAddress),
        Pair("isReadable", CharacteristicUtils.isReadable(this)),
        Pair("isWritableWithResponse", CharacteristicUtils.isWriteableWithResponse(this)),
        Pair("isWritableWithoutResponse", CharacteristicUtils.isWriteableWithoutResponse(this)),
        Pair("isNotifiable", CharacteristicUtils.isNotifiable(this)),
        Pair("isIndicatable", CharacteristicUtils.isIndicatable(this))
)

fun BluetoothGattCharacteristic.asSuccessResult(centralId: Int, deviceAddress: String): Result {
    return ResultUtils.createSuccessResult(asDataObject(centralId, deviceAddress))
}

val <T> Map<String, T>.bufferStrategy: BufferActionStrategy?
    get() = BufferActionStrategy.forValue(this[BufferActionKeys.STRATEGY.value] as? String)

val <T> Map<String, T>.bufferPlacement: BufferActionPlacement?
    get() = BufferActionPlacement.forValue(this[BufferActionKeys.PLACEMENT.value] as? String)

val <T> Map<String, T>.bufferChunkSize: Int?
    get() = this[BufferActionKeys.CHUNK_SIZE.value] as Int?

val <T> Map<String, T>.timeout: Int?
    get() = this[CancelOptionKeys.TIMEOUT.value] as? Int

val <T> Map<String, T>.ignoreCancelled: Boolean?
    get() = this[CancelOptionKeys.IGNORE_CANCELLED.value] as? Boolean

val <T> Map<String, T>.emitCurrentState: Boolean?
    get() = this[MonitorStateOptionKeys.EMIT_CURRENT_STATE.value] as? Boolean

val <T> Map<String, T>.autoConnect: Boolean?
    get() = this[ConnectDeviceOptionKeys.AUTO_CONNECT.value] as? Boolean

val <T> Map<String, T>.promiseId: String?
    get() = this[CancelOptionKeys.PROMISE_ID.value] as? String
