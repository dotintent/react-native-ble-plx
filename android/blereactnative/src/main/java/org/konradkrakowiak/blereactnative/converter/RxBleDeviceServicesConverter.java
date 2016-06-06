package org.konradkrakowiak.blereactnative.converter;

import android.bluetooth.BluetoothGattService;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.polidea.rxandroidble.RxBleDeviceServices;
import java.util.List;

public class RxBleDeviceServicesConverter implements Converter<RxBleDeviceServices> {

    private interface Metadata {

        String SERVICES = "SERVICES";
    }

    private final BluetoothGattServiceConverter bluetoothGattServiceConverter;

    RxBleDeviceServicesConverter(BluetoothGattServiceConverter bluetoothGattServiceConverter) {
        this.bluetoothGattServiceConverter = bluetoothGattServiceConverter;
    }

    @Override
    public WritableMap convert(RxBleDeviceServices rxBleDeviceServices) {
        WritableMap result = Arguments.createMap();
        final List<BluetoothGattService> bluetoothGattServices = rxBleDeviceServices.getBluetoothGattServices();
        WritableArray services = Arguments.createArray();
        for (BluetoothGattService bluetoothGattService : bluetoothGattServices) {
            services.pushMap(bluetoothGattServiceConverter.convert(bluetoothGattService));
        }
        result.putArray(Metadata.SERVICES, services);
        return result;
    }
}
