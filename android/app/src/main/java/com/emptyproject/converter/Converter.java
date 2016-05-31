package com.emptyproject.converter;

import com.facebook.react.bridge.WritableMap;

/**
 * Created by Konrad on 24/05/16.
 */
public interface Converter<JAVA_OBJECT> {

    WritableMap convert(JAVA_OBJECT javaObject);
}
