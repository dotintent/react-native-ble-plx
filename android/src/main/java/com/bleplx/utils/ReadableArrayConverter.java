package com.bleplx.utils;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableArray;

import java.util.List;
import java.util.UUID;

public class ReadableArrayConverter {
  public static String[] toStringArray(ReadableArray readableArray) {
    String[] stringArray = new String[readableArray.size()];
    for (int i = 0; i < readableArray.size(); ++i) {
      stringArray[i] = readableArray.getString(i);
    }
    return stringArray;
  }

  public static ReadableArray toReadableArray(List<UUID> uuids) {
    WritableArray array = Arguments.createArray();

    for (UUID uuid : uuids) {
      array.pushString(uuid.toString());
    }

    return array;
  }
}
