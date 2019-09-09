package com.polidea.reactnativeble.utils;

import java.util.UUID;

public class IdGeneratorKey {

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;

        IdGeneratorKey that = (IdGeneratorKey) o;

        if (id != that.id) return false;
        if (!deviceId.equals(that.deviceId)) return false;
        return uuid.equals(that.uuid);
    }

    @Override
    public int hashCode() {
        int result = deviceId.hashCode();
        result = 31 * result + uuid.hashCode();
        result = 31 * result + id;
        return result;
    }

    private final String deviceId;
    private final UUID uuid;
    private final int id;

    public IdGeneratorKey(String deviceId, UUID uuid, int id) {
        this.deviceId = deviceId;
        this.uuid = uuid;
        this.id = id;
    }
}
