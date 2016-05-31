package com.emptyproject;

import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattService;
import android.support.annotation.Nullable;
import android.util.Base64;
import android.util.Log;
import com.emptyproject.converter.RxBleConnectionStateConverter;
import com.emptyproject.converter.RxBleDeviceServicesConverter;
import com.emptyproject.converter.RxBleScanResultConverter;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.polidea.rxandroidble.RxBleClient;
import com.polidea.rxandroidble.RxBleConnection;
import com.polidea.rxandroidble.RxBleDevice;
import com.polidea.rxandroidble.RxBleDeviceServices;
import com.polidea.rxandroidble.RxBleScanResult;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import rx.Subscription;

public class RxBleReactContextBaseJavaModule extends ReactContextBaseJavaModule {

    private static final String TAG = RxBleReactContextBaseJavaModule.class.getSimpleName();

    interface Metadata {

    }

    RxBleScanResultConverter rxBleScanResultConverter;

    RxBleConnectionStateConverter rxBleConnectionStateConverter;

    RxBleDeviceServicesConverter rxBleDeviceServicesConverter;

    RxBleClient rxBleClient;

    Subscription scanBleDevicesSubscription;

    //TODO maps are not the best solution!!!

    Map<String, RxBleDevice> deviceMap;

    Map<String, RxBleConnection> connectionMap;

    Map<String, RxBleDeviceServices> deviceServicesMap;

    Map<String, Subscription> establishConnectionSubscriptionMap;

    Map<String, Subscription> establishDeviceServicesSubscriptionMap;


    public RxBleReactContextBaseJavaModule(ReactApplicationContext reactContext) {
        super(reactContext);
        rxBleScanResultConverter = new RxBleScanResultConverter();
        rxBleConnectionStateConverter = new RxBleConnectionStateConverter();
        rxBleDeviceServicesConverter = new RxBleDeviceServicesConverter();
        deviceMap = new HashMap<>();
        deviceServicesMap = new HashMap<>();
        establishConnectionSubscriptionMap = new HashMap<>();
        establishDeviceServicesSubscriptionMap = new HashMap<>();
        connectionMap = new HashMap<>();
    }

    @Override
    public String getName() {
        return "RxBleClient";
    }

    @ReactMethod
    public void createContext(Callback success) {
        rxBleClient = RxBleClient.create(getReactApplicationContext());
        success.invoke(true);
    }

    @ReactMethod
    public void scanBleDevices() {
        scanBleDevicesSubscription = rxBleClient.scanBleDevices().subscribe(
                this::sendEventOnScanBleDevice,
                throwable -> {

                }
        );
    }

    private void sendEventOnScanBleDevice(RxBleScanResult rxBleScanResult) {
        final WritableMap params = rxBleScanResultConverter.convert(rxBleScanResult);
        final RxBleDevice bleDevice = rxBleScanResult.getBleDevice();
        deviceMap.put(bleDevice.getMacAddress(), bleDevice);
        sendEvent(getReactApplicationContext(), "BLE_SCAN_RESULT", params);
    }

    @ReactMethod
    public void establishConnection(String mac, boolean autoConnect, Promise promise) {
        final RxBleDevice rxBleDevice = deviceMap.get(mac);
        if (rxBleDevice == null) {
            promise.reject(new RuntimeException()); // Todo Create NoFoundDeviceException or sth like that.
            return;
        }

        final Subscription oldSubscription = establishConnectionSubscriptionMap.get(mac);
        if (oldSubscription != null && !oldSubscription.isUnsubscribed()) {
            return;
        }
        final RxBleConnection connection = connectionMap.get(mac);
        if (!rxBleDevice.getConnectionState().equals(RxBleConnection.RxBleConnectionState.CONNECTED) && connection != null) {
            promise.resolve(mac);
            return;
        }

        final Subscription subscription = rxBleDevice
                .establishConnection(getReactApplicationContext(), autoConnect)
                .subscribe(
                        rxBleConnection -> onEstablishConnectionSuccess(mac, rxBleConnection, promise),
                        throwable -> onEstablishConnectionFailure(mac, throwable, promise),
                        () -> Log.d(TAG, "establishConnection onComplete for " + mac));
        establishConnectionSubscriptionMap.put(mac, subscription);
    }

    private void onEstablishConnectionSuccess(String mac, RxBleConnection rxBleConnection, Promise promise) {
        connectionMap.put(mac, rxBleConnection);
        promise.resolve(mac);
    }


