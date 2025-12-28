package com.bleplx.utils;

import com.facebook.react.bridge.ReadableArray;

import java.util.UUID;

public class UUIDConverter {

  private static final String BASE_UUID_PREFIX = "0000";
  private static final String BASE_UUID_SUFFIX = "-0000-1000-8000-00805F9B34FB";

  public static UUID convert(String sUUID) {
    if (sUUID == null) return null;

    if (sUUID.length() == 4) {
      sUUID = BASE_UUID_PREFIX + sUUID + BASE_UUID_SUFFIX;
    } else if (sUUID.length() == 8) {
      sUUID = sUUID + BASE_UUID_SUFFIX;
    }

    try {
      return UUID.fromString(sUUID);
    } catch (Throwable e) {
      return null;
    }
  }

  public static UUID[] convert(String... sUUIDs) {
    UUID[] UUIDs = new UUID[sUUIDs.length];
    for (int i = 0; i < sUUIDs.length; i++) {

      if (sUUIDs[i] == null) return null;

      if (sUUIDs[i].length() == 4) {
        sUUIDs[i] = BASE_UUID_PREFIX + sUUIDs[i] + BASE_UUID_SUFFIX;
      } else if (sUUIDs[i].length() == 8) {
        sUUIDs[i] = sUUIDs[i] + BASE_UUID_SUFFIX;
      }

      try {
        UUIDs[i] = UUID.fromString(sUUIDs[i]);
      } catch (Throwable e) {
        return null;
      }
    }
    return UUIDs;
  }

  public static UUID[] convert(ReadableArray aUUIDs) {
    if (aUUIDs == null) return null;
    UUID[] UUIDs = new UUID[aUUIDs.size()];
    for (int i = 0; i < aUUIDs.size(); i++) {
      try {
        String sUUID = aUUIDs.getString(i);
        if (sUUID == null) return null;
        if (sUUID.length() == 4) {
          sUUID = BASE_UUID_PREFIX + sUUID + BASE_UUID_SUFFIX;
        } else if (sUUID.length() == 8) {
          sUUID = sUUID + BASE_UUID_SUFFIX;
        }
        UUIDs[i] = UUID.fromString(sUUID);
      } catch (Throwable e) {
        return null;
      }
    }
    return UUIDs;
  }

  public static String fromUUID(UUID uuid) {
    return uuid.toString().toLowerCase();
  }
}
