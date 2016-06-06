package org.konradkrakowiak.blereactnative;

import android.support.annotation.Nullable;
import android.util.Base64;
import android.util.Log;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.polidea.rxandroidble.RxBleClient;
import com.polidea.rxandroidble.RxBleConnection;
import com.polidea.rxandroidble.RxBleDevice;
import com.polidea.rxandroidble.RxBleScanResult;
import java.util.HashMap;
import java.util.UUID;
import org.konradkrakowiak.blereactnative.converter.ConverterManager;
import rx.Subscription;

public class BleModule extends ReactContextBaseJavaModule {

    private static final String NAME = "BleModule";

    private static final String TAG = BleModule.class.getSimpleName();

    private final ErrorConverter errorConverter = new ErrorConverter();

    private final ConverterManager converterManager = new ConverterManager();

    private RxBleClient rxBleClient;

    private Subscription scanSubscription;

    private HashMap<String, RxBleDevice> bleDeviceHashMap;

    private HashMap<String, Subscription> connectionSubscriptionMap;

    private HashMap<String, Subscription> readCharacteristicSubscriptionMap;

    private HashMap<String, Subscription> writeCharacteristicSubscriptionMap;

    private HashMap<String, Subscription> setupNotificationCharacteristicSubscriptionMap;

    private HashMap<String, RxBleConnection> connectionMap;


    public BleModule(ReactApplicationContext reactContext) {
        super(reactContext);
        bleDeviceHashMap = new HashMap<>();
        connectionSubscriptionMap = new HashMap<>();
        connectionMap = new HashMap<>();
        readCharacteristicSubscriptionMap = new HashMap<>();
        writeCharacteristicSubscriptionMap = new HashMap<>();
        setupNotificationCharacteristicSubscriptionMap = new HashMap<>();
    }

    @Override
    public String getName() {
        return NAME;
    }

    @ReactMethod
    public void createClient() {
        Log.d(TAG, "createClient was called");
        rxBleClient = RxBleClient.create(getReactApplicationContext());
    }

    @ReactMethod
    public void scanBleDevices(Callback errorCallback) {
        Log.d(TAG, "scanBleDevices was called");
        if (rxBleClient == null) {
            errorCallback.invoke(ErrorKey.NO_CLIENT);
        }
        scanSubscription = rxBleClient
                .scanBleDevices()
                .subscribe(
                        this::onScanBleDevicesSuccess,
                        throwable -> onScanBleDevicesFailure(throwable, errorCallback));
    }

    @ReactMethod
    public void stopScanBleDevices() {
        Log.d(TAG, "stopScanBleDevices was called");
        if (scanSubscription != null) {
            scanSubscription.unsubscribe();
            scanSubscription = null;
        }
    }

    @ReactMethod
    public void establishConnection(String deviceId, boolean autoConnect, Promise promise) {
        Log.d(TAG, "establishConnection was called");
        final RxBleDevice device = bleDeviceHashMap.get(deviceId);
        if (device == null) {
            promise.reject(new RuntimeException(ErrorKey.NO_DEVICE_FOUND));
            return;
        }
        final Subscription subscribe = device
                .establishConnection(getReactApplicationContext(), autoConnect)
                .subscribe(
                        rxBleConnection -> onEstablishConnectionSuccessSuccess(deviceId, rxBleConnection, promise),
                        throwable -> onEstablishConnectionSuccessFailure(throwable, promise)
                );
        connectionSubscriptionMap.put(deviceId, subscribe);
    }

    @ReactMethod
    public void closeConnection(String deviceId, Callback errorCallback) {
        Log.d(TAG, "closeConnection was called");
        final Subscription connectionSubscription = connectionSubscriptionMap.get(deviceId);
        if (connectionSubscription != null) {
            connectionSubscription.unsubscribe();
            connectionSubscriptionMap.remove(deviceId);
            Log.d(TAG, "Connection was closed for " + deviceId);
        }
    }

    @ReactMethod
    public void readCharacteristic(String deviceId, String serviceUUID, String characteristicUUID, Promise promise) {
        Log.d(TAG, "readCharacteristic was called");
        final RxBleConnection rxBleConnection = connectionMap.get(deviceId);
        if (rxBleConnection == null) {
            promise.reject(EventKey.SCAN_RESULT, "");
            return;
        }
        final Subscription subscription = rxBleConnection
                .readCharacteristic(UUID.fromString(characteristicUUID))
                .subscribe(
                        bytes -> onReadCharacteristicSuccess(bytes, promise),
                        throwable -> onReadCharacteristicFailure(throwable, promise));
        readCharacteristicSubscriptionMap.put(deviceId, subscription);
    }


    @ReactMethod
    public void cancelReadCharacteristic(String deviceId) {
        Log.d(TAG, "cancelReadCharacteristic was called");
        final Subscription subscription = readCharacteristicSubscriptionMap.get(deviceId);
        if (subscription == null || !subscription.isUnsubscribed()) {
            Log.d(TAG, "Read characteristic is missing for device : " + deviceId);
            return;
        }
        Log.d(TAG, "Read characteristic was canceled for device : " + deviceId);
        subscription.unsubscribe();
        readCharacteristicSubscriptionMap.remove(deviceId);
    }

