package com.polidea.blenative.scan

import android.bluetooth.BluetoothAdapter
import com.polidea.blenative.models.BleScanResult
import com.polidea.blenative.utils.BleLog
import java.util.*

class ScanHelperImpl19(private val adapter: BluetoothAdapter) : ScanHelper {
    private var ongoingScanCallback: BluetoothAdapter.LeScanCallback? = null

    override fun stopScan() {
        BleLog.d("ScanHelperImpl19 stopScan()")
        if (ongoingScanCallback != null) {
            adapter.stopLeScan(ongoingScanCallback)
            ongoingScanCallback = null
        }
    }

    override fun startScan(filteredUUIDs: Array<UUID>, callback: BleScanCallback) {
        BleLog.d("ScanHelperImpl19 startScan(filteredUUIDs: $filteredUUIDs)")
        ongoingScanCallback = BluetoothAdapter.LeScanCallback { device, rssi, scanRecord ->
            BleLog.d("ScanHelperImpl19 onLeScan(device: ${device.address}, rssi: $rssi, scanRecord: $scanRecord)")
            val result = BleScanResult(device, rssi, scanRecord, true)
            callback.onScanResult(listOf(result))
        }
        adapter.startLeScan(filteredUUIDs, ongoingScanCallback)
    }
}