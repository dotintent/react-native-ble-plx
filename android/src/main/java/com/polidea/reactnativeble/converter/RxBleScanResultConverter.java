package com.polidea.reactnativeble.converter;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.polidea.rxandroidble.RxBleScanResult;

public class RxBleScanResultConverter extends JSObjectConverter<RxBleScanResult> {

    interface Metadata {
        String UUID = "uuid";
        String NAME = "name";
        String RSSI = "rssi";
        String CONNECTABLE = "isConnectable";
    }

    @Override
    public WritableMap toJSObject(RxBleScanResult value) {
        WritableMap result = Arguments.createMap();
        result.putString(Metadata.UUID, value.getBleDevice().getMacAddress());
        result.putString(Metadata.NAME, value.getBleDevice().getName());
        result.putInt(Metadata.RSSI, value.getRssi());
        // TODO: Implement
        result.putNull(Metadata.CONNECTABLE);
        return result;
    }
}
