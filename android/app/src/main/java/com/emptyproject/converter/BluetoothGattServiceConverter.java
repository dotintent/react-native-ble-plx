package com.emptyproject.converter;

import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattService;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import java.util.List;

/**
 * Created by Konrad on 31/05/16.
 */
public class BluetoothGattServiceConverter implements Converter<BluetoothGattService> {

    private interface Metadata {

        String UUID = "UUID";
        String CHARACTERISTICS = "CHARACTERISTICS";
    }

    private final BluetoothGattCharacteristicConverter bluetoothGattCharacteristicConverter;

    public BluetoothGattServiceConverter() {

        bluetoothGattCharacteristicConverter = new BluetoothGattCharacteristicConverter();
    }

    @Override
    public WritableMap convert(BluetoothGattService bluetoothGattService) {
        WritableMap result = Arguments.createMap();
        result.putString(Metadata.UUID, bluetoothGattService.getUuid().toString());
        final List<BluetoothGattCharacteristic> bluetoothGattCharacteristics = bluetoothGattService.getCharacteristics();
        WritableArray characteristics = Arguments.createArray();
        for (BluetoothGattCharacteristic bluetoothGattCharacteristic : bluetoothGattCharacteristics) {
            characteristics.pushMap(bluetoothGattCharacteristicConverter.convert(bluetoothGattCharacteristic));
        }
        result.putArray(Metadata.CHARACTERISTICS, characteristics);
        return result;
    }
}
