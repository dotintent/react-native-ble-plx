package com.polidea.reactnativeble.converter;

import com.facebook.react.bridge.WritableMap;

interface Converter<JAVA_OBJECT> {

    WritableMap convert(JAVA_OBJECT javaObject);
}
