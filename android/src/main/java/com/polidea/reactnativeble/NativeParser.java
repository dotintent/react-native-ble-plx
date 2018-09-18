package com.polidea.reactnativeble;

import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.facebook.react.bridge.ReadableType;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class NativeParser {
    static Map<String, Object> parseToNative(ReadableMap map) {
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
                    result.put(key, parseToNative(map.getMap(key)));
                    break;
                case Array:
                    result.put(key, parseToNative(map.getArray(key)));
                    break;
            }
        }
        return result;
    }

    static List<Object> parseToNative(ReadableArray array) {
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
                    result.add(parseToNative(array.getMap(index)));
                    break;
                case Array:
                    result.add(parseToNative(array.getArray(index)));
                    break;
            }
        }
        return result;
    }
}
