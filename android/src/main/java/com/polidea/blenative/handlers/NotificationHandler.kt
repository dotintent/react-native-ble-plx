package com.polidea.blenative.handlers

import com.polidea.blenative.centralmanager.Callback

class NotificationHandler {
    private val enabledCallbacksForId = mutableMapOf<Int, MutableList<Callback>>()

    fun enabledCallbacksForId(id: Int): MutableList<Callback>? {
        return enabledCallbacksForId[id]
    }

    fun removeEnabledCallbacksForId(id: Int) {
        enabledCallbacksForId.remove(id)
    }

    fun setCallbacksForId(callbacks: MutableList<Callback>, id: Int) {
        enabledCallbacksForId[id] = callbacks
    }
}