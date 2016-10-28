package com.polidea.reactnativeble.utils;

import android.util.Base64;

public class Base64Converter {
    public static String fromBytes(byte[] bytes) {
        return Base64.encodeToString(bytes, Base64.NO_WRAP);
    }
    public static byte[] fromString(String base64) {
        return Base64.decode(base64, Base64.NO_WRAP);
    }
}
