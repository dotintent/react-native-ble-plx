package com.bleplx.service;

import android.app.Notification;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Binder;
import android.os.IBinder;

import androidx.annotation.Nullable;

import com.bleplx.adapter.BleModule;
import com.bleplx.adapter.ScanResult;
import com.bleplx.adapter.errors.BleError;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class BleScanForegroundService extends Service {

    private static final String ACTION_START = "com.bleplx.ACTION_START_SCAN";
    private static final String ACTION_STOP = "com.bleplx.ACTION_STOP_SCAN";
    private static final String EXTRA_TITLE = "title";
    private static final String EXTRA_CONTENT = "content";
    private static final String EXTRA_SCAN_MODE = "scanMode";
    private static final String EXTRA_CALLBACK_TYPE = "callbackType";
    private static final String EXTRA_LEGACY_SCAN = "legacyScan";
    private static final String EXTRA_FILTERED_UUIDS = "uuids";

    private BleScanNotificationHelper notificationHelper;
    private BleModule bleModule;
    private ReactContext reactContext;
    private final IBinder binder = new LocalBinder();
    private volatile boolean isScanning;

    public class LocalBinder extends Binder {
        public BleScanForegroundService getService() { return BleScanForegroundService.this; }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        notificationHelper = new BleScanNotificationHelper(this);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        String action = intent.getAction();
        if (ACTION_STOP.equals(action)) {
            stopScanning();
            stopForeground(STOP_FOREGROUND_REMOVE);
            stopSelf();
            return START_NOT_STICKY;
        }

        if (ACTION_START.equals(action)) {
            Notification notification = notificationHelper.buildNotification(
                intent.getStringExtra(EXTRA_TITLE),
                intent.getStringExtra(EXTRA_CONTENT)
            );
            startForeground(notificationHelper.getNotificationId(), notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE);
            startScanning(
                intent.getStringArrayExtra(EXTRA_FILTERED_UUIDS),
                intent.getIntExtra(EXTRA_SCAN_MODE, 0),
                intent.getIntExtra(EXTRA_CALLBACK_TYPE, 1),
                intent.getBooleanExtra(EXTRA_LEGACY_SCAN, true)
            );
        }

        return START_STICKY;
    }

    public void initialize(BleModule module, ReactContext context) {
        this.bleModule = module;
        this.reactContext = context;
    }

    private void startScanning(String[] uuids, int scanMode, int callbackType, boolean legacyScan) {
        if (bleModule == null || isScanning) return;
        isScanning = true;
        bleModule.startDeviceScan(uuids, scanMode, callbackType, legacyScan, this::emitScanResult, this::emitScanError);
    }

    private void stopScanning() {
        if (bleModule != null && isScanning) {
            bleModule.stopDeviceScan();
            isScanning = false;
        }
    }

    private void emitScanResult(ScanResult data) {
        if (reactContext == null || data == null) return;
        WritableMap params = Arguments.createMap();
        params.putString("deviceId", data.getDeviceId());
        params.putString("name", data.getDeviceName());
        params.putInt("rssi", data.getRssi());
        sendEvent("BlePlxBackgroundScanResult", params);
    }

    private void emitScanError(BleError error) {
        if (reactContext == null || error == null) return;
        WritableMap params = Arguments.createMap();
        params.putInt("errorCode", error.errorCode.code);
        params.putString("message", error.reason);
        sendEvent("BlePlxBackgroundScanError", params);
    }

    private void sendEvent(String eventName, WritableMap params) {
        if (reactContext != null && reactContext.hasActiveReactInstance()) {
            reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).emit(eventName, params);
        }
    }

    public boolean isScanning() { return isScanning; }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) { return binder; }

    @Override
    public void onDestroy() {
        stopScanning();
        super.onDestroy();
    }

    public static Intent createStartIntent(Context ctx, String title, String content, String[] uuids, int scanMode, int callbackType, boolean legacyScan) {
        Intent intent = new Intent(ctx, BleScanForegroundService.class);
        intent.setAction(ACTION_START);
        intent.putExtra(EXTRA_TITLE, title);
        intent.putExtra(EXTRA_CONTENT, content);
        intent.putExtra(EXTRA_FILTERED_UUIDS, uuids);
        intent.putExtra(EXTRA_SCAN_MODE, scanMode);
        intent.putExtra(EXTRA_CALLBACK_TYPE, callbackType);
        intent.putExtra(EXTRA_LEGACY_SCAN, legacyScan);
        return intent;
    }

    public static Intent createStopIntent(Context ctx) {
        Intent intent = new Intent(ctx, BleScanForegroundService.class);
        intent.setAction(ACTION_STOP);
        return intent;
    }
}
