package com.bleplx.service;

import android.app.Notification;
import android.app.Service;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Binder;
import android.os.IBinder;
import androidx.annotation.Nullable;
import com.bleplx.adapter.BleModule;
import com.bleplx.adapter.utils.Constants;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.polidea.rxandroidble2.RxBleClient;
import com.polidea.rxandroidble2.RxBleConnection;
import com.polidea.rxandroidble2.RxBleDevice;
import android.util.Base64;
import android.util.Log;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;
import java.util.HashMap;
import android.content.SharedPreferences;
import android.app.AlarmManager;
import android.app.PendingIntent;
import io.reactivex.disposables.CompositeDisposable;
import io.reactivex.disposables.Disposable;
import java.util.Arrays;
import java.util.List;

public class BleConnectionForegroundService extends Service {
    private static final String ACTION_START = "com.bleplx.ACTION_START_DATA";
    private static final String ACTION_STOP = "com.bleplx.ACTION_STOP_DATA";
    private static final String ACTION_CONNECT = "com.bleplx.ACTION_CONNECT";
    private static final String EXTRA_TITLE = "title";
    private static final String EXTRA_CONTENT = "content";
    private static final String EXTRA_DEVICE_ID = "deviceId";
    private static final String EXTRA_SERVICE_UUID = "serviceUUID";
    private static final String EXTRA_CHARACTERISTIC_UUID = "characteristicUUID";

    private BleScanNotificationHelper notificationHelper;
    private BleBackgroundDataManager dataManager;
    private RxBleClient rxBleClient;
    private ReactContext reactContext;
    private final ConcurrentHashMap<String, CompositeDisposable> deviceDisposables = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, RxBleConnection> activeConnections = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, ConnectionConfig> connectionConfigs = new ConcurrentHashMap<>();
    private final IBinder binder = new LocalBinder();
    private volatile boolean isRunning;
    private static final String PREFS_NAME = "BleConnectionPrefs";
    private static final String KEY_PENDING_CONNECTIONS = "pending_connections";
    private String pendingTitle = "BLE Connection";
    private String pendingContent = "Maintaining BLE connection";

    private static class ConnectionConfig {
        private final String serviceUuid;
        private final String characteristicUuid;

        ConnectionConfig(String serviceUuid, String characteristicUuid) {
            this.serviceUuid = serviceUuid;
            this.characteristicUuid = characteristicUuid;
        }
    }

    public class LocalBinder extends Binder {
        public BleConnectionForegroundService getService() { return BleConnectionForegroundService.this; }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        notificationHelper = new BleScanNotificationHelper(this);
        dataManager = new BleBackgroundDataManager(this);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) { stopSelf(); return START_NOT_STICKY; }
        String action = intent.getAction();

        if (ACTION_STOP.equals(action)) {
            disconnectAll();
            stopForeground(STOP_FOREGROUND_REMOVE);
            stopSelf();
            return START_NOT_STICKY;
        }

