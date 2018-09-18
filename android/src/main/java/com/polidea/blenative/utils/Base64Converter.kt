package com.polidea.blenative.utils

import android.util.Base64

object Base64Converter {
    fun encode(bytes: ByteArray): String {
        return Base64.encodeToString(bytes, Base64.NO_WRAP)
    }

    fun decode(base64: String): ByteArray {
        return Base64.decode(base64, Base64.NO_WRAP)
    }
}