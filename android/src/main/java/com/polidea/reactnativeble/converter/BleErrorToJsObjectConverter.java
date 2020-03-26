package com.polidea.reactnativeble.converter;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.polidea.multiplatformbleadapter.errors.BleError;

public class BleErrorToJsObjectConverter {

    public ReadableArray toJSCallback(BleError error) {
        WritableArray array = Arguments.createArray();
        array.pushString(toJs(error));
        array.pushNull();
        return array;
    }

    public String toJs(BleError error) {
        WritableArray array = Arguments.createArray();
        StringBuilder stringBuilder = new StringBuilder();
        stringBuilder.append("{");

        stringBuilder.append("\"errorCode\":");
        stringBuilder.append(error.errorCode.code);

        stringBuilder.append(",\"attErrorCode\":");
        if (error.androidCode == null || error.androidCode >= 0x80 || error.androidCode < 0) {
            stringBuilder.append("null");
        } else {
            stringBuilder.append(error.androidCode.intValue());
        }

        stringBuilder.append(",\"iosErrorCode\": null");

        stringBuilder.append(",\"androidErrorCode\":");
        if (error.androidCode == null || error.androidCode < 0x80) {
            stringBuilder.append("null");
        } else {
            stringBuilder.append(error.androidCode.intValue());
        }

        appendString(stringBuilder, "reason", error.reason);
        appendString(stringBuilder, "deviceID", error.deviceID);
        appendString(stringBuilder, "serviceUUID", error.serviceUUID);
        appendString(stringBuilder, "characteristicUUID", error.characteristicUUID);
        appendString(stringBuilder, "descriptorUUID", error.descriptorUUID);
        appendString(stringBuilder, "internalMessage", error.internalMessage);

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
}