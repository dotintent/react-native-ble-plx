package com.polidea.blenative.centralmanager

import android.bluetooth.BluetoothAdapter
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import com.polidea.blenative.handlers.BufferHandler
import com.polidea.blenative.handlers.CacheHandler
import com.polidea.blenative.handlers.RequestHandler
import com.polidea.blenative.models.BleError
import com.polidea.blenative.models.BleScanResult
import com.polidea.blenative.models.BufferType
import com.polidea.blenative.scan.BleScanCallback
import com.polidea.blenative.utils.BleLog
import com.polidea.blenative.utils.BleState
import com.polidea.blenative.utils.BufferUtils
import com.polidea.blenative.utils.asDataObject


class CentralManagerDelegateWrapper(
        private val centralId: Int,
        private val bufferHandler: BufferHandler,
        private val cacheHandler: CacheHandler,
        private val requestHandler: RequestHandler
) : BroadcastReceiver(), BleScanCallback {
    fun register(context: Context) {
        val intentFilter = IntentFilter()
        intentFilter.addAction(BluetoothAdapter.ACTION_STATE_CHANGED)
        context.registerReceiver(this, intentFilter)
    }

    override fun onScanResult(results: List<BleScanResult>) {
        val convertedResults = results.map { it.asDataObject(centralId) }
        val updatedBuffers = bufferHandler.appendBufferElements(convertedResults, BufferType.SCAN)
        BufferUtils.updateBuffersRequests(updatedBuffers, requestHandler, bufferHandler)
    }

    override fun onScanError(error: BleError) {
        val invalidatedBuffers = bufferHandler.markBuffersInvalidated(error, BufferType.SCAN)
        BufferUtils.invalidateBufferRequests(invalidatedBuffers, error, requestHandler)
    }

    private fun onStateChange(nativeState: Int) {
        BleLog.d("CentralManagerDelegateWrapper onStateChange(nativeState: $nativeState)")
        val state = BleState.fromNativeState(nativeState)
        val updatedBuffers = bufferHandler.appendBufferElement(state.asDataObject(), BufferType.STATE)
        BufferUtils.updateBuffersRequests(updatedBuffers, requestHandler, bufferHandler)

        if (state != BleState.POWERED_ON) {
            cacheHandler.clearAll()

            val error = BleError.invalidManagerState(state)
            val invalidatedBuffers = bufferHandler.markBuffersInvalidated(error, listOf(BufferType.STATE))
            BufferUtils.invalidateBufferRequests(invalidatedBuffers, error, requestHandler)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        BleLog.d("CentralManagerDelegateWrapper onReceive(intentAction: ${intent.action})")
        if (BluetoothAdapter.ACTION_STATE_CHANGED == intent.action) {
            val state = intent.getIntExtra(BluetoothAdapter.EXTRA_STATE, -1)
            onStateChange(state)
        }
    }
}