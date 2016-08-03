package com.polidea.reactnativeble.converter;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.polidea.rxandroidble.RxBleScanResult;

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
        result.putInt(Metadata.RSSI, rxBleScanResult.getRssi());
        return result;
    }
}
