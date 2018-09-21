package com.polidea.blenative.handlers

import com.polidea.blenative.models.GattQueueItem
import java.util.*

class GattQueueHandler(val callback: Callback) {
    private val queue: Queue<GattQueueItem> = LinkedList()
    private var isProcessOngoing = false

    fun add(item: GattQueueItem) {
        queue.add(item)
        processNextItemIfPossible()
    }

    fun onGattResult() {
        isProcessOngoing = false
        processNextItemIfPossible()
    }

    private fun processNextItemIfPossible() {
        if (isProcessOngoing) {
            return
        }

        val item = queue.remove() ?: return

        isProcessOngoing = true

        if (!callback.processItem(item)) {
            isProcessOngoing = false
            processNextItemIfPossible()
        }
    }

    fun invalidate() {
        queue.clear()
        isProcessOngoing = false
    }

    interface Callback {
        fun processItem(item: GattQueueItem): Boolean
    }
}