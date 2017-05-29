package com.polidea.reactnativeble.wrapper;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

public abstract class JSObject {

    abstract public WritableMap toJSObject();

    public ReadableArray toJSCallback() {
        WritableArray array = Arguments.createArray();
        array.pushNull();
        array.pushMap(toJSObject());
        return array;
    }
}
