package com.bleplx.service;

import android.content.Context;
import android.content.SharedPreferences;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

public class BleBackgroundDataManager {
    private static final String PREFS_NAME = "BlePlxBackgroundData";
    private static final String KEY_PENDING_DATA = "pendingData";
    private static final int MAX_PENDING_ITEMS = 1000;
    
    private final SharedPreferences prefs;
    private final List<DataEntry> pendingData = new ArrayList<>();
    
    public record DataEntry(String deviceId, String serviceUUID, String characteristicUUID, byte[] value, long timestamp) {}
    
    public BleBackgroundDataManager(Context context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        loadPendingData();
    }
    
    public synchronized void addData(String deviceId, String serviceUUID, String characteristicUUID, byte[] value) {
        if (pendingData.size() >= MAX_PENDING_ITEMS) {
            pendingData.remove(0);
        }
        pendingData.add(new DataEntry(deviceId, serviceUUID, characteristicUUID, value.clone(), System.currentTimeMillis()));
        persistData();
    }
    
    public synchronized WritableArray getPendingDataAsArray() {
        WritableArray arr = Arguments.createArray();
        for (DataEntry entry : pendingData) {
            WritableMap map = Arguments.createMap();
            map.putString("deviceId", entry.deviceId);
            map.putString("serviceUUID", entry.serviceUUID);
            map.putString("characteristicUUID", entry.characteristicUUID);
            map.putString("value", Base64.getEncoder().encodeToString(entry.value));
            map.putDouble("timestamp", entry.timestamp);
            arr.pushMap(map);
        }
        return arr;
    }
    
    public synchronized int getPendingCount() {
        return pendingData.size();
    }
    
    public synchronized void clearPendingData() {
        pendingData.clear();
        prefs.edit().remove(KEY_PENDING_DATA).apply();
    }
    
    private void persistData() {
        try {
            JSONArray arr = new JSONArray();
            for (DataEntry entry : pendingData) {
                JSONObject obj = new JSONObject();
                obj.put("deviceId", entry.deviceId);
                obj.put("serviceUUID", entry.serviceUUID);
                obj.put("characteristicUUID", entry.characteristicUUID);
                obj.put("value", Base64.getEncoder().encodeToString(entry.value));
                obj.put("timestamp", entry.timestamp);
                arr.put(obj);
            }
            prefs.edit().putString(KEY_PENDING_DATA, arr.toString()).apply();
        } catch (Exception ignored) {}
    }
    
    private void loadPendingData() {
        try {
            String json = prefs.getString(KEY_PENDING_DATA, "[]");
            JSONArray arr = new JSONArray(json);
            pendingData.clear();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                pendingData.add(new DataEntry(
                    obj.getString("deviceId"),
                    obj.getString("serviceUUID"),
                    obj.getString("characteristicUUID"),
                    Base64.getDecoder().decode(obj.getString("value")),
                    obj.getLong("timestamp")
                ));
            }
        } catch (Exception ignored) {
            pendingData.clear();
        }
    }
}
