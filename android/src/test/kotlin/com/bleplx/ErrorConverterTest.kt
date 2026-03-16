package com.bleplx

import android.bluetooth.BluetoothGatt
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Tests for GATT status code → BleErrorCode mapping in ErrorConverter.
 */
class ErrorConverterTest {

    // --- GATT 133 (0x85) → DeviceConnectionFailed + isRetryable=true ---

    @Test
    fun `GATT 0x85 (133) maps to DEVICE_CONNECTION_FAILED`() {
        val error = ErrorConverter.fromGattStatus(0x85)
        assertEquals(ErrorConverter.DEVICE_CONNECTION_FAILED, error.code)
    }

    @Test
    fun `GATT 0x85 isRetryable is true`() {
        val error = ErrorConverter.fromGattStatus(0x85)
        assertTrue(error.isRetryable)
    }

    @Test
    fun `GATT 0x85 preserves gattStatus`() {
        val error = ErrorConverter.fromGattStatus(0x85)
        assertEquals(0x85, error.gattStatus)
    }

    // --- GATT 19 (0x13) → DeviceDisconnected + isRetryable=false ---

    @Test
    fun `GATT 0x13 (19) maps to DEVICE_DISCONNECTED`() {
        val error = ErrorConverter.fromGattStatus(0x13)
        assertEquals(ErrorConverter.DEVICE_DISCONNECTED, error.code)
    }

    @Test
    fun `GATT 0x13 isRetryable is false`() {
        val error = ErrorConverter.fromGattStatus(0x13)
        assertFalse(error.isRetryable)
    }

    // --- GATT 0x3E → DeviceConnectionFailed + isRetryable=true ---

    @Test
    fun `GATT 0x3E maps to DEVICE_CONNECTION_FAILED`() {
        val error = ErrorConverter.fromGattStatus(0x3E)
        assertEquals(ErrorConverter.DEVICE_CONNECTION_FAILED, error.code)
    }

    @Test
    fun `GATT 0x3E isRetryable is true`() {
        val error = ErrorConverter.fromGattStatus(0x3E)
        assertTrue(error.isRetryable)
    }

    // --- GATT 0x16 → DeviceDisconnected + isRetryable=true ---

    @Test
    fun `GATT 0x16 (22) maps to DEVICE_DISCONNECTED`() {
        val error = ErrorConverter.fromGattStatus(0x16)
        assertEquals(ErrorConverter.DEVICE_DISCONNECTED, error.code)
    }

    @Test
    fun `GATT 0x16 isRetryable is true`() {
        val error = ErrorConverter.fromGattStatus(0x16)
        assertTrue(error.isRetryable)
    }

    // --- GATT 0x08 (timeout) ---

    @Test
    fun `GATT 0x08 maps to OPERATION_TIMED_OUT and is retryable`() {
        val error = ErrorConverter.fromGattStatus(0x08)
        assertEquals(ErrorConverter.OPERATION_TIMED_OUT, error.code)
        assertTrue(error.isRetryable)
    }

    // --- GATT 0x22 (LMP timeout) ---

    @Test
    fun `GATT 0x22 maps to DEVICE_CONNECTION_FAILED and is retryable`() {
        val error = ErrorConverter.fromGattStatus(0x22)
        assertEquals(ErrorConverter.DEVICE_CONNECTION_FAILED, error.code)
        assertTrue(error.isRetryable)
    }

    // --- GATT 0x05 (insufficient authentication) ---

    @Test
    fun `GATT 0x05 maps to BLUETOOTH_UNAUTHORIZED and is not retryable`() {
        val error = ErrorConverter.fromGattStatus(0x05)
        assertEquals(ErrorConverter.BLUETOOTH_UNAUTHORIZED, error.code)
        assertFalse(error.isRetryable)
    }

    // --- GATT_SUCCESS (0) treated as error ---

    @Test
    fun `GATT_SUCCESS maps to UNKNOWN_ERROR`() {
        val error = ErrorConverter.fromGattStatus(BluetoothGatt.GATT_SUCCESS)
        assertEquals(ErrorConverter.UNKNOWN_ERROR, error.code)
        assertFalse(error.isRetryable)
    }

    // --- Unknown GATT status ---

    @Test
    fun `Unknown GATT status maps to UNKNOWN_ERROR and is not retryable`() {
        val error = ErrorConverter.fromGattStatus(0xFF)
        assertEquals(ErrorConverter.UNKNOWN_ERROR, error.code)
        assertFalse(error.isRetryable)
        assertEquals(0xFF, error.gattStatus)
    }

    // --- Context forwarding ---

    @Test
    fun `fromGattStatus forwards deviceId and operation`() {
        val error = ErrorConverter.fromGattStatus(0x85, deviceId = "AA:BB:CC", operation = "connect")
        assertEquals("AA:BB:CC", error.deviceId)
        assertEquals("connect", error.operation)
    }

    // --- SecurityException → ConnectPermissionDenied ---

