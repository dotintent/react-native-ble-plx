package org.konradkrakowiak.blereactnative.converter;


import android.util.Base64;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.polidea.rxandroidble.RxBleScanResult;

import java.util.UUID;

public class RxBleScanResultConverter implements Converter<RxBleScanResult> {

    interface Metadata {
        String UUID = "uuid";
        String NAME = "name";
        String RSSI = "rssi";
    }

    private final RxBleDeviceConverter bleDeviceConverter;

    RxBleScanResultConverter(RxBleDeviceConverter bleDeviceConverter) {
        this.bleDeviceConverter = bleDeviceConverter;
    }

    @Override
    public WritableMap convert(RxBleScanResult rxBleScanResult) {
        WritableMap result = Arguments.createMap();
        result.putString(Metadata.UUID, rxBleScanResult.getBleDevice().getMacAddress());
        result.putString(Metadata.NAME, rxBleScanResult.getBleDevice().getName());
        result.putString(Metadata.RSSI, String.valueOf(rxBleScanResult.getRssi()));
        return result;
    }
}
