package org.konradkrakowiak.blereactnative.converter;


import android.util.Base64;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.polidea.rxandroidble.RxBleScanResult;

public class RxBleScanResultConverter implements Converter<RxBleScanResult> {

    interface Metadata {

        String RSSI = "RSSI";
        String SCAN_RECORD = "SCAN_RECORD";
        String BLE_DEVICE = "BLE_DEVICE";
    }

    private final RxBleDeviceConverter bleDeviceConverter;

    RxBleScanResultConverter(RxBleDeviceConverter bleDeviceConverter) {
        this.bleDeviceConverter = bleDeviceConverter;
    }

    @Override
    public WritableMap convert(RxBleScanResult rxBleScanResult) {
        WritableMap result = Arguments.createMap();
        result.putInt(Metadata.RSSI, rxBleScanResult.getRssi());
        final byte[] scanRecord = rxBleScanResult.getScanRecord();
        result.putString(Metadata.SCAN_RECORD, Base64.encodeToString(scanRecord, Base64.DEFAULT));
        result.putMap(Metadata.BLE_DEVICE, bleDeviceConverter.convert(rxBleScanResult.getBleDevice()));
        return result;
    }
}
