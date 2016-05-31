package com.emptyproject.converter;

import android.bluetooth.BluetoothGattService;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.polidea.rxandroidble.RxBleDeviceServices;
import java.util.List;

/**
 * Created by Konrad on 31/05/16.
 */
public class RxBleDeviceServicesConverter implements Converter<RxBleDeviceServices> {

    private interface Metadata {
        String SERVICES = "SERVICES";
    }
    private final BluetoothGattServiceConverter bluetoothGattServiceConverter;

    public  RxBleDeviceServicesConverter(){
        bluetoothGattServiceConverter = new BluetoothGattServiceConverter();
    }
    @Override
    public WritableMap convert(RxBleDeviceServices rxBleDeviceServices) {
        WritableMap result = Arguments.createMap();
        final List<BluetoothGattService> bluetoothGattServices = rxBleDeviceServices.getBluetoothGattServices();
        WritableArray services = Arguments.createArray();
        for(BluetoothGattService bluetoothGattService : bluetoothGattServices){
            services.pushMap(bluetoothGattServiceConverter.convert(bluetoothGattService));
        }
        result.putArray(Metadata.SERVICES, services);
        return result;
    }
}
