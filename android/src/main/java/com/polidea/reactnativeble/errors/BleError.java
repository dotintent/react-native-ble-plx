package com.polidea.reactnativeble.errors;

import android.support.annotation.NonNull;

import java.util.ArrayList;
import java.util.List;

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
        return new Error("Characteristic " + uuid + " not found", 503);
    }

    static public Error serviceNotFound(String uuid) {
        return new Error("Service " + uuid + " not found", 504);
    }

    static public Error invalidWriteDataForCharacteristic(String data, String uuid) {
        return new Error("Invalid base64 write data: " + data + " for characteristic " + uuid, 505);
    }
}
