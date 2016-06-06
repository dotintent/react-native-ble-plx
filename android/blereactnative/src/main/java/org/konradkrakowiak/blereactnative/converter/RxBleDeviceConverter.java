package org.konradkrakowiak.blereactnative.converter;


import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.polidea.rxandroidble.RxBleDevice;

class RxBleDeviceConverter implements Converter<RxBleDevice> {

    private interface Metadata {

        String NAME = "NAME";
        String MAC_ADDRESS = "MAC_ADDRESS";
        String CONNECTION_STATE = "CONNECTION_STATE";
    }

   private final RxBleConnectionStateConverter rxBleConnectionStateConverter;

    RxBleDeviceConverter(RxBleConnectionStateConverter rxBleConnectionStateConverter) {
        this.rxBleConnectionStateConverter = rxBleConnectionStateConverter;
    }

    @Override
    public WritableMap convert(RxBleDevice bleDevice) {
        WritableMap result = Arguments.createMap();
        result.putString(Metadata.NAME, bleDevice.getName());
        result.putString(Metadata.MAC_ADDRESS, bleDevice.getMacAddress());
        result.putMap(Metadata.CONNECTION_STATE, rxBleConnectionStateConverter.convert(bleDevice.getConnectionState()));
        return result;
    }
}
