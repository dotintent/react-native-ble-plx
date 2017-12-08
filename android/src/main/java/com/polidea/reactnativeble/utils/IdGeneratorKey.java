package com.polidea.reactnativeble.utils;


import com.polidea.rxandroidble.RxBleDevice;
import java.util.UUID;

public class IdGeneratorKey {

    private final RxBleDevice bluetoothDevice;
    private final UUID uuid;
    private final int id;

    public IdGeneratorKey(RxBleDevice bluetoothDevice, UUID uuid, int id) {
        this.bluetoothDevice = bluetoothDevice;
        this.uuid = uuid;
        this.id = id;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof IdGeneratorKey)) {
            return false;
        }

        IdGeneratorKey that = (IdGeneratorKey) o;

        return id == that.id &&
                bluetoothDevice.getMacAddress().equals(that.bluetoothDevice.getMacAddress()) &&
                uuid.equals(that.uuid);
    }

    @Override
    public int hashCode() {
        int result = bluetoothDevice.getMacAddress().hashCode();
        result = 31 * result + uuid.hashCode();
        result = 31 * result + id;
        return result;
    }
}
