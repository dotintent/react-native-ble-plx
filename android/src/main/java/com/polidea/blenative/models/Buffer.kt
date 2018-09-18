package com.polidea.blenative.models

import kotlin.math.max
import kotlin.math.min

enum class BufferType {
    STATE,
    SCAN,
    VALUE_CHANGE,
    DISCONNECT,
    STATE_RESTORE,
    NAME,
    MTU
}

class Buffer(val id: Int, val type: BufferType, val relatedIdentifier: Int? = null) {

    private var items = mutableListOf<Any>()

    var invalidated = false
        private set

    var invalidatedReason: BleError? = null
        private set

    fun invalidate(reason: BleError) {
        invalidated = true
        invalidatedReason = reason
    }

    fun append(element: Any) {
        items.add(element)
    }

    fun appendAll(elements: List<Any>) {
        items.addAll(elements)
    }

    fun take(amount: Int? = null, lastItems: Boolean = false, fulfill: Boolean = true): List<Any>? {
        return retrieve(true, amount, lastItems, fulfill)
    }

    fun peek(amount: Int? = null, lastItems: Boolean = false, fulfill: Boolean = true): List<Any>? {
        return retrieve(false, amount, lastItems, fulfill)
    }

    private fun retrieve(remove: Boolean, amount: Int?, lastItems: Boolean, fulfill: Boolean): List<Any>? {
        var amount = amount ?: items.size
        if (fulfill && (amount > items.size || amount < 1)) {
            return null
        }
        if (!fulfill) {
            amount = max(min(items.size, amount), 0)
        }
        val result: List<Any>
        if (lastItems) {
            result = items.takeLast(amount)
            if (remove) {
                items = items.dropLast(amount).toMutableList()
            }
        } else {
            result = items.take(amount)
            if (remove) {
                items = items.drop(amount).toMutableList()
            }
        }
        return result
    }

    fun removeAll() {
        items.clear()
    }
}