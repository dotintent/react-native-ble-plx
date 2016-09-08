package com.polidea.reactnativeble.converter;

import android.bluetooth.BluetoothGattService;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.polidea.reactnativeble.utils.UUIDConverter;

public class BluetoothGattServiceConverter extends JSObjectConverter<BluetoothGattService> {


    private interface Metadata {
        String UUID = "uuid";
        String IS_PRIMARY = "isPrimary";
    }

    @Override
    public WritableMap toJSObject(BluetoothGattService value) {
        WritableMap result = Arguments.createMap();
        result.putString(Metadata.UUID, UUIDConverter.fromUUID(value.getUuid()));
        result.putBoolean(Metadata.IS_PRIMARY, value.getType() == BluetoothGattService.SERVICE_TYPE_PRIMARY);
        return result;
    }
}
