package com.polidea.reactnativeble.utils;


import android.support.annotation.StringDef;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;

public interface Constants {

    @StringDef({
            BluetoothState.UNKNOWN,
            BluetoothState.RESETTING,
            BluetoothState.UNSUPPORTED,
            BluetoothState.UNAUTHORIZED,
            BluetoothState.POWERED_OFF,
            BluetoothState.POWERED_ON}
    )
    @Retention(RetentionPolicy.SOURCE)
    @interface BluetoothState {

        String UNKNOWN = "Unknown";
        String RESETTING = "Resetting";
        String UNSUPPORTED = "Unsupported";
        String UNAUTHORIZED = "Unauthorized";
        String POWERED_OFF = "PoweredOff";
        String POWERED_ON = "PoweredOn";
    }

    @StringDef({
            BluetoothLogLevel.NONE,
            BluetoothLogLevel.VERBOSE,
            BluetoothLogLevel.DEBUG,
            BluetoothLogLevel.INFO,
            BluetoothLogLevel.WARNING,
            BluetoothLogLevel.ERROR}
    )
    @Retention(RetentionPolicy.SOURCE)
    @interface BluetoothLogLevel {

        String NONE = "None";
        String VERBOSE = "Verbose";
        String DEBUG = "Debug";
        String INFO = "Info";
        String WARNING = "Warning";
        String ERROR = "Error";
    }

    int MINIMUM_MTU = 23;
}
