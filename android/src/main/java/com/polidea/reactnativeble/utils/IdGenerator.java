package com.polidea.reactnativeble.utils;

import android.util.Pair;
import java.util.HashMap;
import java.util.UUID;

public class IdGenerator {
    private static HashMap<Pair<UUID, Integer>, Integer> idMap = new HashMap<>();
    private static int nextKey = 0;

    public static int getIdForKey(Pair<UUID, Integer> keyPair) {
        Integer id = idMap.get(keyPair);
        if (id != null) {
            return id;
        }
        idMap.put(keyPair, ++nextKey);
        return nextKey;
    }

    public static void clear() {
        idMap.clear();
        nextKey = 0;
    }
}
