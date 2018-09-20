package com.polidea.reactnativeble;

import android.support.annotation.NonNull;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class NativeParser {
    static Map<String, Object> toNative(@NonNull ReadableMap map) {
        Map<String, Object> result = new HashMap<>();
        final ReadableMapKeySetIterator iterator = map.keySetIterator();
        while (iterator.hasNextKey()) {
            final String key = iterator.nextKey();
            final ReadableType type = map.getType(key);
            switch (type) {
                case Boolean:
                    result.put(key, map.getBoolean(key));
                    break;
                case Number:
                    result.put(key, map.getDouble(key));
                    break;
                case String:
                    result.put(key, map.getString(key));
                    break;
                case Map:
                    result.put(key, toNative(map.getMap(key)));
                    break;
                case Array:
                    result.put(key, toNative(map.getArray(key)));
                    break;
            }
        }
        return result;
    }

    static List<Object> toNative(@NonNull ReadableArray array) {
        List<Object> result = new ArrayList<>(array.size());
        for (int index = 0; index < array.size(); index++) {
            final ReadableType type = array.getType(index);
            switch (type) {
                case Boolean:
                    result.add(array.getBoolean(index));
                    break;
                case Number:
                    result.add(array.getDouble(index));
                    break;
                case String:
                    result.add(array.getString(index));
                    break;
                case Map:
                    result.add(toNative(array.getMap(index)));
                    break;
                case Array:
                    result.add(toNative(array.getArray(index)));
                    break;
            }
        }
        return result;
    }

    static Object toJs(@NonNull Object object) {
        if (object instanceof Map) {
            Map<String, Object> objectMap = (Map<String, Object>) object;
            WritableMap resultMap = Arguments.createMap();
            for (Map.Entry<String, Object> entry: objectMap.entrySet()) {
                final Object value = entry.getValue();
                final String key = entry.getKey();
                if (value instanceof Map) {
                    resultMap.putMap(key, (WritableMap) toJs(value));
                } else if (value instanceof List) {
                    resultMap.putArray(key, (WritableArray) toJs(value));
                } else if (value instanceof Boolean) {
                    resultMap.putBoolean(key, (Boolean) value);
                } else if (value instanceof Double) {
                    resultMap.putDouble(key, (Double) value);
                } else if (value instanceof Integer) {
                    resultMap.putInt(key, (Integer) value);
                } else if (value instanceof String) {
                    resultMap.putString(key, (String) value);
                } else if (value == null) {
                    resultMap.putNull(key);
                }
            }
            return resultMap;
        } else if (object instanceof List) {
            List<Object> objectList = (List<Object>) object;
            WritableArray resultArray = Arguments.createArray();
            for (Object value: objectList) {
                if (value instanceof Map) {
                    resultArray.pushMap((WritableMap) toJs(value));
                } else if (value instanceof List) {
                    resultArray.pushArray((WritableArray) toJs(value));
                } else if (value instanceof Boolean) {
                    resultArray.pushBoolean((Boolean) value);
                } else if (value instanceof Double) {
                    resultArray.pushDouble((Double) value);
                } else if (value instanceof Integer) {
                    resultArray.pushInt((Integer) value);
                } else if (value instanceof String) {
                    resultArray.pushString((String) value);
                } else if (value == null) {
                    resultArray.pushNull();
                }
            }
            return resultArray;
        }
        return object;
    }
}