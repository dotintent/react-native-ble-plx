package com.polidea.reactnativeble.wrapper;

import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;
import android.util.Base64;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.polidea.reactnativeble.utils.UUIDConverter;

import java.util.UUID;

public class Characteristic extends JSObject {

    private static final UUID CLIENT_CHARACTERISTIC_CONFIG_UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb");

    private interface Metadata {
        String ID = "id";
        String UUID = "uuid";
        String SERVICE_ID = "serviceID";
        String SERVICE_UUID = "serviceUUID";
        String DEVICE_ID = "deviceID";
        String IS_READABLE = "isReadable";
        String IS_WRITABLE_WITH_RESPONSE = "isWritableWithResponse";
        String IS_WRITABLE_WITHOUT_RESPONSE = "isWritableWithoutResponse";
        String IS_NOTIFIABLE = "isNotifiable";
        String IS_NOTIFYING = "isNotifying";
        String IS_INDICTABLE = "isIndictable";
        String VALUE = "value";
    }

    private Service service;
    private BluetoothGattCharacteristic characteristic;

    public Characteristic(Service service, BluetoothGattCharacteristic characteristic) {
        this.service = service;
        this.characteristic = characteristic;
    }

    public Service getService() {
        return service;
    }

    public BluetoothGattCharacteristic getNativeCharacteristic() {
        return characteristic;
    }

    @Override
    public WritableMap toJSObject() {
        WritableMap js = Arguments.createMap();

        js.putInt(Metadata.ID, characteristic.getInstanceId());
        js.putString(Metadata.UUID, UUIDConverter.fromUUID(characteristic.getUuid()));
        js.putInt(Metadata.SERVICE_ID, service.getNativeService().getInstanceId());
        js.putString(Metadata.SERVICE_UUID, UUIDConverter.fromUUID(service.getNativeService().getUuid()));
        js.putString(Metadata.DEVICE_ID, service.getDevice().getNativeDevice().getMacAddress());

        js.putBoolean(Metadata.IS_READABLE, (characteristic.getProperties() & BluetoothGattCharacteristic.PROPERTY_READ) != 0);
        js.putBoolean(Metadata.IS_WRITABLE_WITH_RESPONSE, (characteristic.getProperties() & BluetoothGattCharacteristic.PROPERTY_WRITE) != 0);
        js.putBoolean(Metadata.IS_WRITABLE_WITHOUT_RESPONSE, (characteristic.getProperties() & BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE) != 0);
        js.putBoolean(Metadata.IS_NOTIFIABLE, (characteristic.getProperties() & BluetoothGattCharacteristic.PROPERTY_NOTIFY) != 0);
        js.putBoolean(Metadata.IS_INDICTABLE, (characteristic.getProperties() & BluetoothGattCharacteristic.PROPERTY_INDICATE) != 0);

        BluetoothGattDescriptor descriptor = characteristic.getDescriptor(CLIENT_CHARACTERISTIC_CONFIG_UUID);
        boolean isNotifying = false;
        if (descriptor != null) {
            byte[] descriptorValue = descriptor.getValue();
            if (descriptorValue != null) {
                isNotifying = (descriptorValue[0] & 0x01) != 0;
            }
        }
        js.putBoolean(Metadata.IS_NOTIFYING, isNotifying);
        js.putString(Metadata.VALUE, characteristic.getValue() != null ? Base64.encodeToString(characteristic.getValue(), Base64.DEFAULT) : null);

        return js;
    }
}
