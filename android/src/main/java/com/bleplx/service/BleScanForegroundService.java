package com.bleplx.service;

import android.app.Notification;
import android.app.Service;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Binder;
import android.os.IBinder;
import android.util.Log;

import androidx.annotation.Nullable;

import com.bleplx.adapter.BleModule;
import com.bleplx.adapter.OnEventCallback;
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
    private boolean ownsBleModule;
    
    // Store scan parameters for restart
    private String pendingTitle = "Scanning";
    private String pendingContent = "Bluetooth scanning active";
    private String[] pendingUuids;
    private int pendingScanMode;
    private int pendingCallbackType;
    private boolean pendingLegacyScan;

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
            ensureBleModuleInitialized();
            // Handle null extras with defaults
            String title = intent.getStringExtra(EXTRA_TITLE);
            String content = intent.getStringExtra(EXTRA_CONTENT);
            pendingTitle = title != null ? title : "Scanning";
            pendingContent = content != null ? content : "Bluetooth scanning active";
            pendingUuids = intent.getStringArrayExtra(EXTRA_FILTERED_UUIDS);
            pendingScanMode = intent.getIntExtra(EXTRA_SCAN_MODE, 0);
            pendingCallbackType = intent.getIntExtra(EXTRA_CALLBACK_TYPE, 1);
            pendingLegacyScan = intent.getBooleanExtra(EXTRA_LEGACY_SCAN, true);

            Notification notification = notificationHelper.buildNotification(pendingTitle, pendingContent);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(notificationHelper.getNotificationId(), notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE);
            } else {
                startForeground(notificationHelper.getNotificationId(), notification);
            }
            startScanning(pendingUuids, pendingScanMode, pendingCallbackType, pendingLegacyScan);
        }

        return START_REDELIVER_INTENT;  // Re-deliver intent if service is killed
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        Log.d("BlePlx", "BleScanForegroundService onTaskRemoved - restarting service");
        // Schedule restart using AlarmManager for reliability
        if (isScanning) {
            Intent restartIntent = createStartIntent(
                getApplicationContext(),
                pendingTitle,
                pendingContent,
                pendingUuids,
                pendingScanMode,
                pendingCallbackType,
                pendingLegacyScan
            );

            PendingIntent pendingServiceIntent = PendingIntent.getService(
                getApplicationContext(),
                2,
                restartIntent,
                PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE
            );

            AlarmManager alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            if (alarmManager != null) {
                long triggerTime = System.currentTimeMillis() + 1000;
                // Android 12+ (API 31): Check if exact alarms are allowed
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    if (alarmManager.canScheduleExactAlarms()) {
                        alarmManager.setExactAndAllowWhileIdle(
                            AlarmManager.RTC_WAKEUP,
                            triggerTime,
                            pendingServiceIntent
                        );
                    } else {
                        // Fall back to inexact alarm if exact alarms not permitted
                        Log.w("BlePlx", "Exact alarms not permitted, using inexact alarm");
                        alarmManager.setAndAllowWhileIdle(
                            AlarmManager.RTC_WAKEUP,
                            triggerTime,
                            pendingServiceIntent
                        );
                    }
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    // Android 6.0+ (API 23): Use setExactAndAllowWhileIdle for Doze mode
                    alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        triggerTime,
                        pendingServiceIntent
                    );
                } else {
                    // Pre-Android 6.0: Use set
                    alarmManager.set(
                        AlarmManager.RTC_WAKEUP,
                        triggerTime,
                        pendingServiceIntent
                    );
                }
            }
        }
        super.onTaskRemoved(rootIntent);
    }

    public void initialize(BleModule module, ReactContext context) {
        this.bleModule = module;
        this.reactContext = context;
        this.ownsBleModule = false;
    }

    private void ensureBleModuleInitialized() {
        if (bleModule != null) return;
        BleModule module = new BleModule(getApplicationContext());
        module.createClient(null, new OnEventCallback<String>() {
            @Override
            public void onEvent(String data) {}
        }, new OnEventCallback<Integer>() {
            @Override
            public void onEvent(Integer data) {}
        });
        bleModule = module;
        ownsBleModule = true;
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
        if (ownsBleModule && bleModule != null) {
            bleModule.destroyClient();
        }
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
