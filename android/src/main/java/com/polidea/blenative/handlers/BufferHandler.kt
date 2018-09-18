package com.polidea.blenative.handlers

import com.polidea.blenative.BufferActionPlacement
import com.polidea.blenative.BufferActionStrategy
import com.polidea.blenative.models.BleError
import com.polidea.blenative.models.Buffer
import com.polidea.blenative.models.BufferType
import com.polidea.blenative.utils.bufferChunkSize
import com.polidea.blenative.utils.bufferPlacement
import com.polidea.blenative.utils.bufferStrategy

class BufferHandler {
    private var idToBuffer: MutableMap<Int, Buffer> = mutableMapOf()

    private var bufferTypeToBuffers: MutableMap<BufferType, MutableList<Buffer>> = mutableMapOf()

    private var currentBufferId = 0

    fun buffer(id: Int): Buffer? = idToBuffer[id]

    fun actionOnBuffer(buffer: Buffer, options: Map<String, Any>, fulfillRequest: Boolean = true): List<Any>? {
        val strategy = options.bufferStrategy ?: BufferActionStrategy.TAKE
        val placement = options.bufferPlacement ?: BufferActionPlacement.LATEST
        val chunkSize = options.bufferChunkSize
        val lastItems = placement == BufferActionPlacement.LATEST

        return when (strategy) {
            BufferActionStrategy.TAKE -> buffer.take(chunkSize, lastItems, fulfillRequest)
            BufferActionStrategy.PEEK -> buffer.take(chunkSize, lastItems, fulfillRequest)
        }
    }

    fun removeBuffer(buffer: Buffer) {
        idToBuffer.remove(buffer.id)
        val buffers = bufferTypeToBuffers[buffer.type] ?: return
        buffers.removeAll { it.id == buffer.id }
        if (buffers.size == 0) {
            bufferTypeToBuffers.remove(buffer.type)
        }
    }

    fun addBuffer(type: BufferType, relatedIdentifier: Int? = null): Buffer {
        val bufferId = nextBufferId(type)
        val buffer = Buffer(bufferId, type, relatedIdentifier)
        idToBuffer[bufferId] = buffer
        val buffers = bufferTypeToBuffers[type] ?: mutableListOf()
        buffers.add(buffer)
        bufferTypeToBuffers[type] = buffers
        return buffer
    }

    fun appendBufferElements(elements: List<Any>, type: BufferType, relatedIdentifier: Int? = null): List<Buffer> {
        return appendBufferElement({ it.appendAll(elements) }, type, relatedIdentifier)
    }

    fun appendBufferElement(element: Any, type: BufferType, relatedIdentifier: Int? = null): List<Buffer> {
        return appendBufferElement({ it.append(element) }, type, relatedIdentifier)
    }

    private fun appendBufferElement(onAppend: (Buffer) -> Unit, type: BufferType, relatedIdentifier: Int? = null): List<Buffer> {
        val buffers = bufferTypeToBuffers[type]?.filter {
            it.relatedIdentifier == relatedIdentifier
                    && !it.invalidated
        } ?: return emptyList()
        buffers.forEach { onAppend(it) }
        return buffers
    }

    fun markBuffersInvalidated(reason: BleError, exceptTypes: List<BufferType>): List<Buffer> {
        return markBuffersInvalidated(reason, { !it.invalidated }, exceptTypes)
    }

    fun markBuffersInvalidated(reason: BleError, relatedIdentifier: Int, exceptTypes: List<BufferType>): List<Buffer> {
        return markBuffersInvalidated(reason,
                { it.relatedIdentifier == relatedIdentifier && !it.invalidated },
                exceptTypes)
    }

    fun markBuffersInvalidated(reason: BleError, type: BufferType): List<Buffer> {
        return markBuffersInvalidated(reason, { it.type == type }, listOf())
    }

    fun hasBuffer(type: BufferType, relatedIdentifier: Int? = null): Boolean {
        return bufferTypeToBuffers[type]?.find { it.relatedIdentifier == relatedIdentifier } != null
    }

    private fun markBuffersInvalidated(reason: BleError,
                                       bufferFilter: (Buffer) -> Boolean,
                                       exceptTypes: List<BufferType>): List<Buffer> {
        val buffers = bufferTypeToBuffers
                .filter { !exceptTypes.contains(it.key) }
                .values
                .fold(mutableListOf<Buffer>()) { result, buffers ->
                    return@fold (result + buffers.filter(bufferFilter)).toMutableList()
                }
        buffers.forEach { it.invalidate(reason) }
        return buffers
    }

    private fun nextBufferId(type: BufferType): Int {
        return when (type) {
            BufferType.SCAN -> deviceScanBufferId
            BufferType.STATE_RESTORE -> restoreStateBufferId
            else -> ++currentBufferId
        }
    }


    companion object {
        const val deviceScanBufferId = Int.MAX_VALUE
        const val restoreStateBufferId = Int.MAX_VALUE - 1
    }
}