package com.polidea.blenative.scan

import java.util.*

interface ScanHelper {
    fun startScan(filteredUUIDs: Array<UUID>, callback: BleScanCallback)
    fun stopScan()
}