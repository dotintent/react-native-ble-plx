package com.polidea.reactnativeble.mock

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType

class MockReadableArray(private vararg val data: Any?) : ReadableArray {
        override fun size() = data.size
    
        override fun isNull(index: Int) = data.getOrNull(index) == null
        override fun getBoolean(index: Int) = data[index] as Boolean
        override fun getDouble(index: Int) = data[index] as Double
        override fun getInt(index: Int) = data[index] as Int
        override fun getString(index: Int) = data[index] as String
        override fun getArray(index: Int) = data[index] as ReadableArray
        override fun getMap(index: Int) = data[index] as ReadableMap
    
        override fun getType(index: Int): ReadableType = when (data[index]) {
                null -> ReadableType.Null
                is ReadableArray -> ReadableType.Array
                is ReadableMap -> ReadableType.Map
                is Boolean -> ReadableType.Boolean
                is String -> ReadableType.String
                is Int,
                is Double -> ReadableType.Number
                else -> throw IllegalStateException("Unexpected type at $index: ${data[index]?.javaClass?.name}")
            }
    }
