package com.polidea.reactnativeble.utils;

import com.polidea.rxandroidble.internal.RxBleLog;

public class LogLevel {

    @RxBleLog.LogLevel
    public static int toLogLevel(String logLevel) {
        switch (logLevel) {
            case Constants.BluetoothLogLevel.VERBOSE:
                return RxBleLog.VERBOSE;
            case Constants.BluetoothLogLevel.DEBUG:
                return RxBleLog.DEBUG;
            case Constants.BluetoothLogLevel.INFO:
                return RxBleLog.INFO;
            case Constants.BluetoothLogLevel.WARNING:
                return RxBleLog.WARN;
            case Constants.BluetoothLogLevel.ERROR:
                return RxBleLog.ERROR;
            case Constants.BluetoothLogLevel.NONE:
                // fallthrough
            default:
                return RxBleLog.NONE;
        }
    }

    @Constants.BluetoothLogLevel
    public static String fromLogLevel(int logLevel) {
        switch (logLevel) {
            case RxBleLog.VERBOSE:
                return Constants.BluetoothLogLevel.VERBOSE;
            case RxBleLog.DEBUG:
                return Constants.BluetoothLogLevel.DEBUG;
            case RxBleLog.INFO:
                return Constants.BluetoothLogLevel.INFO;
            case RxBleLog.WARN:
                return Constants.BluetoothLogLevel.WARNING;
            case RxBleLog.ERROR:
                return Constants.BluetoothLogLevel.ERROR;
            case RxBleLog.NONE:
                // fallthrough
            default:
                return Constants.BluetoothLogLevel.NONE;
        }
    }
}
