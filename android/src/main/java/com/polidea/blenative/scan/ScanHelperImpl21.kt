package com.polidea.blenative.scan

import android.annotation.TargetApi
import android.bluetooth.BluetoothAdapter
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.os.Build
import android.os.ParcelUuid
import com.polidea.blenative.models.BleError
import com.polidea.blenative.models.BleErrorCode
import com.polidea.blenative.models.BleScanResult
import com.polidea.blenative.utils.BleLog
import java.util.*


@TargetApi(Build.VERSION_CODES.LOLLIPOP)
class ScanHelperImpl21(private val adapter: BluetoothAdapter) : ScanHelper {
    private var ongoingScanCallback: android.bluetooth.le.ScanCallback? = null

    override fun startScan(filteredUUIDs: Array<UUID>, callback: BleScanCallback) {
        BleLog.d("ScanHelperImpl21 startScan(filteredUUIDs: $filteredUUIDs)")
        val scanFilters = filteredUUIDs.map {
            val parcelUuid = ParcelUuid(it)
            ScanFilter.Builder().setServiceUuid(parcelUuid).build()
        }
        ongoingScanCallback = object: ScanCallback() {
            override fun onScanResult(callbackType: Int, result: ScanResult) {
                BleLog.d("ScanHelperImpl21 onScanResult(callbackType: $callbackType, result: $result)")
                callback.onScanResult(listOf(BleScanResult.fromNative(result)))
            }

            override fun onBatchScanResults(results: MutableList<ScanResult>) {
                BleLog.d("ScanHelperImpl21 onBatchScanResults(results: $results)")
                callback.onScanResult(results.map { BleScanResult.fromNative(it) })
            }

            override fun onScanFailed(errorCode: Int) {
                BleLog.d("ScanHelperImpl21 onScanFailed(errorCode: $errorCode)")
                callback.onScanError(mapNativeErrorCode(errorCode))
            }
        }
        adapter.bluetoothLeScanner.startScan(scanFilters, ScanSettings.Builder().build(), ongoingScanCallback)
    }

    override fun stopScan() {
        BleLog.d("ScanHelperImpl21 stopScan()")
        if (ongoingScanCallback != null) {
            adapter.bluetoothLeScanner.stopScan(ongoingScanCallback)
            ongoingScanCallback = null
        }
    }

    private fun mapNativeErrorCode(nativeErrorCode: Int) = when (nativeErrorCode) {
        ScanCallback.SCAN_FAILED_ALREADY_STARTED -> BleError(BleErrorCode.SCAN_START_FAILED, reason = "Cannot start new scan when there is different scan ongoing")
        ScanCallback.SCAN_FAILED_APPLICATION_REGISTRATION_FAILED -> BleError(BleErrorCode.SCAN_START_FAILED, reason = "Application registration failed")
        ScanCallback.SCAN_FAILED_FEATURE_UNSUPPORTED -> BleError(BleErrorCode.SCAN_START_FAILED, reason = "Feature unsupported")
        ScanCallback.SCAN_FAILED_INTERNAL_ERROR -> BleError(BleErrorCode.SCAN_START_FAILED, reason = "Internal error")
        else -> BleError(BleErrorCode.SCAN_START_FAILED, reason = "Unknown error code")
    }
}