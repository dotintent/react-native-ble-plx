package com.polidea.reactnativeble.wrapper;

import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;
import android.support.annotation.NonNull;
import android.support.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.polidea.reactnativeble.utils.Base64Converter;
import com.polidea.reactnativeble.utils.ByteUtils;
import com.polidea.reactnativeble.utils.IdGenerator;
import com.polidea.reactnativeble.utils.IdGeneratorKey;
import com.polidea.reactnativeble.utils.UUIDConverter;
import com.polidea.rxandroidble.internal.RxBleLog;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class Characteristic {

    public static final UUID CLIENT_CHARACTERISTIC_CONFIG_UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb");

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
        String IS_INDICATABLE = "isIndicatable";
        String VALUE = "value";
    }

    private Service service;
    private BluetoothGattCharacteristic characteristic;
    private int id;

    public Characteristic(@NonNull Service service, @NonNull BluetoothGattCharacteristic characteristic) {
        this.service = service;
        this.characteristic = characteristic;
        this.id = IdGenerator.getIdForKey(new IdGeneratorKey(service.getDeviceId(), characteristic.getUuid(), characteristic.getInstanceId()));
    }

    public String getDeviceId() {
        return service.getDeviceId();
    }

    public int getServiceId() {
        return service.getId();
    }

    public String getServiceUUID() {
        return service.getUUID();
    }

    public int getInstanceId() {
        return this.characteristic.getInstanceId();
    }

    public int getId() {
        return this.id;
    }

    public String getUUID() {
        return UUIDConverter.fromUUID(characteristic.getUuid());
    }

    public Service getService() {
        return service;
    }

    public BluetoothGattCharacteristic getNativeCharacteristic() {
        return characteristic;
    }

    public List<Descriptor> getDescriptors() {
        ArrayList<Descriptor> descriptors = new ArrayList<>(characteristic.getDescriptors().size());
        for (BluetoothGattDescriptor gattDescriptor : characteristic.getDescriptors()) {
            descriptors.add(new Descriptor(this, gattDescriptor));
        }
        return descriptors;
    }

    public WritableMap toJSObject(byte[] value) {
        WritableMap js = Arguments.createMap();

        js.putInt(Metadata.ID, id);
        js.putString(Metadata.UUID, getUUID());
        js.putInt(Metadata.SERVICE_ID, service.getId());
        js.putString(Metadata.SERVICE_UUID, service.getUUID());
        js.putString(Metadata.DEVICE_ID, service.getDeviceId());

        js.putBoolean(Metadata.IS_READABLE, (characteristic.getProperties() & BluetoothGattCharacteristic.PROPERTY_READ) != 0);
        js.putBoolean(Metadata.IS_WRITABLE_WITH_RESPONSE, (characteristic.getProperties() & BluetoothGattCharacteristic.PROPERTY_WRITE) != 0);
        js.putBoolean(Metadata.IS_WRITABLE_WITHOUT_RESPONSE, (characteristic.getProperties() & BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE) != 0);
        js.putBoolean(Metadata.IS_NOTIFIABLE, (characteristic.getProperties() & BluetoothGattCharacteristic.PROPERTY_NOTIFY) != 0);
        js.putBoolean(Metadata.IS_INDICATABLE, (characteristic.getProperties() & BluetoothGattCharacteristic.PROPERTY_INDICATE) != 0);

        BluetoothGattDescriptor descriptor = characteristic.getDescriptor(CLIENT_CHARACTERISTIC_CONFIG_UUID);
        boolean isNotifying = false;
        if (descriptor != null) {
            byte[] descriptorValue = descriptor.getValue();
            if (descriptorValue != null) {
                isNotifying = (descriptorValue[0] & 0x01) != 0;
            }
        }
        js.putBoolean(Metadata.IS_NOTIFYING, isNotifying);

        if (value == null) {
            value = characteristic.getValue();
        }
        js.putString(Metadata.VALUE, value != null ? Base64Converter.encode(value) : null);
        return js;
    }

    public void logValue(String message, byte[] value) {
        if (value == null) {
            value = characteristic.getValue();
        }
        String hexValue = value != null ? ByteUtils.bytesToHex(value) : "(null)";
        RxBleLog.v(message +
                " Characteristic(uuid: " + characteristic.getUuid().toString() +
                ", id: " + id +
                ", value: " + hexValue + ")");
    }

    @Nullable
    public Descriptor getDescriptorByUUID(@NonNull UUID uuid) {
        BluetoothGattDescriptor descriptor = this.characteristic.getDescriptor(uuid);
        if (descriptor == null) return null;
        return new Descriptor(this, descriptor);
    }
}
