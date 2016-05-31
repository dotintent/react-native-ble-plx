package com.emptyproject.converter;

import android.bluetooth.BluetoothGattService;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;

/**
 * Created by Konrad on 31/05/16.
 */
public class BluetoothGattServiceConverter implements Converter<BluetoothGattService> {

    private interface Metadata {

        String UUID = "UUID";
    }

    @Override
    public WritableMap convert(BluetoothGattService bluetoothGattService) {
        WritableMap result = Arguments.createMap();
        result.putString(Metadata.UUID, bluetoothGattService.getUuid().toString());
        return result;
    }
}
