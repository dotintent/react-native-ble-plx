package com.polidea.blenative.models

import android.annotation.TargetApi
import android.bluetooth.BluetoothDevice
import android.bluetooth.le.ScanResult
import android.os.Build
import java.util.*

data class BleScanResult(
        val bleDevice: BluetoothDevice,
        val rssi: Int,
        val scanRecord: ByteArray
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as BleScanResult

        if (bleDevice != other.bleDevice) return false
        if (rssi != other.rssi) return false
        if (!Arrays.equals(scanRecord, other.scanRecord)) return false

        return true
    }

    override fun hashCode(): Int {
        var result = bleDevice.hashCode()
        result = 31 * result + rssi
        result = 31 * result + Arrays.hashCode(scanRecord)
        return result
    }

    companion object {
        @TargetApi(Build.VERSION_CODES.LOLLIPOP)
        fun fromNative(scanResult: ScanResult): BleScanResult {
            return BleScanResult(
                    scanResult.device,
                    scanResult.rssi,
                    scanResult.scanRecord.bytes
            )
        }
    }
}