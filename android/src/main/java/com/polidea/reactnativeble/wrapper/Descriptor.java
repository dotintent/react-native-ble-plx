package com.polidea.reactnativeble.wrapper;

import android.bluetooth.BluetoothGattDescriptor;

import android.support.annotation.NonNull;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.polidea.reactnativeble.utils.Base64Converter;
import com.polidea.reactnativeble.utils.ByteUtils;
import com.polidea.reactnativeble.utils.IdGenerator;
import com.polidea.reactnativeble.utils.IdGeneratorKey;
import com.polidea.reactnativeble.utils.UUIDConverter;
import com.polidea.rxandroidble.internal.RxBleLog;

public class Descriptor {

    private interface Metadata {
        String ID = "id";
        String UUID = "uuid";
        String CHARACTERISTIC_UUID = "characteristicUUID";
        String CHARACTERISTIC_ID = "characteristicID";
        String SERVICE_ID = "serviceID";
        String SERVICE_UUID = "serviceUUID";
        String DEVICE_ID = "deviceID";
        String VALUE = "value";
    }

    private Characteristic characteristic;
    private BluetoothGattDescriptor descriptor;
    private int id;

    public Descriptor(@NonNull Characteristic gattCharacteristic, @NonNull BluetoothGattDescriptor gattDescriptor) {
        this.characteristic = gattCharacteristic;
        this.descriptor = gattDescriptor;
        this.id = IdGenerator.getIdForKey(new IdGeneratorKey(characteristic.getDeviceId(), descriptor.getUuid(), characteristic.getInstanceId()));
    }

    public int getId() {
        return id;
    }

    public String getDeviceId() {
        return characteristic.getDeviceId();
    }

    public Characteristic getCharacteristic() {
        return characteristic;
    }

    public BluetoothGattDescriptor getNativeDescriptor() {
        return descriptor;
    }

    public WritableMap toJSObject(byte[] value) {
        WritableMap js = Arguments.createMap();
        js.putInt(Metadata.ID, id);
        js.putString(Metadata.UUID, UUIDConverter.fromUUID(descriptor.getUuid()));
        js.putInt(Metadata.CHARACTERISTIC_ID, characteristic.getId());
        js.putString(Metadata.CHARACTERISTIC_UUID, characteristic.getUUID());
        js.putInt(Metadata.SERVICE_ID, characteristic.getServiceId());
        js.putString(Metadata.SERVICE_UUID, characteristic.getServiceUUID());
        js.putString(Metadata.DEVICE_ID, getDeviceId());

        if (value == null) {
            value = descriptor.getValue();
        }
        js.putString(Metadata.VALUE, value != null ? Base64Converter.encode(value) : null);
        return js;
    }

    public void logValue(String message, byte[] value) {
        if (value == null) {
            value = descriptor.getValue();
        }
        String hexValue = value != null ? ByteUtils.bytesToHex(value) : "(null)";
        RxBleLog.v(message +
                " Descriptor(uuid: " + descriptor.getUuid().toString() +
                ", id: " + id +
                ", value: " + hexValue + ")");
    }
}
