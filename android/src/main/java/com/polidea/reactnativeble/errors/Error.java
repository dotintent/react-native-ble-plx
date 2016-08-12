package com.polidea.reactnativeble.errors;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

public class Error {
    private int code;
    private String message;
    private boolean isCancelled;

    public Error(String message, int code,  boolean isCancelled) {
        this.code = code;
        this.message = message;
        this.isCancelled = isCancelled;
    }

    public Error(String message, int code) {
        this.code = code;
        this.message = message;
        this.isCancelled = false;
    }

    public WritableMap toJS() {
        WritableMap error = Arguments.createMap();
        error.putInt("code", code);
        error.putString("message", message);
        if (isCancelled) {
            error.putBoolean("isCancelled", true);
        }
        return error;
    }

    public ReadableArray toJSCallback() {
        WritableArray array = Arguments.createArray();
        array.pushMap(toJS());
        array.pushNull();
        return array;
    }

    public void reject(Promise promise) {
        promise.reject(Integer.toString(code), message);
    }
}
