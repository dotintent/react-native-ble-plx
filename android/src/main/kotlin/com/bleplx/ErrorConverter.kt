package com.bleplx

import android.bluetooth.BluetoothGatt
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap

/**
 * Converts Android BLE errors into unified BleErrorCode values
 * that map to the JS-side BleErrorInfo type.
 */
object ErrorConverter {

    // ---- BleErrorCode constants (mirrors NativeBlePlx.ts BleErrorInfo.code) ----
    const val UNKNOWN_ERROR = 0
    const val BLUETOOTH_MANAGER_DESTROYED = 1
    const val OPERATION_CANCELLED = 2
    const val OPERATION_TIMED_OUT = 3
    const val OPERATION_START_FAILED = 4
    const val INVALID_IDENTIFIERS = 5

    const val BLUETOOTH_UNSUPPORTED = 100
    const val BLUETOOTH_UNAUTHORIZED = 101
    const val BLUETOOTH_POWERED_OFF = 102
    const val BLUETOOTH_IN_UNKNOWN_STATE = 103
    const val BLUETOOTH_RESETTING = 104

    const val DEVICE_CONNECTION_FAILED = 200
    const val DEVICE_DISCONNECTED = 201
    const val DEVICE_RSSI_READ_FAILED = 202
    const val DEVICE_ALREADY_CONNECTED = 203
    const val DEVICE_NOT_FOUND = 204
    const val DEVICE_NOT_CONNECTED = 205
    const val DEVICE_MTU_CHANGE_FAILED = 206

    const val SERVICES_DISCOVERY_FAILED = 300
    const val SERVICE_NOT_FOUND = 302
    const val SERVICES_NOT_DISCOVERED = 303

    const val CHARACTERISTIC_WRITE_FAILED = 401
    const val CHARACTERISTIC_READ_FAILED = 402
    const val CHARACTERISTIC_NOTIFY_CHANGE_FAILED = 403
    const val CHARACTERISTIC_NOT_FOUND = 404
    const val CHARACTERISTICS_NOT_DISCOVERED = 405

    const val DESCRIPTOR_WRITE_FAILED = 501
    const val DESCRIPTOR_READ_FAILED = 502
    const val DESCRIPTOR_NOT_FOUND = 503

    const val SCAN_START_FAILED = 600
    const val LOCATION_SERVICES_DISABLED = 601
    const val SCAN_THROTTLED = 602
    const val CONNECT_PERMISSION_DENIED = 603

    // ---- GATT status → error code mapping ----

    data class BleErrorInfo(
        val code: Int,
        val message: String,
        val isRetryable: Boolean,
        val deviceId: String? = null,
        val serviceUuid: String? = null,
        val characteristicUuid: String? = null,
        val operation: String? = null,
        val nativeDomain: String? = null,
        val nativeCode: Int? = null,
        val gattStatus: Int? = null
    )

    fun fromGattStatus(
        status: Int,
        deviceId: String? = null,
        operation: String? = null
    ): BleErrorInfo {
        return when (status) {
            BluetoothGatt.GATT_SUCCESS -> BleErrorInfo(
                code = UNKNOWN_ERROR,
                message = "Operation succeeded but was treated as error",
                isRetryable = false,
                deviceId = deviceId,
                operation = operation,
                gattStatus = status
            )
            // GATT_CONN_TERMINATE_PEER_USER (0x13 = 19)
            0x13 -> BleErrorInfo(
                code = DEVICE_DISCONNECTED,
                message = "Device disconnected by peer",
                isRetryable = false,
                deviceId = deviceId,
                operation = operation,
                gattStatus = status
            )
            // GATT_CONN_TIMEOUT (0x08 = 8)
            0x08 -> BleErrorInfo(
                code = OPERATION_TIMED_OUT,
                message = "GATT connection timeout",
                isRetryable = true,
                deviceId = deviceId,
                operation = operation,
                gattStatus = status
            )
            // GATT_ERROR (0x85 = 133) - the infamous Android error
            0x85 -> BleErrorInfo(
                code = DEVICE_CONNECTION_FAILED,
                message = "GATT error 133 — connection failed",
                isRetryable = true,
                deviceId = deviceId,
                operation = operation,
                gattStatus = status
            )
            // GATT_CONN_TERMINATE_LOCAL_HOST (0x16 = 22)
            0x16 -> BleErrorInfo(
                code = DEVICE_DISCONNECTED,
                message = "Connection terminated by local host (GATT 0x16)",
                isRetryable = true,
                deviceId = deviceId,
                operation = operation,
                gattStatus = status
            )
            // GATT_CONN_LMP_TIMEOUT (0x22 = 34)
            0x22 -> BleErrorInfo(
                code = DEVICE_CONNECTION_FAILED,
                message = "Connection failed - LMP timeout (GATT 0x22)",
                isRetryable = true,
                deviceId = deviceId,
                operation = operation,
                gattStatus = status
            )
            // GATT_CONN_FAIL_ESTABLISH (0x3E = 62)
            0x3E -> BleErrorInfo(
                code = DEVICE_CONNECTION_FAILED,
                message = "Connection failed to establish (GATT 0x3E)",
                isRetryable = true,
                deviceId = deviceId,
                operation = operation,
                gattStatus = status
            )
            // GATT_INSUFFICIENT_AUTHENTICATION
            0x05 -> BleErrorInfo(
                code = BLUETOOTH_UNAUTHORIZED,
                message = "Insufficient authentication",
                isRetryable = false,
                deviceId = deviceId,
                operation = operation,
                gattStatus = status
            )
            else -> BleErrorInfo(
                code = UNKNOWN_ERROR,
                message = "GATT error $status",
                isRetryable = false,
                deviceId = deviceId,
                operation = operation,
                gattStatus = status
            )
        }
    }

