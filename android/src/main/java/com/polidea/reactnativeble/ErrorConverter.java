package com.polidea.reactnativeble;

import com.polidea.rxandroidble.exceptions.BleAlreadyConnectedException;
import com.polidea.rxandroidble.exceptions.BleCannotSetCharacteristicNotificationException;
import com.polidea.rxandroidble.exceptions.BleCharacteristicNotFoundException;
import com.polidea.rxandroidble.exceptions.BleGattCannotStartException;
import com.polidea.rxandroidble.exceptions.BleGattException;
import com.polidea.rxandroidble.exceptions.BleScanException;

class ErrorConverter {

    String convert(Throwable throwable) {
        if (throwable instanceof BleScanException) {
            return convert((BleScanException) throwable);
        }
        if (throwable instanceof BleAlreadyConnectedException) {
            return ErrorKey.BLE_ALREADY_CONNECTED_EXCEPTION;
        }
        if (throwable instanceof BleCharacteristicNotFoundException) {
            return ErrorKey.BLE_CHARACTERISTIC_NOT_FOUND_EXCEPTION;
        }
        if (throwable instanceof BleGattCannotStartException) {
            return ErrorKey.BLE_GATT_CANNOT_START_EXCEPTION;
        }
        if (throwable instanceof BleGattException) {
            return ErrorKey.BLE_GATT_EXCEPTION;
        }
        if (throwable instanceof BleCannotSetCharacteristicNotificationException) {
            return ErrorKey.BLE_CANNOT_SET_CHARACTERISTIC_NOTIFICATION_EXCEPTION;
        }
        return ErrorKey.UNKNOWN_ERROR;
    }

    private String convert(BleScanException bleScanException) {
        final int reason = bleScanException.getReason();
        switch (reason) {
            case BleScanException.BLUETOOTH_CANNOT_START:
                return ErrorKey.BLUETOOTH_CANNOT_START;
            case BleScanException.BLUETOOTH_DISABLED:
                return ErrorKey.BLUETOOTH_DISABLED;
            case BleScanException.BLUETOOTH_NOT_AVAILABLE:
                return ErrorKey.BLUETOOTH_NOT_AVAILABLE;
            case BleScanException.LOCATION_PERMISSION_MISSING:
                return ErrorKey.LOCATION_PERMISSION_MISSING;
            case BleScanException.LOCATION_SERVICES_DISABLED:
                return ErrorKey.LOCATION_SERVICES_DISABLED;
            default:
                throw bleScanException;
        }
    }
}