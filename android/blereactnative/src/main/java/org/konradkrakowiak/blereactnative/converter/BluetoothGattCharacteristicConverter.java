package org.konradkrakowiak.blereactnative.converter;

import android.bluetooth.BluetoothGattCharacteristic;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;

class BluetoothGattCharacteristicConverter implements Converter<BluetoothGattCharacteristic> {

    private interface Metadata {

        String UUID = "UUID";
    }

    @Override
    public WritableMap convert(BluetoothGattCharacteristic bluetoothGattCharacteristic) {
        WritableMap result = Arguments.createMap();
        result.putString(Metadata.UUID, bluetoothGattCharacteristic.getUuid().toString());
        return result;
    }

}