        if (ACTION_START.equals(action)) {
            Log.d("BlePlx", "BleConnectionForegroundService start foreground");
            ensureRxBleClientInitialized();
            String title = intent.getStringExtra(EXTRA_TITLE);
            String content = intent.getStringExtra(EXTRA_CONTENT);
            pendingTitle = title != null ? title : "BLE Connection";
            pendingContent = content != null ? content : "Maintaining BLE connection";
            Notification notification = notificationHelper.buildNotification(
                pendingTitle,
                pendingContent
            );
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(notificationHelper.getNotificationId() + 1, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE);
            } else {
                startForeground(notificationHelper.getNotificationId() + 1, notification);
            }
            isRunning = true;
            if (intent.getBooleanExtra("restore_connections", false)) {
                restoreConnectionState();
            }
        }

        if (ACTION_CONNECT.equals(action)) {
            String deviceId = intent.getStringExtra(EXTRA_DEVICE_ID);
            String serviceUUID = intent.getStringExtra(EXTRA_SERVICE_UUID);
            String characteristicUUID = intent.getStringExtra(EXTRA_CHARACTERISTIC_UUID);
            if (deviceId != null && serviceUUID != null && characteristicUUID != null) {
                Log.d("BlePlx", "BleConnectionForegroundService connect deviceId=" + deviceId + ", service=" + serviceUUID + ", characteristic=" + characteristicUUID);
                ensureRxBleClientInitialized();
                connectAndMonitor(deviceId, UUID.fromString(serviceUUID), UUID.fromString(characteristicUUID));
            }
        }

        return START_REDELIVER_INTENT;  // Re-deliver intent if service is killed
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        Log.d("BlePlx", "BleConnectionForegroundService onTaskRemoved - restarting service");
        // Save current connection state for restoration
        saveConnectionState();

        // Schedule restart using AlarmManager for reliability
        if (isRunning && !deviceDisposables.isEmpty()) {
            Intent restartIntent = new Intent(getApplicationContext(), BleConnectionForegroundService.class);
            restartIntent.setAction(ACTION_START);
            restartIntent.putExtra(EXTRA_TITLE, pendingTitle);
            restartIntent.putExtra(EXTRA_CONTENT, pendingContent);
            restartIntent.putExtra("restore_connections", true);

            PendingIntent pendingServiceIntent = PendingIntent.getService(
                getApplicationContext(),
                1,
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

    public void initialize(RxBleClient client, ReactContext context) {
        this.rxBleClient = client;
        this.reactContext = context;
    }

    private void ensureRxBleClientInitialized() {
        if (rxBleClient == null) {
            rxBleClient = RxBleClient.create(getApplicationContext());
        }
    }

    private void connectAndMonitor(String deviceId, UUID serviceUUID, UUID characteristicUUID) {
        if (rxBleClient == null) return;
        if (deviceDisposables.containsKey(deviceId)) return;

        connectionConfigs.put(deviceId, new ConnectionConfig(serviceUUID.toString(), characteristicUUID.toString()));
        RxBleDevice device = rxBleClient.getBleDevice(deviceId);
        CompositeDisposable disposables = new CompositeDisposable();
        deviceDisposables.put(deviceId, disposables);

        Disposable connectionDisposable = device.establishConnection(true)
            .flatMap(connection -> {
                activeConnections.put(deviceId, connection);
                emitConnectionState(deviceId, "connected");
                return connection.discoverServices()
                    .flatMapObservable(services -> connection.setupNotification(characteristicUUID))
                    .flatMap(notificationObservable -> notificationObservable);
            })
            .subscribe(
                bytes -> handleCharacteristicData(deviceId, serviceUUID.toString(), characteristicUUID.toString(), bytes),
                error -> {
                    emitConnectionState(deviceId, "disconnected");
                    activeConnections.remove(deviceId);
                    deviceDisposables.remove(deviceId);
                    connectionConfigs.remove(deviceId);
                }
            );
        disposables.add(connectionDisposable);
    }

    private void handleCharacteristicData(String deviceId, String serviceUUID, String characteristicUUID, byte[] value) {
        byte[] dataCopy = value.clone();
        dataManager.addData(deviceId, serviceUUID, characteristicUUID, dataCopy);

        WritableMap params = Arguments.createMap();
        params.putString("deviceId", deviceId);
        params.putString("serviceUUID", serviceUUID);
        params.putString("characteristicUUID", characteristicUUID);
        params.putString("value", Base64.encodeToString(dataCopy, Base64.NO_WRAP));
        params.putDouble("timestamp", System.currentTimeMillis());
        sendEvent("BlePlxBackgroundData", params);
    }

    private void emitConnectionState(String deviceId, String state) {
        WritableMap params = Arguments.createMap();
        params.putString("deviceId", deviceId);
        params.putString("state", state);
        sendEvent("BlePlxBackgroundConnectionState", params);
    }

    private void sendEvent(String eventName, WritableMap params) {
        if (reactContext != null && reactContext.hasActiveReactInstance()) {
            reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).emit(eventName, params);
        }
    }

    public void disconnectDevice(String deviceId) {
        CompositeDisposable disposables = deviceDisposables.remove(deviceId);
        if (disposables != null) disposables.dispose();
        activeConnections.remove(deviceId);
        connectionConfigs.remove(deviceId);
    }

    private void disconnectAll() {
        for (String deviceId : deviceDisposables.keySet()) {
            disconnectDevice(deviceId);
        }
        isRunning = false;
        // Clear saved connections when explicitly disconnecting
        getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit().remove(KEY_PENDING_CONNECTIONS).apply();
    }

    /**
     * Save connection state for restoration after app closure.
     * Uses a snapshot to ensure thread-safe iteration over the ConcurrentHashMap.
     */
    private void saveConnectionState() {
        // Create a snapshot of the current connections for thread-safe iteration
        Map<String, ConnectionConfig> snapshot = new HashMap<>(connectionConfigs);

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, ConnectionConfig> entry : snapshot.entrySet()) {
            if (sb.length() > 0) sb.append(";");
            ConnectionConfig config = entry.getValue();
            sb.append(entry.getKey())
                .append("|")
                .append(config.serviceUuid)
                .append("|")
                .append(config.characteristicUuid);
        }
        prefs.edit().putString(KEY_PENDING_CONNECTIONS, sb.toString()).apply();
        Log.d("BlePlx", "Saved connection state: " + sb.toString());
    }

    /**
     * Restore connections after service restart.
     * Handles malformed data gracefully with try-catch for UUID parsing.
     */
    private void restoreConnectionState() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String saved = prefs.getString(KEY_PENDING_CONNECTIONS, "");
        if (saved == null || saved.isEmpty()) {
            return;
        }

        Log.d("BlePlx", "Restoring connection state: " + saved);
        // Use String.split for simplicity - filter out empty entries
        String[] entries = saved.split(";");
        for (String entry : entries) {
            if (entry == null || entry.isEmpty()) continue;

            String[] parts = entry.split("\\|");
            if (parts.length != 3) {
                Log.w("BlePlx", "Skipping malformed connection entry: " + entry);
                continue;
            }

            String deviceId = parts[0];
            String serviceUuid = parts[1];
            String characteristicUuid = parts[2];

            try {
                connectAndMonitor(
                    deviceId,
                    UUID.fromString(serviceUuid),
                    UUID.fromString(characteristicUuid)
                );
            } catch (IllegalArgumentException e) {
                Log.e("BlePlx", "Invalid UUID in saved connection state: " + entry, e);
            }
        }
    }

    public BleBackgroundDataManager getDataManager() { return dataManager; }
    public boolean isRunning() { return isRunning; }
    public boolean isDeviceConnected(String deviceId) { return activeConnections.containsKey(deviceId); }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) { return binder; }

    @Override
    public void onDestroy() {
        disconnectAll();
        super.onDestroy();
    }

    public static Intent createStartIntent(Context ctx, String title, String content) {
        Intent intent = new Intent(ctx, BleConnectionForegroundService.class);
        intent.setAction(ACTION_START);
        intent.putExtra(EXTRA_TITLE, title);
        intent.putExtra(EXTRA_CONTENT, content);
        return intent;
    }

    public static Intent createConnectIntent(Context ctx, String deviceId, String serviceUUID, String characteristicUUID) {
        Intent intent = new Intent(ctx, BleConnectionForegroundService.class);
        intent.setAction(ACTION_CONNECT);
        intent.putExtra(EXTRA_DEVICE_ID, deviceId);
        intent.putExtra(EXTRA_SERVICE_UUID, serviceUUID);
        intent.putExtra(EXTRA_CHARACTERISTIC_UUID, characteristicUUID);
        return intent;
    }

    public static Intent createStopIntent(Context ctx) {
        Intent intent = new Intent(ctx, BleConnectionForegroundService.class);
        intent.setAction(ACTION_STOP);
        return intent;
    }
}
