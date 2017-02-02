package com.polidea.reactnativeble.exceptions;

import android.bluetooth.BluetoothGattCharacteristic;

public class CannotMonitorCharacteristicException extends RuntimeException {
    private BluetoothGattCharacteristic characteristic;

    public CannotMonitorCharacteristicException(BluetoothGattCharacteristic characteristic) {
        this.characteristic = characteristic;
    }

    public BluetoothGattCharacteristic getCharacteristic() {
        return characteristic;
    }
}
