package com.polidea.blenative.utils

import java.util.*

object UUIDConverter {

    private val baseUUIDPrefix = "0000"
    private val baseUUIDSuffix = "-0000-1000-8000-00805F9B34FB"

    fun convert(originalUUID: String?): UUID? {
        var sUUID = originalUUID ?: return null

        if (sUUID.length == 4) {
            sUUID = baseUUIDPrefix + sUUID + baseUUIDSuffix
        } else if (sUUID.length == 8) {
            sUUID += baseUUIDSuffix
        }

        return try {
            UUID.fromString(sUUID)
        } catch (e: Throwable) {
            null
        }
    }

    fun fromUUID(uuid: UUID): String {
        return uuid.toString().toLowerCase()
    }
}
