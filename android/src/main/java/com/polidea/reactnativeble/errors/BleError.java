package com.polidea.reactnativeble.errors;

import android.support.annotation.NonNull;

public class BleError {
    public static Error unknown() {
        return new Error("Unknown error", 0);
    }

    public static Error cancelled() {
        return new Error("Cancelled", 1);
    }

    static public Error invalidUUIDs(@NonNull  String... uuids) {
        String uuidsString = "";
        for (String uuid: uuids) {
            uuidsString += uuid + ", ";
        }
        return new Error("Invalid UUIDs were passed: " + uuidsString, 500);
    }

    static public Error deviceNotFound(String uuid) {
        return new Error("Device " + uuid + " not found", 501);
    }

    static public Error deviceNotConnected(String uuid) {
        return new Error("Device " + uuid + " not connected", 502);
    }

    static public Error characteristicNotFound(String uuid) {
        return new Error("Characteristic with uuid " + uuid + " not found", 503);
    }

    static public Error characteristicNotFound(int id) {
        return new Error("Characteristic with id " + id + " not found", 503);
    }

    static public Error serviceNotFound(String uuid) {
        return new Error("Service with uuid " + uuid + " not found", 504);
    }

    static public Error serviceNotFound(int id) {
        return new Error("Service with id " + id + " not found", 504);
    }

    static public Error invalidWriteDataForCharacteristic(String data, String uuid) {
        return new Error("Invalid base64 write data: " + data + " for characteristic " + uuid, 505);
    }

    static public Error cannotMonitorCharacteristic(String uuid) {
        return new Error("Characteristic " + uuid + " cannot be monitored as it doesn't support notifications or indications", 506);
    }

    static public Error deviceServicesNotDiscovered(String deviceUuid) {
        return new Error("Services for device " + deviceUuid + " not discovered. First you need to call discoverAllServicesAndCharacteristicsForDevice", 507);
    }
}