    private void onEstablishConnectionFailure(String mac, Throwable throwable, Promise promise) {
        final Subscription establishConnectionSubscription = establishConnectionSubscriptionMap.get(mac);
        if (establishConnectionSubscription != null) {
            establishConnectionSubscription.unsubscribe();
            establishConnectionSubscriptionMap.remove(mac);
        }
        connectionMap.remove(mac);
        promise.reject(throwable);
    }

    @ReactMethod
    public void discoverServices(String mac, Promise promise) {
        final RxBleConnection rxBleConnection = connectionMap.get(mac);
        if (rxBleConnection == null) {
            promise.reject(new RuntimeException()); // Todo Create NoFoundConnectionException or sth like that.
            return;
        }
        final Subscription subscribe = rxBleConnection.discoverServices()
                .subscribe(
                        rxBleDeviceServices -> onDiscoverDeviceServicesSuccess(mac, rxBleDeviceServices, promise));
        establishDeviceServicesSubscriptionMap.put(mac, subscribe);
    }

    private void onDiscoverDeviceServicesSuccess(String mac, RxBleDeviceServices rxBleDeviceServices, Promise promise) {
        deviceServicesMap.put(mac, rxBleDeviceServices);
        promise.resolve(rxBleDeviceServicesConverter.convert(rxBleDeviceServices));
    }

    @ReactMethod
    public void getService(String mac, String uuid, Promise promise) {
        final RxBleDeviceServices rxBleDeviceServices = deviceServicesMap.get(mac);
        if (rxBleDeviceServices == null) {
            promise.reject(new RuntimeException("NoSuchServiceException for " + mac)); // TODO Create NoSuchServiceException
            return;
        }

        final Subscription subscribe = rxBleDeviceServices
                .getService(UUID.fromString(uuid))
                .subscribe(bluetoothGattService -> onGetServiceSuccess(bluetoothGattService, promise),
                        throwable -> onGetCharacteristicFailure(throwable, promise));
    }

    private void onGetServiceSuccess(BluetoothGattService  bluetoothGattService, Promise promise) {
        Log.d(TAG, "Characteristic is read");
        promise.resolve(bluetoothGattService.getUuid().toString());
    }

    private void onGetServiceFailure(Throwable throwable, Promise promise) {
        Log.d(TAG, "Characteristic reading is failure");
        promise.reject(throwable);
    }

    @ReactMethod
    public void getCharacteristic(String mac, String uuid, Promise promise) {
        final RxBleDeviceServices rxBleDeviceServices = deviceServicesMap.get(mac);
        if (rxBleDeviceServices == null) {
            promise.reject(new RuntimeException("NoSuchServiceException for " + mac)); // TODO Create NoSuchServiceException
            return;
        }

        final Subscription subscribe = rxBleDeviceServices
                .getCharacteristic(UUID.fromString(uuid))
                .subscribe(bluetoothGattCharacteristic -> onGetCharacteristicSuccess(bluetoothGattCharacteristic, promise),
                        throwable -> onGetCharacteristicFailure(throwable, promise));
    }

    private void onGetCharacteristicSuccess(BluetoothGattCharacteristic bluetoothGattCharacteristic, Promise promise) {
        Log.d(TAG, "Characteristic is read");
        promise.resolve(bluetoothGattCharacteristic.getUuid().toString());
    }

    private void onGetCharacteristicFailure(Throwable throwable, Promise promise) {
        Log.d(TAG, "Characteristic reading is failure");
        promise.reject(throwable);
    }

    @ReactMethod
    public void readCharacteristic(String mac, String uuid, Promise promise) {
        final RxBleConnection rxBleConnection = connectionMap.get(mac);
        if (rxBleConnection == null) {
            promise.reject(new RuntimeException("NoSuchConnection for " + mac)); // TODO Create NoSuchConnection
            return;
        }
        final Subscription subscribe = rxBleConnection.readCharacteristic(UUID.fromString(uuid))
                .subscribe(bytes -> onReadCharacteristicSuccess(promise, bytes));
    }

    private void onReadCharacteristicSuccess(Promise promise, byte[] bytes) {
        promise.resolve(Base64.encodeToString(bytes, Base64.DEFAULT));
        Log.d(TAG, "onReadCharacteristicSuccess: " + Arrays.toString(bytes));
    }

    @ReactMethod
    public void stopScanDevice() {
        if (scanBleDevicesSubscription == null) {
            return;
        }
        scanBleDevicesSubscription.unsubscribe();
    }

    private void sendEvent(ReactContext reactContext, String eventName, @Nullable WritableMap params) {
        reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
    }
}