    fun fromException(
        exception: Throwable,
        deviceId: String? = null,
        operation: String? = null
    ): BleErrorInfo {
        return when (exception) {
            is SecurityException -> BleErrorInfo(
                code = CONNECT_PERMISSION_DENIED,
                message = "Missing BLE permission: ${exception.message}",
                isRetryable = false,
                deviceId = deviceId,
                operation = operation,
                nativeDomain = "SecurityException"
            )
            is IllegalStateException -> BleErrorInfo(
                code = BLUETOOTH_MANAGER_DESTROYED,
                message = exception.message ?: "Illegal state",
                isRetryable = false,
                deviceId = deviceId,
                operation = operation
            )
            else -> BleErrorInfo(
                code = UNKNOWN_ERROR,
                message = exception.message ?: "Unknown error",
                isRetryable = false,
                deviceId = deviceId,
                operation = operation,
                nativeDomain = exception.javaClass.simpleName
            )
        }
    }

    fun fromScanError(errorCode: Int): BleErrorInfo {
        val message = when (errorCode) {
            1 -> "Scan already started"
            2 -> "Application registration failed"
            3 -> "Internal error"
            4 -> "Feature unsupported"
            5 -> "Out of hardware resources"
            6 -> "Scanning too frequently"
            else -> "Scan error $errorCode"
        }
        return BleErrorInfo(
            code = SCAN_START_FAILED,
            message = message,
            isRetryable = errorCode == 6, // scanning too frequently is retryable
            nativeCode = errorCode
        )
    }

    fun scanThrottled(): BleErrorInfo = BleErrorInfo(
        code = SCAN_THROTTLED,
        message = "Scan throttled: 5 starts in 30 seconds limit reached",
        isRetryable = true
    )

    fun toWritableMap(info: BleErrorInfo): WritableMap {
        val map = Arguments.createMap()
        map.putInt("code", info.code)
        map.putString("message", info.message)
        map.putBoolean("isRetryable", info.isRetryable)
        if (info.deviceId != null) map.putString("deviceId", info.deviceId) else map.putNull("deviceId")
        if (info.serviceUuid != null) map.putString("serviceUuid", info.serviceUuid) else map.putNull("serviceUuid")
        if (info.characteristicUuid != null) map.putString("characteristicUuid", info.characteristicUuid) else map.putNull("characteristicUuid")
        if (info.operation != null) map.putString("operation", info.operation) else map.putNull("operation")
        map.putString("platform", "android")
        if (info.nativeDomain != null) map.putString("nativeDomain", info.nativeDomain) else map.putNull("nativeDomain")
        if (info.nativeCode != null) map.putInt("nativeCode", info.nativeCode) else map.putNull("nativeCode")
        if (info.gattStatus != null) map.putInt("gattStatus", info.gattStatus) else map.putNull("gattStatus")
        map.putNull("attErrorCode") // Android doesn't use ATT error codes
        return map
    }

    fun rejectPromise(
        reject: (String, String, Throwable?) -> Unit,
        info: BleErrorInfo,
        cause: Throwable? = null
    ) {
        reject(info.code.toString(), info.message, cause)
    }
}
