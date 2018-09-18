package com.polidea.blenative.models

import com.polidea.blenative.centralmanager.Result
import com.polidea.blenative.utils.BleState
import com.polidea.blenative.utils.ResultUtils

enum class BleErrorCode(val value: Int) {
    UNKNOWN_ERROR(0),
    BLUETOOTH_MANAGER_DESTROYED(1),
    OPERATION_CANCELLED(2),
    OPERATION_TIMED_OUT(3),
    OPERATION_START_FAILED(4),
    INVALID_IDENTIFIERS(5),
    BUFFER_NOT_EXIST(6),
    RESTORE_BUFFER_NOT_EXIST(7),
    FAILED_TO_CREATE_CENTRAL_MANAGER(8),
    MANY_CENTRAL_MANAGERS_NOT_ALLOWED(9),

    BLUETOOTH_UNSUPPORTED(100),
    BLUETOOTH_UNAUTHORIZED(101),
    BLUETOOTH_POWERED_OFF(102),
    BLUETOOTH_IN_UNKNOWN_STATE(103),
    BLUETOOTH_RESETTING(104),

    DEVICE_CONNECTION_FAILED(200),
    DEVICE_RSSI_READ_FAILED(202),
    DEVICE_ALREADY_CONNECTED(203),
    DEVICE_NOT_CONNECTED(205),
    DEVICE_MTU_CHANGE_FAILED(206),

    SERVICES_DISCOVERY_FAILED(300),
    SERVICE_NOT_FOUND(302),

    CHARACTERISTIC_WRITE_FAILED(401),
    CHARACTERISTIC_READ_FAILED(402),
    CHARACTERISTIC_NOTIFY_CHANGE_FAILED(403),
    CHARACTERISTIC_NOT_FOUND(404),

    SCAN_START_FAILED(600),
    LOCATION_SERVICES_DISABLED(601),
    LOCATION_PROVIDER_DISABLED(602),

    MANAGER_NOT_FOUND(700),
    METHOD_NOT_SUPPORTED(701)
}

data class BleError(val errorCode: BleErrorCode,
                    val attErrorCode: Int? = null,
                    val androidErrorCode: Int? = null,
                    val reason: String? = null,

                    val deviceID: String? = null,
                    val serviceUUID: String? = null,
                    val characteristicUUID: String? = null,
                    val descriptorUUID: String? = null,
                    val internalMessage: String? = null) {

    val asDataObject: Any
        get() = mapOf(
                Pair("errorCode", errorCode.value),
                Pair("attErrorCode", attErrorCode),
                Pair("androidErrorCode", androidErrorCode),
                Pair("reason", reason),
                Pair("deviceID", deviceID),
                Pair("serviceUUID", serviceUUID),
                Pair("characteristicUUID", characteristicUUID),
                Pair("descriptorUUID", descriptorUUID),
                Pair("internalMessage", internalMessage)
        )

    fun asErrorResult(): Result = ResultUtils.createErrorResult(asDataObject)

    companion object {
        fun failedToCreateCentralManager() = BleError(BleErrorCode.FAILED_TO_CREATE_CENTRAL_MANAGER)

        fun manyCentralManagersNotAllowed() = BleError(BleErrorCode.MANY_CENTRAL_MANAGERS_NOT_ALLOWED)

        fun methodNotSupported(reason: String) = BleError(BleErrorCode.METHOD_NOT_SUPPORTED, reason = reason)

        @JvmStatic
        fun cancelled() = BleError(BleErrorCode.OPERATION_CANCELLED)

        fun managerNotFound() = BleError(BleErrorCode.MANAGER_NOT_FOUND)

        fun bufferNotExist() = BleError(BleErrorCode.BUFFER_NOT_EXIST)

        fun invalidManagerState(bleState: BleState) = BleError(bleState.errorCode, reason = bleState.errorReason)

        fun scanStartFailed(reason: String) = BleError(BleErrorCode.SCAN_START_FAILED, reason = reason)

        fun locationServicesDisabled() = BleError(BleErrorCode.LOCATION_SERVICES_DISABLED)

        fun locationProviderDisabled() = BleError(BleErrorCode.LOCATION_PROVIDER_DISABLED)

        fun invalidIdentifier(id: String) = invalidIdentifiers(arrayOf(id))

        fun invalidIdentifiers(ids: Array<String>) = BleError(BleErrorCode.INVALID_IDENTIFIERS, internalMessage = ids.joinToString(", "))

        fun peripheralConnectionFailed(id: String, androidErrorCode: Int? = null, reason: String? = null) =
                BleError(BleErrorCode.DEVICE_CONNECTION_FAILED, deviceID = id, androidErrorCode = androidErrorCode, reason = reason)

        fun peripheralAlreadyConnected(id: String) = BleError(BleErrorCode.DEVICE_ALREADY_CONNECTED, deviceID = id)

        fun peripheralNotConnected(id: String) = BleError(BleErrorCode.DEVICE_NOT_CONNECTED, deviceID = id)

        fun peripheralRssiReadFailed(id: String, androidErrorCode: Int? = null, reason: String? = null) =
                BleError(BleErrorCode.DEVICE_RSSI_READ_FAILED, deviceID = id, androidErrorCode = androidErrorCode, reason = reason)

        fun peripheralMtuChangeFailed(id: String, androidErrorCode: Int? = null, reason: String? = null) =
                BleError(BleErrorCode.DEVICE_MTU_CHANGE_FAILED, deviceID = id, androidErrorCode = androidErrorCode, reason = reason)

        fun servicesDiscoveryFailed(id: String, androidErrorCode: Int? = null, reason: String? = null) =
                BleError(BleErrorCode.SERVICES_DISCOVERY_FAILED, deviceID = id, androidErrorCode = androidErrorCode, reason = reason)

        fun serviceNotFound(uuid: String) = BleError(BleErrorCode.SERVICE_NOT_FOUND, serviceUUID = uuid)

        fun characteristicNotFound(uuid: String) = BleError(BleErrorCode.CHARACTERISTIC_NOT_FOUND, characteristicUUID = uuid)
    }
}

private val BleState.errorCode: BleErrorCode
    get() = when (this) {
        BleState.UNKNOWN -> BleErrorCode.BLUETOOTH_IN_UNKNOWN_STATE
        BleState.RESETTING -> BleErrorCode.BLUETOOTH_RESETTING
        BleState.UNSUPPORTED -> BleErrorCode.BLUETOOTH_UNSUPPORTED
        BleState.UNAUTHORIZED -> BleErrorCode.BLUETOOTH_UNAUTHORIZED
        BleState.POWERED_OFF -> BleErrorCode.BLUETOOTH_POWERED_OFF
        BleState.POWERED_ON -> throw IllegalArgumentException("Cannot create error code for bluetooth state $this")
    }

private val BleState.errorReason: String
    get() = when (this) {
        BleState.UNKNOWN -> "Bluetooth is in unknown state"
        BleState.RESETTING -> "Bluetooth is resetting"
        BleState.UNSUPPORTED -> "Bluetooth is unsupported"
        BleState.UNAUTHORIZED -> "Bluetooth is unauthorized"
        BleState.POWERED_OFF -> "Bluetooth is powered off"
        BleState.POWERED_ON -> throw IllegalArgumentException("Cannot create error reason for bluetooth state $this")
    }