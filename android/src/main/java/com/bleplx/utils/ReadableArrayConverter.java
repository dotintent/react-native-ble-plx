package com.bleplx.utils;

import com.facebook.react.bridge.ReadableArray;

public class ReadableArrayConverter {
  public static String[] toStringArray(ReadableArray readableArray) {
    String[] stringArray = new String[readableArray.size()];
    for (int i = 0; i < readableArray.size(); ++i) {
      stringArray[i] = readableArray.getString(i);
    }
    return stringArray;
  }
}
