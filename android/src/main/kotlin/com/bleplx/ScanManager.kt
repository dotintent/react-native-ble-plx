package com.bleplx

import android.content.Context
import android.os.ParcelUuid
import no.nordicsemi.android.support.v18.scanner.BluetoothLeScannerCompat
import no.nordicsemi.android.support.v18.scanner.ScanCallback
import no.nordicsemi.android.support.v18.scanner.ScanFilter
import no.nordicsemi.android.support.v18.scanner.ScanResult
import no.nordicsemi.android.support.v18.scanner.ScanSettings
import java.util.concurrent.ConcurrentLinkedDeque

/**
 * Wraps Nordic Scanner Compat with throttle debouncing.
 *
 * Android enforces a hard limit of 5 scan starts in 30 seconds.
 * This manager tracks timestamps and rejects early if the limit
 * would be hit, and spaces restarts by at least 6 seconds.
 */
class ScanManager(private val context: Context) {

    private val scanner: BluetoothLeScannerCompat = BluetoothLeScannerCompat.getScanner()
    private var currentCallback: ScanCallback? = null
    private val scanStartTimestamps = ConcurrentLinkedDeque<Long>()

    companion object {
        private const val MAX_STARTS_IN_WINDOW = 5
        private const val WINDOW_MS = 30_000L
        private const val MIN_RESTART_INTERVAL_MS = 6_000L
    }

    interface ScanListener {
        fun onScanResult(result: ScanResult)
        fun onScanFailed(errorCode: Int)
    }

    /**
     * Start a BLE scan.
     *
     * @param uuids Optional list of service UUID strings to filter by
     * @param scanMode ScanSettings scan mode (0=low power, 1=balanced, 2=low latency)
     * @param callbackType ScanSettings callback type
     * @param legacyScan Whether to use legacy scanning
     * @param listener Callback for results
     * @return null on success, or a BleErrorInfo if throttled/failed
     */
    fun startScan(
        uuids: List<String>?,
        scanMode: Int,
        callbackType: Int,
        legacyScan: Boolean,
        listener: ScanListener
    ): ErrorConverter.BleErrorInfo? {
        // Check permissions
        if (!PermissionHelper.hasPermissions(context, PermissionHelper.PermissionGroup.SCAN)) {
            return ErrorConverter.BleErrorInfo(
                code = ErrorConverter.CONNECT_PERMISSION_DENIED,
                message = "Missing BLUETOOTH_SCAN permission",
                isRetryable = false
            )
        }

        // Check throttle limit
        if (isThrottled()) {
            return ErrorConverter.scanThrottled()
        }

        // Stop any existing scan
        stopScan()

        // Build scan filters
        val filters = mutableListOf<ScanFilter>()
        uuids?.forEach { uuid ->
            try {
                filters.add(
                    ScanFilter.Builder()
                        .setServiceUuid(ParcelUuid.fromString(uuid))
                        .build()
                )
            } catch (_: Exception) {
                // Skip invalid UUIDs
            }
        }

        // Build scan settings
        val settingsBuilder = ScanSettings.Builder()
            .setScanMode(scanMode)
            .setCallbackType(callbackType)
            .setLegacy(legacyScan)
            .setUseHardwareBatchingIfSupported(false)

        val callback = object : ScanCallback() {
            override fun onScanResult(callbackType: Int, result: ScanResult) {
                listener.onScanResult(result)
            }

            override fun onScanFailed(errorCode: Int) {
                listener.onScanFailed(errorCode)
            }
        }
        currentCallback = callback

        return try {
            recordScanStart()
            scanner.startScan(
                if (filters.isEmpty()) null else filters,
                settingsBuilder.build(),
                callback
            )
            null // success
        } catch (e: SecurityException) {
            ErrorConverter.fromException(e, operation = "startScan")
        } catch (e: Exception) {
            ErrorConverter.BleErrorInfo(
                code = ErrorConverter.SCAN_START_FAILED,
                message = e.message ?: "Failed to start scan",
                isRetryable = false
            )
        }
    }

    fun stopScan() {
        currentCallback?.let {
            try {
                scanner.stopScan(it)
            } catch (_: Exception) {
                // Ignore errors on stop
            }
            currentCallback = null
        }
    }

    val isScanning: Boolean
        get() = currentCallback != null

    /**
     * Check if starting a new scan would exceed the 5-in-30s limit.
     */
    private fun isThrottled(): Boolean {
        val now = System.currentTimeMillis()

        // Remove timestamps older than the window
        while (scanStartTimestamps.isNotEmpty() && now - scanStartTimestamps.peekFirst()!! > WINDOW_MS) {
            scanStartTimestamps.pollFirst()
        }

        // Check count
        if (scanStartTimestamps.size >= MAX_STARTS_IN_WINDOW) {
            return true
        }

        // Check minimum interval since last start
        val lastStart = scanStartTimestamps.peekLast()
        if (lastStart != null && now - lastStart < MIN_RESTART_INTERVAL_MS) {
            return true
        }

        return false
    }

    private fun recordScanStart() {
        scanStartTimestamps.addLast(System.currentTimeMillis())
    }
}