    @ReactMethod
    public void writeCharacteristic(String deviceId, String serviceUUID, String characteristicUUID, String valueBase64, Promise promise) {
        Log.d(TAG, "writeCharacteristic was called");
        final RxBleConnection rxBleConnection = connectionMap.get(deviceId);
        if (rxBleConnection == null) {
            promise.reject(EventKey.SCAN_RESULT, "");
            return;
        }
        final Subscription subscription = rxBleConnection
                .writeCharacteristic(UUID.fromString(characteristicUUID), Base64.decode(valueBase64, Base64.DEFAULT))
                .subscribe(
                        bytes -> onWriteCharacteristicSuccess(bytes, promise),
                        throwable -> onWriteCharacteristicFailure(throwable, promise));
        writeCharacteristicSubscriptionMap.put(deviceId, subscription);
    }

    @ReactMethod
    public void cancelWriteCharacteristic(String deviceId) {
        Log.d(TAG, "cancelWriteCharacteristic was called");
        final Subscription subscription = writeCharacteristicSubscriptionMap.get(deviceId);
        if (subscription == null || !subscription.isUnsubscribed()) {
            Log.d(TAG, "Write characteristic is missing for device : " + deviceId);
            return;
        }
        Log.d(TAG, "Write characteristic was canceled for device : " + deviceId);
        subscription.unsubscribe();
        writeCharacteristicSubscriptionMap.remove(deviceId);
    }

    @ReactMethod
    public void setupNotification(String deviceId, String serviceUUID, String characteristicUUID, Callback errorCallback) {
        Log.d(TAG, "setUpNotification was called");
        final RxBleConnection rxBleConnection = connectionMap.get(deviceId);
        if (rxBleConnection == null) {
            errorCallback.invoke(ErrorKey.NO_CONNECTION);
            return;
        }
        final Subscription subscription = rxBleConnection
                .setupNotification(UUID.fromString(characteristicUUID))
                .flatMap(observable -> observable)
                .subscribe(
                        this::onSetupNotificationSuccess,
                        throwable -> onSetupNotificationFailure(throwable, errorCallback));
        setupNotificationCharacteristicSubscriptionMap.put(deviceId, subscription);
    }


    @ReactMethod
    public void cancelNotificationCharacteristic(String deviceId) {
        Log.d(TAG, "cancelNotificationCharacteristic was called");
        final Subscription subscription = setupNotificationCharacteristicSubscriptionMap.get(deviceId);
        if (subscription == null || !subscription.isUnsubscribed()) {
            Log.d(TAG, "Notification characteristic is missing for device : " + deviceId);
            return;
        }
        Log.d(TAG, "Notification characteristic was canceled for device : " + deviceId);
        subscription.unsubscribe();
        setupNotificationCharacteristicSubscriptionMap.remove(deviceId);
    }


    // Support for scanBleDevices(...)

    private void onScanBleDevicesSuccess(RxBleScanResult rxBleScanResult) {
        final RxBleDevice bleDevice = rxBleScanResult.getBleDevice();
        bleDeviceHashMap.put(bleDevice.getMacAddress(), bleDevice);
        Log.d(TAG, "onScanBleDevicesSuccess: " + rxBleScanResult.toString());
        sendEvent(EventKey.SCAN_RESULT, converterManager.convert(rxBleScanResult));

    }

    private void onScanBleDevicesFailure(Throwable throwable, Callback errorCallback) {
        final String error = errorConverter.convert(throwable);
        Log.e(TAG, "onScanBleDevicesFailure: ", throwable);
        errorCallback.invoke(error);
    }

    //Support for establishConnection(...)

    private void onEstablishConnectionSuccessSuccess(String deviceId, RxBleConnection rxBleConnection, Promise promise) {
        connectionMap.put(deviceId, rxBleConnection);
        promise.resolve(true);
        Log.d(TAG, "Establish connection success for : " + deviceId);

    }

    private void onEstablishConnectionSuccessFailure(Throwable throwable, Promise errorCallback) {
        final String error = errorConverter.convert(throwable);
        Log.e(TAG, "onEstablishConnectionSuccessFailure: ", throwable);
        errorCallback.reject(error, error);
    }

    //Support for readCharacteristic(...)

    private void onReadCharacteristicSuccess(byte[] data, Promise promise) {
        final String value = Base64.encodeToString(data, Base64.DEFAULT);
        promise.resolve(value);
        Log.d(TAG, "Read characteristic with : " + value);

    }

    private void onReadCharacteristicFailure(Throwable throwable, Promise errorCallback) {
        final String error = errorConverter.convert(throwable);
        Log.e(TAG, "onReadCharacteristicFailure: ", throwable);
        errorCallback.reject(error, error);
    }

    //Support for writeCharacteristic(...)

    private void onWriteCharacteristicSuccess(byte[] data, Promise promise) {
        final String value = Base64.encodeToString(data, Base64.DEFAULT);
        promise.resolve(value);
        Log.d(TAG, "Write characteristic success with : " + value);

    }

    private void onWriteCharacteristicFailure(Throwable throwable, Promise promise) {
        final String error = errorConverter.convert(throwable);
        Log.e(TAG, "onWriteCharacteristicFailure: ", throwable);
        promise.reject(error, error);
    }

    //Support for setupNotification(...)


    private void onSetupNotificationSuccess(byte[] bytes) {
        WritableMap writableMap = Arguments.createMap();
        writableMap.putString("DATA", Base64.encodeToString(bytes, Base64.DEFAULT));
        sendEvent(EventKey.ON_NOTIFICATION_GET, writableMap);
    }

    private void onSetupNotificationFailure(Throwable throwable, Callback errorCallback) {
        final String error = errorConverter.convert(throwable);
        Log.e(TAG, "onSetupNotificationFailure: ", throwable);
        errorCallback.invoke(error);
    }

    //Common support method

    private void sendEvent(String eventName, @Nullable WritableMap params) {
        getReactApplicationContext()
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
    }
}
