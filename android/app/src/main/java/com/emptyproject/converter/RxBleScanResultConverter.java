package com.emptyproject.converter;


import android.util.Base64;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.polidea.rxandroidble.RxBleScanResult;

public class RxBleScanResultConverter implements Converter<RxBleScanResult> {

    private final RxBleDeviceConverter bleDeviceConverter;

    public RxBleScanResultConverter() {
        bleDeviceConverter = new RxBleDeviceConverter();
    }

    @Override
    public WritableMap convert(RxBleScanResult rxBleScanResult) {
        WritableMap result = Arguments.createMap();
        result.putInt("RSSI", rxBleScanResult.getRssi());
        final byte[] scanRecord = rxBleScanResult.getScanRecord();
        result.putString("SCAN_RECORD", Base64.encodeToString(scanRecord, Base64.DEFAULT));
        result.putMap("BLE_DEVICE", bleDeviceConverter.convert(rxBleScanResult.getBleDevice()));
        return result;
    }
}
