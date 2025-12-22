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
import io.reactivex.disposables.CompositeDisposable;
import io.reactivex.disposables.Disposable;

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
    private final IBinder binder = new LocalBinder();
    private volatile boolean isRunning;

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
            Notification notification = notificationHelper.buildNotification(
                intent.getStringExtra(EXTRA_TITLE),
                intent.getStringExtra(EXTRA_CONTENT)
            );
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(notificationHelper.getNotificationId() + 1, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE);
            } else {
                startForeground(notificationHelper.getNotificationId() + 1, notification);
            }
            isRunning = true;
        }

        if (ACTION_CONNECT.equals(action)) {
            String deviceId = intent.getStringExtra(EXTRA_DEVICE_ID);
            String serviceUUID = intent.getStringExtra(EXTRA_SERVICE_UUID);
            String characteristicUUID = intent.getStringExtra(EXTRA_CHARACTERISTIC_UUID);
            if (deviceId != null && serviceUUID != null && characteristicUUID != null) {
                Log.d("BlePlx", "BleConnectionForegroundService connect deviceId=" + deviceId + ", service=" + serviceUUID + ", characteristic=" + characteristicUUID);
                connectAndMonitor(deviceId, UUID.fromString(serviceUUID), UUID.fromString(characteristicUUID));
            }
        }

        return START_STICKY;
    }

    public void initialize(RxBleClient client, ReactContext context) {
        this.rxBleClient = client;
        this.reactContext = context;
    }

    private void connectAndMonitor(String deviceId, UUID serviceUUID, UUID characteristicUUID) {
        if (rxBleClient == null) return;
        if (deviceDisposables.containsKey(deviceId)) return;

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
    }

    private void disconnectAll() {
        for (String deviceId : deviceDisposables.keySet()) {
            disconnectDevice(deviceId);
        }
        isRunning = false;
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
