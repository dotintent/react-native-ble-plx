package com.polidea.blenative.scan

import com.polidea.blenative.models.BleError
import com.polidea.blenative.models.BleScanResult

interface BleScanCallback {
    fun onScanResult(results: List<BleScanResult>)
    fun onScanError(error: BleError)
}