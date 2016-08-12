package com.polidea.reactnativeble.converter;

import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;
import android.util.Base64;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;

import java.util.UUID;

public class BluetoothGattCharacteristicConverter extends JSObjectConverter<BluetoothGattCharacteristic> {

    static final UUID CLIENT_CHARACTERISTIC_CONFIG_UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb");

    private interface Metadata {
        String UUID = "uuid";
        String IS_READABLE = "isReadable";
        String IS_WRITABLE_WITH_RESPONSE = "isWritableWithResponse";
        String IS_WRITABLE_WITHOUT_RESPONSE = "isWritableWithoutResponse";
        String IS_NOTIFIABLE = "isNotifiable";
        String IS_NOTIFYING = "isNotifying";
        String IS_INDICTABLE = "isIndictable";
        String VALUE = "value";
    }

    @Override
    public WritableMap toJSObject(BluetoothGattCharacteristic value) {
        WritableMap js = Arguments.createMap();
        js.putString(Metadata.UUID, value.getUuid().toString());
        js.putBoolean(Metadata.IS_READABLE, (value.getProperties() & BluetoothGattCharacteristic.PROPERTY_READ) != 0);
        js.putBoolean(Metadata.IS_WRITABLE_WITH_RESPONSE, (value.getProperties() & BluetoothGattCharacteristic.PROPERTY_WRITE) != 0);
        js.putBoolean(Metadata.IS_WRITABLE_WITHOUT_RESPONSE, (value.getProperties() & BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE) != 0);
        js.putBoolean(Metadata.IS_NOTIFIABLE, (value.getProperties() & BluetoothGattCharacteristic.PROPERTY_NOTIFY) != 0);
        js.putBoolean(Metadata.IS_INDICTABLE, (value.getProperties() & BluetoothGattCharacteristic.PROPERTY_INDICATE) != 0);

        BluetoothGattDescriptor descriptor = value.getDescriptor(CLIENT_CHARACTERISTIC_CONFIG_UUID);
        boolean isNotifying = false;
        if (descriptor != null) {
            byte[] descriptorValue = descriptor.getValue();
            if (descriptorValue != null) {
                isNotifying = (descriptorValue[0] & 0x01) != 0;
            }
        }
        js.putBoolean(Metadata.IS_NOTIFYING, isNotifying);
        js.putString(Metadata.VALUE, value.getValue() != null ? Base64.encodeToString(value.getValue(), Base64.DEFAULT) : null);
        return js;
    }
}
