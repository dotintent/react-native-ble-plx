package com.polidea.reactnativeble.wrapper;

import android.support.annotation.NonNull;
import android.support.annotation.Nullable;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.polidea.reactnativeble.utils.Constants;
import com.polidea.rxandroidble.RxBleConnection;
import com.polidea.rxandroidble.RxBleDevice;

import java.util.List;
import java.util.UUID;

public class Device  {

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

    private RxBleDevice device;
    @Nullable
    private RxBleConnection connection;
    @Nullable
    private List<Service> services;

    public Device(@NonNull RxBleDevice device, @Nullable RxBleConnection connection) {
        this.device = device;
        this.connection = connection;
    }

    public void setServices(@NonNull List<Service> services) {
        this.services = services;
    }

    @Nullable
    public List<Service> getServices() {
        return services;
    }

    @Nullable
    public RxBleConnection getConnection() {
        return connection;
    }

    public String getDeviceId() {
        return device.getMacAddress();
    }

    @Nullable
    public Service getServiceByUUID(@NonNull UUID uuid) {
        if (services == null) {
            return null;
        }

        for(Service service : services) {
            if (uuid.equals(service.getNativeService().getUuid()))
                return service;
        }
        return null;
    }

    public WritableMap toJSObject(@Nullable Integer rssi) {
        WritableMap result = Arguments.createMap();
        result.putString(Metadata.ID, device.getMacAddress());
        result.putString(Metadata.NAME, device.getName());
        if (rssi != null) {
            result.putInt(Metadata.RSSI, rssi);
        } else {
            result.putNull(Metadata.RSSI);
        }
        if(connection != null) {
            result.putInt(Metadata.MTU, connection.getMtu());
        } else {
            result.putInt(Metadata.MTU, Constants.MINIMUM_MTU);
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
