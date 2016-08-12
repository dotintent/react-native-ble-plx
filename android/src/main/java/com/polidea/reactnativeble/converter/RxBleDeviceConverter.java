package com.polidea.reactnativeble.converter;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.polidea.rxandroidble.RxBleDevice;

public class RxBleDeviceConverter extends JSObjectConverter<RxBleDevice> {

    private interface Metadata {
        String UUID = "uuid";
        String NAME = "name";
        String RSSI = "rssi";
        String CONNECTABLE = "isConnectable";
    }

    @Override
    public WritableMap toJSObject(RxBleDevice value) {
        WritableMap result = Arguments.createMap();
        result.putString(Metadata.UUID, value.getMacAddress());
        result.putString(Metadata.NAME, value.getName());
        result.putNull(Metadata.RSSI);
        // TODO: Get if it's connectable?
        result.putNull(Metadata.CONNECTABLE);
        return result;
    }
}
