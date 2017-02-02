package com.polidea.reactnativeble.errors;

import com.polidea.reactnativeble.exceptions.CannotMonitorCharacteristicException;
import com.polidea.reactnativeble.utils.UUIDConverter;
import com.polidea.rxandroidble.exceptions.BleAlreadyConnectedException;
import com.polidea.rxandroidble.exceptions.BleCannotSetCharacteristicNotificationException;
import com.polidea.rxandroidble.exceptions.BleCharacteristicNotFoundException;
import com.polidea.rxandroidble.exceptions.BleGattCannotStartException;
import com.polidea.rxandroidble.exceptions.BleGattException;
import com.polidea.rxandroidble.exceptions.BleScanException;

public class ErrorConverter {

    public Error toError(Throwable throwable) {
        if (throwable instanceof CannotMonitorCharacteristicException) {
            CannotMonitorCharacteristicException exception = (CannotMonitorCharacteristicException)throwable;
            String uuid = UUIDConverter.fromUUID(exception.getCharacteristic().getUuid());
            return BleError.cannotMonitorCharacteristic(uuid);
        }
        if (throwable instanceof BleScanException) {
            return toError((BleScanException) throwable);
        }
        if (throwable instanceof BleAlreadyConnectedException) {
            return new Error(throwable.toString(), 203);
        }
        if (throwable instanceof BleCharacteristicNotFoundException) {
            return new Error(throwable.toString(), 503);
        }
        if (throwable instanceof BleGattCannotStartException) {
            return new Error(throwable.toString(), 600);
        }
        if (throwable instanceof BleGattException) {
            return new Error(throwable.toString(), 700);
        }
        if (throwable instanceof BleCannotSetCharacteristicNotificationException) {
            return new Error(throwable.toString(), 403);
        }
        return new Error("Unknown error: " + throwable.toString(), 0);
    }

    private Error toError(BleScanException bleScanException) {
        final int reason = bleScanException.getReason();
        switch (reason) {
            case BleScanException.BLUETOOTH_CANNOT_START:
                return new Error("Bluetooth cannot start", 103);
            case BleScanException.BLUETOOTH_DISABLED:
                return new Error("Bluetooth is powered off", 102);
            case BleScanException.BLUETOOTH_NOT_AVAILABLE:
                return new Error("Bluetooth is not supported", 100);
            case BleScanException.LOCATION_PERMISSION_MISSING:
                return new Error("Bluetooth location permission is missing", 110);
            case BleScanException.LOCATION_SERVICES_DISABLED:
                return new Error("Bluetooth location services are disabled", 111);
            default:
                return new Error("Unknown scan error: " + bleScanException.toString(), 800);
        }
    }
}