    @Test
    fun `SecurityException maps to CONNECT_PERMISSION_DENIED`() {
        val error = ErrorConverter.fromException(SecurityException("Missing permission"))
        assertEquals(ErrorConverter.CONNECT_PERMISSION_DENIED, error.code)
    }

    @Test
    fun `SecurityException isRetryable is false`() {
        val error = ErrorConverter.fromException(SecurityException("Missing permission"))
        assertFalse(error.isRetryable)
    }

    @Test
    fun `SecurityException sets nativeDomain to SecurityException`() {
        val error = ErrorConverter.fromException(SecurityException("test"))
        assertEquals("SecurityException", error.nativeDomain)
    }

    // --- IllegalStateException → BluetoothManagerDestroyed ---

    @Test
    fun `IllegalStateException maps to BLUETOOTH_MANAGER_DESTROYED`() {
        val error = ErrorConverter.fromException(IllegalStateException("BT destroyed"))
        assertEquals(ErrorConverter.BLUETOOTH_MANAGER_DESTROYED, error.code)
        assertFalse(error.isRetryable)
    }

    // --- Generic exception ---

    @Test
    fun `Generic exception maps to UNKNOWN_ERROR`() {
        val error = ErrorConverter.fromException(RuntimeException("oops"))
        assertEquals(ErrorConverter.UNKNOWN_ERROR, error.code)
        assertFalse(error.isRetryable)
        assertEquals("RuntimeException", error.nativeDomain)
    }

    // --- Scan callback errors 1-6 → ScanFailed ---

    @Test
    fun `scan error code 1 maps to SCAN_START_FAILED`() {
        val error = ErrorConverter.fromScanError(1)
        assertEquals(ErrorConverter.SCAN_START_FAILED, error.code)
        assertEquals(1, error.nativeCode)
        assertFalse(error.isRetryable)
    }

    @Test
    fun `scan error code 2 maps to SCAN_START_FAILED`() {
        val error = ErrorConverter.fromScanError(2)
        assertEquals(ErrorConverter.SCAN_START_FAILED, error.code)
        assertFalse(error.isRetryable)
    }

    @Test
    fun `scan error code 3 maps to SCAN_START_FAILED`() {
        val error = ErrorConverter.fromScanError(3)
        assertEquals(ErrorConverter.SCAN_START_FAILED, error.code)
        assertFalse(error.isRetryable)
    }

    @Test
    fun `scan error code 4 maps to SCAN_START_FAILED`() {
        val error = ErrorConverter.fromScanError(4)
        assertEquals(ErrorConverter.SCAN_START_FAILED, error.code)
        assertFalse(error.isRetryable)
    }

    @Test
    fun `scan error code 5 maps to SCAN_START_FAILED`() {
        val error = ErrorConverter.fromScanError(5)
        assertEquals(ErrorConverter.SCAN_START_FAILED, error.code)
        assertFalse(error.isRetryable)
    }

    @Test
    fun `scan error code 6 (too frequently) maps to SCAN_START_FAILED and is retryable`() {
        val error = ErrorConverter.fromScanError(6)
        assertEquals(ErrorConverter.SCAN_START_FAILED, error.code)
        assertTrue(error.isRetryable, "Error 6 (scanning too frequently) should be retryable")
        assertEquals(6, error.nativeCode)
    }

    @Test
    fun `scan error code unknown maps to SCAN_START_FAILED and is not retryable`() {
        val error = ErrorConverter.fromScanError(99)
        assertEquals(ErrorConverter.SCAN_START_FAILED, error.code)
        assertFalse(error.isRetryable)
        assertEquals(99, error.nativeCode)
    }

    // --- BleErrorInfo data class integrity ---

    @Test
    fun `BleErrorInfo holds all fields`() {
        val info = ErrorConverter.BleErrorInfo(
            code = ErrorConverter.DEVICE_CONNECTION_FAILED,
            message = "test",
            isRetryable = true,
            deviceId = "dev-1",
            serviceUuid = "svc-uuid",
            characteristicUuid = "char-uuid",
            operation = "connect",
            nativeDomain = "Domain",
            nativeCode = 42,
            gattStatus = 133
        )
        assertEquals(ErrorConverter.DEVICE_CONNECTION_FAILED, info.code)
        assertEquals("test", info.message)
        assertTrue(info.isRetryable)
        assertEquals("dev-1", info.deviceId)
        assertEquals("svc-uuid", info.serviceUuid)
        assertEquals("char-uuid", info.characteristicUuid)
        assertEquals("connect", info.operation)
        assertEquals("Domain", info.nativeDomain)
        assertEquals(42, info.nativeCode)
        assertEquals(133, info.gattStatus)
    }

    @Test
    fun `BleErrorInfo optional fields default to null`() {
        val info = ErrorConverter.BleErrorInfo(
            code = ErrorConverter.UNKNOWN_ERROR,
            message = "minimal",
            isRetryable = false
        )
        assertNull(info.deviceId)
        assertNull(info.serviceUuid)
        assertNull(info.characteristicUuid)
        assertNull(info.operation)
        assertNull(info.nativeDomain)
        assertNull(info.nativeCode)
        assertNull(info.gattStatus)
    }
}
