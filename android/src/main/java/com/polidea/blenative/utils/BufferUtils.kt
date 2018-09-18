package com.polidea.blenative.utils

import com.polidea.blenative.handlers.BufferHandler
import com.polidea.blenative.handlers.RequestHandler
import com.polidea.blenative.models.BleError
import com.polidea.blenative.models.Buffer
import com.polidea.blenative.models.requestType

object BufferUtils {
    fun updateBuffersRequests(buffers: List<Buffer>, requestHandler: RequestHandler, bufferHandler: BufferHandler) {
        for (buffer in buffers) {
            val request = requestHandler.findRequest(buffer.id, buffer.type.requestType) ?: continue
            val options = request.options ?: continue
            val items = bufferHandler.actionOnBuffer(buffer, options) ?: continue
            request.callback(ResultUtils.createSuccessResult(items))
            requestHandler.removeRequest(request)
        }
    }

    fun invalidateBufferRequests(invalidatedBuffers: List<Buffer>, error: BleError, requestHandler: RequestHandler) {
        for (buffer in invalidatedBuffers) {
            val request = requestHandler.findRequest(buffer.id, buffer.type.requestType) ?: continue
            request.callback(error.asErrorResult())
            requestHandler.removeRequest(request)
        }
    }
}