package com.bleplx.service;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.util.Base64;

import java.util.ArrayList;
import java.util.List;

/**
 * Manages background BLE data collection with persistence.
 * Data is stored in SharedPreferences and survives app restarts.
 *
 * Thread-safe: All public methods are synchronized.
 */
public class BleBackgroundDataManager {
    private static final String TAG = "BlePlx";
    private static final String PREFS_NAME = "BlePlxBackgroundData";
    private static final String KEY_PENDING_DATA = "pendingData";
    private static final int MAX_PENDING_ITEMS = 1000;

    private final SharedPreferences prefs;
    private final List<DataEntry> pendingData = new ArrayList<>();

    /**
     * Data entry class for storing BLE characteristic data.
     * Using a regular class instead of Java record for API compatibility (API < 34).
     */
    public static class DataEntry {
        private final String deviceId;
        private final String serviceUUID;
        private final String characteristicUUID;
        private final byte[] value;
        private final long timestamp;

        public DataEntry(String deviceId, String serviceUUID, String characteristicUUID, byte[] value, long timestamp) {
            this.deviceId = deviceId;
            this.serviceUUID = serviceUUID;
            this.characteristicUUID = characteristicUUID;
            this.value = value;
            this.timestamp = timestamp;
        }

        public String getDeviceId() { return deviceId; }
        public String getServiceUUID() { return serviceUUID; }
        public String getCharacteristicUUID() { return characteristicUUID; }
        public byte[] getValue() { return value; }
        public long getTimestamp() { return timestamp; }
    }

    public BleBackgroundDataManager(Context context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        loadPendingData();
    }

    /**
     * Adds new data entry. If max capacity is reached, oldest entry is removed.
     */
    public synchronized void addData(String deviceId, String serviceUUID, String characteristicUUID, byte[] value) {
        if (pendingData.size() >= MAX_PENDING_ITEMS) {
            pendingData.remove(0);
            Log.d(TAG, "Max pending items reached, removed oldest entry");
        }
        pendingData.add(new DataEntry(deviceId, serviceUUID, characteristicUUID, value.clone(), System.currentTimeMillis()));
        persistData();
    }

    /**
     * Returns all pending data as a React Native WritableArray.
     */
    public synchronized WritableArray getPendingDataAsArray() {
        WritableArray arr = Arguments.createArray();
        for (DataEntry entry : pendingData) {
            WritableMap map = Arguments.createMap();
            map.putString("deviceId", entry.getDeviceId());
            map.putString("serviceUUID", entry.getServiceUUID());
            map.putString("characteristicUUID", entry.getCharacteristicUUID());
            map.putString("value", Base64.encodeToString(entry.getValue(), Base64.NO_WRAP));
            map.putDouble("timestamp", entry.getTimestamp());
            arr.pushMap(map);
        }
        return arr;
    }

    /**
     * Returns the number of pending data entries.
     */
    public synchronized int getPendingCount() {
        return pendingData.size();
    }

    /**
     * Clears all pending data from memory and storage.
     */
    public synchronized void clearPendingData() {
        pendingData.clear();
        prefs.edit().remove(KEY_PENDING_DATA).apply();
        Log.d(TAG, "Cleared all pending background data");
    }

    /**
     * Persists current data to SharedPreferences.
     * Called automatically after addData().
     */
    private void persistData() {
        try {
            JSONArray arr = new JSONArray();
            for (DataEntry entry : pendingData) {
                JSONObject obj = new JSONObject();
                obj.put("deviceId", entry.getDeviceId());
                obj.put("serviceUUID", entry.getServiceUUID());
                obj.put("characteristicUUID", entry.getCharacteristicUUID());
                obj.put("value", Base64.encodeToString(entry.getValue(), Base64.NO_WRAP));
                obj.put("timestamp", entry.getTimestamp());
                arr.put(obj);
            }
            prefs.edit().putString(KEY_PENDING_DATA, arr.toString()).apply();
        } catch (JSONException e) {
            Log.e(TAG, "Failed to persist background data", e);
        }
    }

    /**
     * Loads pending data from SharedPreferences on initialization.
     */
    private void loadPendingData() {
        try {
            String json = prefs.getString(KEY_PENDING_DATA, "[]");
            if (json == null || json.isEmpty()) {
                json = "[]";
            }
            JSONArray arr = new JSONArray(json);
            pendingData.clear();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                String deviceId = obj.optString("deviceId", "");
                String serviceUUID = obj.optString("serviceUUID", "");
                String characteristicUUID = obj.optString("characteristicUUID", "");
                String valueBase64 = obj.optString("value", "");
                long timestamp = obj.optLong("timestamp", 0);

                // Skip invalid entries
                if (deviceId.isEmpty() || valueBase64.isEmpty()) {
                    Log.w(TAG, "Skipping invalid data entry at index " + i);
                    continue;
                }

                try {
                    byte[] value = Base64.decode(valueBase64, Base64.NO_WRAP);
                    pendingData.add(new DataEntry(deviceId, serviceUUID, characteristicUUID, value, timestamp));
                } catch (IllegalArgumentException e) {
                    Log.e(TAG, "Failed to decode Base64 value at index " + i, e);
                }
            }
            Log.d(TAG, "Loaded " + pendingData.size() + " pending data entries");
        } catch (JSONException e) {
            Log.e(TAG, "Failed to load pending data, clearing corrupted data", e);
            pendingData.clear();
            prefs.edit().remove(KEY_PENDING_DATA).apply();
        }
    }
}
