package com.polidea.blenative.utils

import java.util.*

object UUIDUtils {
    fun fromStringSafe(uuidString: String): UUID? {
        return try {
            UUID.fromString(uuidString)
        } catch (e: IllegalStateException) {
            null
        }
    }
}