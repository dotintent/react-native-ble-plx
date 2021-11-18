package com.polidea.reactnativeble.converter;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.polidea.multiplatformbleadapter.Device;

public class DeviceToJsObjectConverter extends JSObjectConverter<Device> {

    private interface Metadata {
        String ID = "id";
        String NAME = "name";
        String RSSI = "rssi";
        String MTU = "mtu";

        String MANUFACTURER_DATA = "manufacturerData";
        String SERVICE_DATA = "serviceData";
        String SERVICE_UUIDS = "serviceUUIDs";
        String LOCAL_NAME = "localName";
        String TX_POWER_LEVEL = "txPowerLevel";
        String SOLICITED_SERVICE_UUIDS = "solicitedServiceUUIDs";
        String IS_CONNECTABLE = "isConnectable";
        String OVERFLOW_SERVICE_UUIDS = "overflowServiceUUIDs";
    }


    @Override
    public WritableMap toJSObject(Device value) {
        WritableMap result = Arguments.createMap();
        result.putString(Metadata.ID, value.getId());
        result.putString(Metadata.NAME, value.getName());
        if (value.getRssi() != null) {
            result.putInt(Metadata.RSSI, value.getRssi());
        } else {
            result.putNull(Metadata.RSSI);
        }
        if (value.getMtu() != null) {
            result.putInt(Metadata.MTU, value.getMtu());
        } else {
            result.putNull(Metadata.MTU);
        }

        // Advertisement data is not set
        result.putNull(Metadata.MANUFACTURER_DATA);
        result.putNull(Metadata.SERVICE_DATA);
        result.putNull(Metadata.SERVICE_UUIDS);
        result.putNull(Metadata.LOCAL_NAME);
        result.putNull(Metadata.TX_POWER_LEVEL);
        result.putNull(Metadata.SOLICITED_SERVICE_UUIDS);
        result.putNull(Metadata.IS_CONNECTABLE);
        result.putNull(Metadata.OVERFLOW_SERVICE_UUIDS);

        return result;
    }
}
