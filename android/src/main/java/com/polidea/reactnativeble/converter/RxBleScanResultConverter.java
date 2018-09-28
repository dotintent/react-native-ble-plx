package com.polidea.reactnativeble.converter;

import android.support.annotation.NonNull;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.polidea.reactnativeble.advertisement.AdvertisementData;
import com.polidea.reactnativeble.utils.Base64Converter;
import com.polidea.reactnativeble.utils.Constants;
import com.polidea.reactnativeble.utils.UUIDConverter;
import com.polidea.rxandroidble.scan.ScanResult;

import java.util.Map;
import java.util.UUID;

public class RxBleScanResultConverter extends JSObjectConverter<ScanResult> {

    interface Metadata {
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
    public WritableMap toJSObject(@NonNull ScanResult value) {
        WritableMap result = Arguments.createMap();
        result.putString(Metadata.ID, value.getBleDevice().getMacAddress());
        result.putString(Metadata.NAME, value.getBleDevice().getName());
        result.putInt(Metadata.RSSI, value.getRssi());
        result.putInt(Metadata.MTU, Constants.MINIMUM_MTU);

        AdvertisementData advData = AdvertisementData.parseScanResponseData(value.getScanRecord().getBytes());
        result.putString(Metadata.MANUFACTURER_DATA,
                advData.getManufacturerData() != null ?
                        Base64Converter.encode(advData.getManufacturerData()) : null);

        if (advData.getServiceData() != null) {
            WritableMap serviceData = Arguments.createMap();
            for (Map.Entry<UUID, byte[]> entry : advData.getServiceData().entrySet()) {
                serviceData.putString(UUIDConverter.fromUUID(entry.getKey()),
                        Base64Converter.encode(entry.getValue()));
            }
            result.putMap(Metadata.SERVICE_DATA, serviceData);
        } else {
            result.putNull(Metadata.SERVICE_DATA);
        }

        if (advData.getServiceUUIDs() != null) {
            WritableArray serviceUUIDs = Arguments.createArray();
            for (UUID serviceUUID : advData.getServiceUUIDs()) {
                serviceUUIDs.pushString(UUIDConverter.fromUUID(serviceUUID));
            }
            result.putArray(Metadata.SERVICE_UUIDS, serviceUUIDs);
        } else {
            result.putNull(Metadata.SERVICE_UUIDS);
        }

        if (advData.getLocalName() != null) {
            result.putString(Metadata.LOCAL_NAME, advData.getLocalName());
        } else {
            result.putNull(Metadata.LOCAL_NAME);
        }

        if (advData.getTxPowerLevel() != null) {
            result.putInt(Metadata.TX_POWER_LEVEL, advData.getTxPowerLevel());
        } else {
            result.putNull(Metadata.TX_POWER_LEVEL);
        }

        if (advData.getSolicitedServiceUUIDs() != null) {
            WritableArray solicitedServiceUUIDs = Arguments.createArray();
            for (UUID serviceUUID : advData.getSolicitedServiceUUIDs()) {
                solicitedServiceUUIDs.pushString(UUIDConverter.fromUUID(serviceUUID));
            }
            result.putArray(Metadata.SOLICITED_SERVICE_UUIDS, solicitedServiceUUIDs);
        } else {
            result.putNull(Metadata.SOLICITED_SERVICE_UUIDS);
        }

        // Attributes which are not accessible on Android
        result.putNull(Metadata.IS_CONNECTABLE);
        result.putNull(Metadata.OVERFLOW_SERVICE_UUIDS);

        return result;
    }
}
