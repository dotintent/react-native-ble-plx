package com.polidea.reactnativeble.utils;

import android.util.Base64;

public class Base64Converter {
    public static String encode(byte[] bytes) {
        return Base64.encodeToString(bytes, Base64.NO_WRAP);
    }
    public static byte[] decode(String base64) {
        return Base64.decode(base64, Base64.NO_WRAP);
    }
}
