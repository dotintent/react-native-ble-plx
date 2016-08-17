package com.polidea.reactnativeble.utils;

import com.facebook.react.bridge.ReadableArray;

import java.util.UUID;

public class UUIDConverter {
    static public UUID convert(String sUUID) {
        try {
            return UUID.fromString(sUUID);
        } catch (Throwable e) {
            return null;
        }
    }

    static public UUID[] convert(String... sUUIDs) {
        UUID[] UUIDs = new UUID[sUUIDs.length];
        for (int i = 0; i < sUUIDs.length; i++) {
            try {
                UUIDs[i] = UUID.fromString(sUUIDs[i]);
            } catch (Throwable e) {
                return null;
            }
        }
        return UUIDs;
    }

    static public UUID[] convert(ReadableArray aUUIDs) {
        UUID[] UUIDs = new UUID[aUUIDs.size()];
        for (int i = 0; i < aUUIDs.size(); i++) {
            try {
                UUIDs[i] = UUID.fromString(aUUIDs.getString(i));
            } catch (Throwable e) {
                return null;
            }
        }
        return UUIDs;
    }
}
