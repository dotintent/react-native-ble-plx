package com.polidea.reactnativeble.errors;

import android.support.annotation.NonNull;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableArray;
import com.polidea.reactnativeble.utils.SafePromise;

public class BleError {

    private BleErrorCode errorCode;
    private Integer androidCode;
    private String reason;

    public String deviceID;
    public String serviceUUID;
    public String characteristicUUID;
    public String descriptorUUID;
    public String internalMessage;

    public BleError(BleErrorCode errorCode, String reason, Integer androidCode) {
        this.errorCode = errorCode;
        this.reason = reason;
        this.androidCode = androidCode;
    }

    public String toJS() {
        StringBuilder stringBuilder = new StringBuilder();
        stringBuilder.append("{");

        stringBuilder.append("\"errorCode\":");
        stringBuilder.append(errorCode.code);

        stringBuilder.append(",\"attErrorCode\":");
        if (androidCode == null || androidCode >= 0x80 || androidCode < 0) {
            stringBuilder.append("null");
        } else {
            stringBuilder.append(androidCode);
        }

        stringBuilder.append(",\"iosErrorCode\": null");

        stringBuilder.append(",\"androidErrorCode\":");
        if (androidCode == null || androidCode < 0x80) {
            stringBuilder.append("null");
        } else {
            stringBuilder.append(androidCode);
        }

        appendString(stringBuilder, "reason", reason);
        appendString(stringBuilder, "deviceID", deviceID);
        appendString(stringBuilder, "serviceUUID", serviceUUID);
        appendString(stringBuilder, "characteristicUUID", characteristicUUID);
        appendString(stringBuilder, "descriptorUUID", descriptorUUID);
        appendString(stringBuilder, "internalMessage", internalMessage);

        stringBuilder.append("}");

        return stringBuilder.toString();
    }

    private void appendString(StringBuilder stringBuilder, String key, String value) {
        stringBuilder.append(",\"");
        stringBuilder.append(key);
        stringBuilder.append("\":");
        if (value == null) {
            stringBuilder.append("null");
        } else {
            stringBuilder.append("\"");
            stringBuilder.append(value);
            stringBuilder.append("\"");
        }
    }

    public ReadableArray toJSCallback() {
        WritableArray array = Arguments.createArray();
        array.pushString(toJS());
        array.pushNull();
        return array;
    }

    public void reject(@NonNull Promise promise) {
        promise.reject(null, toJS());
    }

    public void reject(@NonNull SafePromise promise) {
        promise.reject(null, toJS());
    }
}
