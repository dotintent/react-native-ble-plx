package com.polidea.reactnativeble.wrapper;

import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattService;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.polidea.reactnativeble.utils.UUIDConverter;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class Service extends JSObject {

    private interface Metadata {
        String ID = "id";
        String UUID = "uuid";
        String DEVICE_ID = "deviceID";
        String IS_PRIMARY = "isPrimary";
    }

    private Device device;

    private BluetoothGattService service;

    public Service(Device device, BluetoothGattService service) {
        this.device = device;
        this.service = service;
    }

    public Device getDevice() {
        return device;
    }

    public BluetoothGattService getNativeService() {
        return service;
    }

    public Characteristic getCharacteristicByUUID(UUID uuid) {
        BluetoothGattCharacteristic characteristic = service.getCharacteristic(uuid);
        if (characteristic == null) return null;
        return new Characteristic(this, characteristic);
    }

    public List<Characteristic> getCharacteristics() {
        ArrayList<Characteristic> characteristics = new ArrayList<>(service.getCharacteristics().size());
        for (BluetoothGattCharacteristic gattCharacteristic : service.getCharacteristics()) {
            characteristics.add(new Characteristic(this, gattCharacteristic));
        }
        return characteristics;
    }

    @Override
    public WritableMap toJSObject() {
        WritableMap result = Arguments.createMap();
        result.putInt(Metadata.ID, service.getInstanceId());
        result.putString(Metadata.UUID, UUIDConverter.fromUUID(service.getUuid()));
        result.putString(Metadata.DEVICE_ID, device.getNativeDevice().getMacAddress());
        result.putBoolean(Metadata.IS_PRIMARY, service.getType() == BluetoothGattService.SERVICE_TYPE_PRIMARY);
        return result;
    }
}
