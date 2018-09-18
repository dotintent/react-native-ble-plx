package com.polidea.blenative.models

import com.polidea.blenative.centralmanager.Callback

enum class RequestType {
    READ_RSSI,
    CONNECT,
    DISCONNECT,
    DISCOVER_SERVICES,
    READ,
    WRITE,
    MTU,

    BUFFER_STATE,
    BUFFER_SCAN,
    BUFFER_VALUE_CHANGE,
    BUFFER_DISCONNECT,
    BUFFER_STATE_RESTORE,
    BUFFER_NAME,
    BUFFER_MTU;

    fun isBufferRequest(): Boolean {
        return when (this) {
            RequestType.READ_RSSI -> false
            RequestType.CONNECT -> false
            RequestType.DISCONNECT -> false
            RequestType.DISCOVER_SERVICES -> false
            RequestType.READ -> false
            RequestType.WRITE -> false
            RequestType.MTU -> false
            RequestType.BUFFER_STATE -> true
            RequestType.BUFFER_SCAN -> true
            RequestType.BUFFER_VALUE_CHANGE -> true
            RequestType.BUFFER_DISCONNECT -> true
            RequestType.BUFFER_STATE_RESTORE -> true
            RequestType.BUFFER_NAME -> true
            RequestType.BUFFER_MTU -> true
        }
    }
}

val BufferType.requestType: RequestType
    get() = when (this) {
        BufferType.DISCONNECT -> RequestType.BUFFER_DISCONNECT
        BufferType.SCAN -> RequestType.BUFFER_SCAN
        BufferType.STATE -> RequestType.BUFFER_STATE
        BufferType.STATE_RESTORE -> RequestType.BUFFER_STATE_RESTORE
        BufferType.VALUE_CHANGE -> RequestType.BUFFER_VALUE_CHANGE
        BufferType.NAME -> RequestType.BUFFER_NAME
        BufferType.MTU -> RequestType.BUFFER_MTU
    }

data class Request(val type: RequestType,
                   val relatedIdentifier: Int,
                   val promiseId: String? = null,
                   val options: Map<String, Any>? = null,
                   val callback: Callback) {


    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other == null || javaClass != other.javaClass) return false

        val that = other as Request

        if (relatedIdentifier != that.relatedIdentifier) return false
        if (type != that.type) return false
        return if (promiseId != null) promiseId == that.promiseId else that.promiseId == null
    }

    override fun hashCode(): Int {
        var result = type.hashCode()
        result = 31 * result + relatedIdentifier
        result = 31 * result + (promiseId?.hashCode() ?: 0)
        return result
    }
}