package com.bleplx.adapter.utils;


import androidx.annotation.IntDef;
import androidx.annotation.StringDef;

import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.util.UUID;

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

  @IntDef({
    ConnectionPriority.BALANCED,
    ConnectionPriority.HIGH,
    ConnectionPriority.LOW_POWER}
  )
  @Retention(RetentionPolicy.SOURCE)
  @interface ConnectionPriority {

    int BALANCED = 0;
    int HIGH = 1;
    int LOW_POWER = 2;
  }

  int MINIMUM_MTU = 23;
  UUID CLIENT_CHARACTERISTIC_CONFIG_UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb");
}
