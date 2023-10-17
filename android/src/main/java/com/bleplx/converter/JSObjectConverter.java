package com.bleplx.converter;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

abstract class JSObjectConverter<T> {

  abstract public WritableMap toJSObject(T value);

  public WritableArray toJSCallback(T value) {
    WritableArray array = Arguments.createArray();
    array.pushNull();
    array.pushMap(toJSObject(value));
    return array;
  }
}
